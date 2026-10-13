export const TOKENIZERS = ['whitespace', 'character', 'subword'] as const;
export type Tokenizer = typeof TOKENIZERS[number];
export const LIMITS = { text: 256, sequence: 32, vocabulary: 64, dimension: 16 } as const;
export interface Token { text: string; start: number; end: number }
/** UTF-16 offsets are only used to slice the original string, never as character counts. */
export function graphemes(text: string): Token[] {
  if (typeof text !== 'string' || Array.from(text).length > LIMITS.text) throw new RangeError('文本最多 256 个 Unicode 码点。');
  const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), part => ({ text: part.segment, start: part.index, end: part.index + part.segment.length }));
}
export const SUBWORDS = ['learning', 'learn', 'ing', 'Transform', 'transform', 'ers', 'er', 'love', '喜欢', '学习', '机器', '语言', '我'] as const;
export function tokenize(text: string, mode: Tokenizer): Token[] {
  const characters = graphemes(text);
  if (!TOKENIZERS.includes(mode)) throw new RangeError('未知分词模式。');
  let tokens: Token[];
  if (mode === 'whitespace') tokens = Array.from(text.matchAll(/\S+/gu), match => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
  else if (mode === 'character') tokens = characters.filter(part => !/^\s+$/u.test(part.text));
  else {
    tokens = [];
    for (let cursor = 0; cursor < characters.length;) {
      const part = characters[cursor];
      if (/^\s+$/u.test(part.text)) { cursor++; continue; }
      // Fixed longest match, case-sensitive; fallback is one whole grapheme.
      const ends = new Set(characters.slice(cursor).map(item => item.end));
      const piece = [...SUBWORDS].sort((a, b) => b.length - a.length).find(item => text.startsWith(item, part.start) && ends.has(part.start + item.length));
      const end = piece ? part.start + piece.length : part.end;
      tokens.push({ text: text.slice(part.start, end), start: part.start, end });
      while (cursor < characters.length && characters[cursor].end <= end) cursor++;
    }
  }
  if (tokens.length > LIMITS.sequence) throw new RangeError('当前模式产生超过 32 个 Token；请缩短文本或更换分词模式，不会静默截断。');
  return tokens;
}
