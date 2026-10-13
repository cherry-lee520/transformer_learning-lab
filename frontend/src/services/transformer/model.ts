import { tensorShape, matrixProduct } from '../tensorMath.ts';
import { initializeMulti, integer, scaleMatrix, transpose, rowSoftmax } from '../attention/math.ts';
import { createEmbedding, embeddingLookup, positionalEncoding } from '../language/representation.ts';
import { tokenize } from '../language/tokenization.ts';
import { createVocabulary, validateVocabulary, tokenToId } from '../language/vocabulary.ts';
import type { Vocabulary } from '../language/vocabulary.ts';
import { addMatrices, exactShape, vector, encoderBlock, decoderBlock } from './math.ts';
import type { Matrix, FFNParameters, NormParameters, EncoderParameters, DecoderParameters } from './math.ts';
export interface TransformerConfig { dModel: number; heads: number; dFF: number; encoderLayers: number; decoderLayers: number; epsilon: number; seed: number }
export interface TransformerParameters { embedding: Matrix; encoders: EncoderParameters[]; decoders: DecoderParameters[] }
export const DEFAULT_CONFIG: TransformerConfig = { dModel: 8, heads: 2, dFF: 16, encoderLayers: 1, decoderLayers: 1, epsilon: 1e-5, seed: 42 };
export const DEFAULT_VOCABULARY = createVocabulary(['I', 'love', 'AI', '我', '爱', '人工智能', '.', 'you', '学习', '机器', '好', 'hello']);
export const SEQUENCE_LIMIT = 12;
export function validateConfig(config: TransformerConfig): void {
  if (![4, 8, 16].includes(config.dModel) || ![1, 2, 4].includes(config.heads) || config.dModel % config.heads || ![8, 16, 32, 64].includes(config.dFF)) throw new RangeError('模型维度、Heads 或 d_ff 不合法。');
  integer(config.encoderLayers, 1, 3, 'Encoder 层数'); integer(config.decoderLayers, 1, 3, 'Decoder 层数'); integer(config.seed, 0, 0xffffffff, '种子');
  if (!Number.isFinite(config.epsilon) || config.epsilon <= 0 || config.epsilon > 1) throw new RangeError('epsilon 应为 (0,1] 的有限数。');
}
export function initializeTransformer(config: TransformerConfig, size: number): TransformerParameters {
  validateConfig(config); integer(size, 4, 32, '教学词表大小');
  let state = config.seed;
  const nextSeed = () => state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  const matrix = (rows: number, columns: number): Matrix => {
    const bound = Math.sqrt(6 / (rows + columns));
    return Array.from({ length: rows }, () => Array.from({ length: columns }, () => (nextSeed() / 0x100000000 * 2 - 1) * bound));
  };
  const norm = (): NormParameters => ({ gamma: Array(config.dModel).fill(1), beta: Array(config.dModel).fill(0) });
  const ffn = (): FFNParameters => ({ w1: matrix(config.dModel, config.dFF), b1: Array(config.dFF).fill(0), w2: matrix(config.dFF, config.dModel), b2: Array(config.dModel).fill(0) });
  const encoder = (): EncoderParameters => ({ self: initializeMulti(config.dModel, config.heads, nextSeed()), ffn: ffn(), norm1: norm(), norm2: norm() });
  // T07 generator, scaled at initialization to bounded E; lookup scaling remains explicit below.
  const embedding = scaleMatrix(createEmbedding(size, config.dModel, nextSeed()), 1 / Math.sqrt(config.dModel));
  const encoders = Array.from({ length: config.encoderLayers }, encoder);
  const decoders = Array.from({ length: config.decoderLayers }, (): DecoderParameters => ({ ...encoder(), cross: initializeMulti(config.dModel, config.heads, nextSeed()), norm3: norm() }));
  return { embedding, encoders, decoders };
}
export function validateParameters(p: TransformerParameters, config: TransformerConfig, size: number): void {
  validateConfig(config); integer(size, 4, 32, '词表大小'); exactShape(p.embedding, size, config.dModel, '共享 E');
  if (!Array.isArray(p.encoders) || !Array.isArray(p.decoders) || p.encoders.length !== config.encoderLayers || p.decoders.length !== config.decoderLayers) throw new RangeError('参数层数不匹配。');
  const multi = (value: EncoderParameters['self']) => {
    if (!Array.isArray(value.heads) || value.heads.length !== config.heads) throw new RangeError('参数 Head 数量不匹配。');
    for (const head of value.heads) for (const matrix of [head.wq, head.wk, head.wv]) exactShape(matrix, config.dModel, config.dModel / config.heads, 'Head 投影');
    exactShape(value.wo, config.dModel, config.dModel, 'WO');
  };
  const norm = (value: NormParameters) => { vector(value.gamma, config.dModel, 'gamma'); vector(value.beta, config.dModel, 'beta'); };
  const block = (value: EncoderParameters) => {
    multi(value.self); norm(value.norm1); norm(value.norm2);
    exactShape(value.ffn.w1, config.dModel, config.dFF, 'W1'); exactShape(value.ffn.w2, config.dFF, config.dModel, 'W2');
    vector(value.ffn.b1, config.dFF, 'b1'); vector(value.ffn.b2, config.dModel, 'b2');
  };
  for (const value of p.encoders) block(value);
  for (const value of p.decoders) { block(value); multi(value.cross); norm(value.norm3); }
}
export function tokenizeInput(text: string, vocabulary: Vocabulary) {
  validateVocabulary(vocabulary); integer(vocabulary.tokens.length, 4, 32, '词表大小');
  const pieces = tokenize(text, 'whitespace'); integer(pieces.length, 1, SEQUENCE_LIMIT, '输入长度');
  const tokens = pieces.map(piece => piece.text), ids = tokens.map(token => tokenToId(vocabulary, token));
  if (ids.includes(0)) throw new RangeError('本实验未实现 Padding Mask，请移除 [PAD]。');
  return { text, tokens, ids, resolved: ids.map(id => vocabulary.tokens[id]) };
}
export function embedInput(embedding: Matrix, ids: number[], dim: number) {
  integer(ids.length, 1, SEQUENCE_LIMIT, '序列长度');
  const vectors = embeddingLookup(embedding, ids);
  const scaled = scaleMatrix(vectors, Math.sqrt(dim)), pe = positionalEncoding(ids.length, dim);
  return { ids: [...ids], vectors, scaled, pe, output: addMatrices(scaled, pe) };
}
export function outputProjection(output: Matrix, embedding: Matrix) {
  const projection = transpose(embedding), logits = matrixProduct(output, projection);
  const probabilities = logits.map(row => rowSoftmax(row));
  return { projection, logits, probabilities };
}
export function forwardTransformer(config: TransformerConfig, p: TransformerParameters, sourceIds: number[], targetIds: number[]) {
  validateParameters(p, config, p.embedding.length);
  if (sourceIds.includes(0) || targetIds.includes(0)) throw new RangeError('不支持 PAD，无 Padding Mask。');
  const source = embedInput(p.embedding, sourceIds, config.dModel), target = embedInput(p.embedding, targetIds, config.dModel);
  const encoders: ReturnType<typeof encoderBlock>[] = [];
  let memory = source.output;
  for (const parameters of p.encoders) { const result = encoderBlock(memory, parameters, config.epsilon); encoders.push(result); memory = result.output; }
  const decoders: ReturnType<typeof decoderBlock>[] = [];
  let output = target.output;
  for (const parameters of p.decoders) { const result = decoderBlock(output, memory, parameters, config.epsilon); decoders.push(result); output = result.output; }
  return { source, target, encoders, memory, decoders, output, ...outputProjection(output, p.embedding) };
}
export type TransformerResult = ReturnType<typeof forwardTransformer>;
export function topTokens(probabilities: number[], vocabulary: Vocabulary, count: number) {
  validateVocabulary(vocabulary); vector(probabilities, vocabulary.tokens.length, '概率'); integer(count, 1, vocabulary.tokens.length, 'Top-K');
  if (probabilities.some(n => n < 0 || n > 1)) throw new RangeError('概率超出范围。');
  return probabilities.map((probability, id) => ({ id, token: vocabulary.tokens[id], probability })).sort((a, b) => b.probability - a.probability || a.id - b.id).slice(0, count);
}
export interface ParameterMatrix { id: string; label: string; values: Matrix; path: (string | number)[]; vector: boolean }
export function parameterMatrices(p: TransformerParameters): ParameterMatrix[] {
  const result: ParameterMatrix[] = [{ id: 'embedding', label: '共享 Embedding E', values: p.embedding, path: ['embedding'], vector: false }];
  const add = (label: string, path: (string | number)[], values: Matrix | number[], isVector = false) => result.push({ id: path.join('.'), label, path, values: isVector ? [values as number[]] : values as Matrix, vector: isVector });
  const layers = (blocks: EncoderParameters[] | DecoderParameters[], group: 'encoders' | 'decoders') => blocks.forEach((block, layer) => {
    const prefix = (group === 'encoders' ? 'Encoder ' : 'Decoder ') + (layer + 1);
    const attentions: ('self' | 'cross')[] = group === 'decoders' ? ['self', 'cross'] : ['self'];
    for (const type of attentions) {
      const multi = type === 'self' ? block.self : (block as DecoderParameters).cross;
      multi.heads.forEach((head, h) => { for (const name of ['wq', 'wk', 'wv'] as const) add(prefix + ' ' + type + ' Head ' + (h + 1) + ' ' + name.toUpperCase(), [group, layer, type, 'heads', h, name], head[name]); });
      add(prefix + ' ' + type + ' WO', [group, layer, type, 'wo'], multi.wo);
    }
    for (const name of ['w1', 'b1', 'w2', 'b2'] as const) add(prefix + ' FFN ' + name.toUpperCase(), [group, layer, 'ffn', name], block.ffn[name], name.startsWith('b'));
    for (const name of (group === 'decoders' ? ['norm1', 'norm2', 'norm3'] : ['norm1', 'norm2']) as ('norm1' | 'norm2' | 'norm3')[]) {
      const norm = name === 'norm3' ? (block as DecoderParameters).norm3 : block[name];
      for (const key of ['gamma', 'beta'] as const) add(prefix + ' ' + name + ' ' + key, [group, layer, name, key], norm[key], true);
    }
  });
  layers(p.encoders, 'encoders'); layers(p.decoders, 'decoders'); return result;
}
/** Immutable, shape-preserving edit. All shared output weights derive from E after the edit. */
export function updateParameter(p: TransformerParameters, id: string, values: Matrix): TransformerParameters {
  const descriptor = parameterMatrices(p).find(item => item.id === id);
  if (!descriptor) throw new RangeError('未知参数。');
  const [rows, cols] = tensorShape(descriptor.values); exactShape(values, rows, cols, descriptor.label);
  const next: TransformerParameters = structuredClone(p);
  let target: unknown = next;
  for (const key of descriptor.path.slice(0, -1)) target = (target as Record<string | number, unknown>)[key];
  (target as Record<string | number, unknown>)[descriptor.path.at(-1)!] = descriptor.vector ? [...values[0]] : values.map(row => [...row]);
  return next;
}
