import { LIMITS } from './tokenization.ts';
export const SPECIAL_TOKENS = ['[PAD]', '[UNK]', '[BOS]', '[EOS]'] as const;
export const DEFAULT_WORDS = ['I', 'love', 'learning', 'Transformers', '.', 'learn', 'ing', 'Transform', 'ers', '我', '喜欢', '学习', '机器', '语言', '，', '。', '!', '你', '好', 'l', 'o', 'v', 'e', 'a', 'r', 'n', 'i', 'g', 'T', 's', 'm', 'f'];
export interface Vocabulary { tokens: string[] }
export function createVocabulary(words: readonly string[]): Vocabulary {
  if (!Array.isArray(words) || words.length > LIMITS.vocabulary - SPECIAL_TOKENS.length) throw new RangeError('自定义词表最多 60 项。');
  const tokens: string[] = [...SPECIAL_TOKENS];
  for (const word of words) {
    if (typeof word !== 'string' || !word.trim() || word !== word.trim() || /\s/u.test(word) || Array.from(word).length > 64) throw new RangeError('每项须为不含空白的非空 Token，最多 64 个码点。');
    if (tokens.includes(word)) throw new RangeError('词表存在重复 Token：' + word);
    tokens.push(word);
  }
  return { tokens };
}
export function validateVocabulary(vocabulary: Vocabulary): void {
  if (!vocabulary || !Array.isArray(vocabulary.tokens) || SPECIAL_TOKENS.some((token, i) => vocabulary.tokens[i] !== token) || vocabulary.tokens.length < 4) throw new RangeError('词表须保留四个固定特殊 Token。');
  createVocabulary(vocabulary.tokens.slice(4));
}
export function tokenToId(vocabulary: Vocabulary, token: string): number {
  validateVocabulary(vocabulary);
  if (typeof token !== 'string') throw new RangeError('Token 必须为字符串。');
  const id = vocabulary.tokens.indexOf(token); return id < 0 ? 1 : id;
}
export function idToToken(vocabulary: Vocabulary, id: number): string {
  validateVocabulary(vocabulary);
  if (!Number.isSafeInteger(id) || id < 0 || id >= vocabulary.tokens.length) throw new RangeError('Token ID 不在当前词表中。');
  return vocabulary.tokens[id];
}
export function oneHot(id: number, size: number): number[] {
  if (!Number.isSafeInteger(size) || size < 1 || size > LIMITS.vocabulary || !Number.isSafeInteger(id) || id < 0 || id >= size) throw new RangeError('One-Hot 的 ID 或词表大小无效。');
  return Array.from({ length: size }, (_, index) => index === id ? 1 : 0);
}
