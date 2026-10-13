import { tokenize } from './tokenization.ts';
import type { Tokenizer } from './tokenization.ts';
import { idToToken, oneHot, tokenToId, validateVocabulary } from './vocabulary.ts';
import type { Vocabulary } from './vocabulary.ts';
import { tensorShape } from '../tensorMath.ts';
import { dimension, embeddingLookup, positionalEncoding, addRepresentations } from './representation.ts';
export function runPipeline(text: string, tokenizer: Tokenizer, vocabulary: Vocabulary, embedding: number[][]) {
  validateVocabulary(vocabulary);
  const [size, dim] = tensorShape(embedding); dimension(dim);
  if (size !== vocabulary.tokens.length) throw new RangeError('Embedding 行数与词表大小不匹配。');
  const tokens = tokenize(text, tokenizer);
  const mappings = tokens.map((token, position) => {
    const id = tokenToId(vocabulary, token.text);
    return { position, token: token.text, id, resolvedToken: idToToken(vocabulary, id), unknown: id === 1 && token.text !== '[UNK]' };
  });
  const ids = mappings.map(item => item.id), hot = ids.map(id => oneHot(id, size));
  const vectors = embeddingLookup(embedding, ids), pe = positionalEncoding(ids.length, dim);
  const input = addRepresentations(vectors, pe, dim);
  return { text, tokenizer, tokens, mappings, ids, hot, vectors, pe, input, shapes: { oneHot: [ids.length, size], embedding: [size, dim], sentence: [ids.length, dim] } };
}
export type PipelineResult = ReturnType<typeof runPipeline>;
export function exportPipeline(result: PipelineResult) {
  return { schemaVersion: 1, kind: 'transformer-input', tokenizer: result.tokenizer, tokens: result.tokens.map(token => token.text), ids: [...result.ids], shape: [...result.shapes.sentence], values: result.input.map(row => [...row]), embeddingScale: 1, positionStart: 0, note: '教学或随机未训练向量；未应用原论文 sqrt(d_model) 缩放。' };
}
