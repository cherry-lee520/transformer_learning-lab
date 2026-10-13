import { attentionShape } from './math.ts';
import { dimension } from '../language/representation.ts';
import type { exportPipeline } from '../language/pipeline.ts';
export type AttentionInput = ReturnType<typeof exportPipeline>;
export const ATTENTION_INPUT_KEY = 'transformer-learning-lab.attention-input';
export const INPUT_BYTES = 65536;
export interface InputStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function validateAttentionInput(value: unknown): AttentionInput {
  if (!value || typeof value !== 'object') throw new RangeError('输入必须是版本化 Transformer 输入对象。');
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || data.kind !== 'transformer-input') throw new RangeError('不支持该输入协议版本或类型。');
  if (typeof data.tokenizer !== 'string' || !['whitespace', 'character', 'subword'].includes(data.tokenizer) || data.embeddingScale !== 1 || data.positionStart !== 0 || typeof data.note !== 'string' || data.note.length > 512) throw new RangeError('Tokenizer、缩放、位置或来源说明无效。');
  if (!Array.isArray(data.values)) throw new RangeError('缺少二维输入矩阵。');
  const matrix = data.values as number[][], [rows, columns] = attentionShape(matrix); dimension(columns);
  if (!Array.isArray(data.shape) || data.shape.length !== 2 || data.shape[0] !== rows || data.shape[1] !== columns) throw new RangeError('声明 shape 与矩阵不匹配。');
  if (!Array.isArray(data.tokens) || !Array.isArray(data.ids) || data.tokens.length !== rows || data.ids.length !== rows) throw new RangeError('Token/ID 数量与输入行数不匹配。');
  for (const token of data.tokens) if (typeof token !== 'string' || !token.trim() || [...token].length > 256) throw new RangeError('Token 必须是非空的短字符串。');
  for (const id of data.ids) if (!Number.isSafeInteger(id) || id < 0 || id > 63) throw new RangeError('词表 ID 必须是 0～63 的整数。');
  for (const row of matrix) for (const number of row) if (Math.abs(number) > 10000) throw new RangeError('输入元素绝对值不能超过 10000。');
  return { schemaVersion: 1, kind: 'transformer-input', tokenizer: String(data.tokenizer) as AttentionInput['tokenizer'], tokens: [...data.tokens] as string[], ids: [...data.ids] as number[], shape: [rows, columns], values: matrix.map(row => [...row]), embeddingScale: 1, positionStart: 0, note: data.note };
}
export function parseAttentionInput(text: string): AttentionInput {
  if (typeof text !== 'string' || text.length > INPUT_BYTES) throw new RangeError('输入 JSON 不能超过 64K 字符。');
  try { return validateAttentionInput(JSON.parse(text)); } catch (reason) { if (reason instanceof SyntaxError) throw new RangeError('输入 JSON 已损坏，无法读取。'); throw reason; }
}
export function defaultAttentionInput(model = 4): AttentionInput {
  dimension(model);
  const rows = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]];
  return { schemaVersion: 1, kind: 'transformer-input', tokenizer: 'whitespace', tokens: ['I', 'love', 'AI'], ids: [4, 5, 6], shape: [3, model], values: rows.map(row => Array.from({ length: model }, (_, j) => row[j % 4])), embeddingScale: 1, positionStart: 0, note: '手工教学输入，已作为 X；不是训练得到的词向量。' };
}
export function saveAttentionInput(storage: InputStorage, input: unknown): void {
  const data = validateAttentionInput(input), text = JSON.stringify(data);
  if (text.length > INPUT_BYTES) throw new RangeError('输入超过存储尺寸限制。');
  storage.setItem(ATTENTION_INPUT_KEY, text);
}
export function loadAttentionInput(storage: InputStorage) {
  try {
    const raw = storage.getItem(ATTENTION_INPUT_KEY);
    if (raw === null) return { input: defaultAttentionInput(), restored: false, message: '使用默认教学输入；可从 T07 传入实际矩阵。' };
    return { input: parseAttentionInput(raw), restored: true, message: '已恢复上次导入的输入矩阵；投影权重与播放步骤恢复默认。' };
  } catch (reason) { return { input: defaultAttentionInput(), restored: false, message: '已回退默认教学输入：' + (reason instanceof Error ? reason.message : '无法访问本地存储。') }; }
}
