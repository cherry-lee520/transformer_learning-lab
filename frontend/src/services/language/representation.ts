import { finite, tensorShape, matrixProduct } from '../tensorMath.ts';
import { sampleDomain } from '../plotSampling.ts';
import { LIMITS } from './tokenization.ts';
import { oneHot } from './vocabulary.ts';
export function dimension(value: number): number {
  if (!Number.isSafeInteger(value) || value < 2 || value > LIMITS.dimension || value % 2 !== 0) throw new RangeError('d_model 须为 2～16 的正偶数。');
  return value;
}
export function createEmbedding(size: number, dim: number, seed: number | null = null): number[][] {
  dimension(dim);
  if (!Number.isSafeInteger(size) || size < 1 || size > LIMITS.vocabulary) throw new RangeError('词表大小须为 1～64。');
  if (seed !== null && (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)) throw new RangeError('种子须为 uint32 整数。');
  let state = seed ?? 0;
  return Array.from({ length: size }, (_, row) => Array.from({ length: dim }, (_, column) => {
    if (seed === null) return ((row * 3 + column * 2) % 9 - 4) / 4;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return 2 * (state / 0x100000000) - 1;
  }));
}
export function embeddingLookup(matrix: number[][], ids: readonly number[]): number[][] {
  const [rows, columns] = tensorShape(matrix); dimension(columns);
  if (!Array.isArray(ids) || ids.length > LIMITS.sequence) throw new RangeError('序列最多 32 个 ID。');
  for (const id of ids) oneHot(id, rows);
  return ids.map(id => [...matrix[id]]);
}
export function lookupEquivalence(matrix: number[][], id: number) {
  const [rows] = tensorShape(matrix), hot = oneHot(id, rows);
  const product = matrixProduct([hot], matrix)[0], lookup = embeddingLookup(matrix, [id])[0];
  return { hot, product, lookup, equal: product.every((value, i) => value === lookup[i]) };
}
export function positionalValue(position: number, column: number, dim: number): number {
  dimension(dim);
  if (!Number.isFinite(position) || position < 0 || position > LIMITS.sequence - 1 || !Number.isSafeInteger(column) || column < 0 || column >= dim) throw new RangeError('位置或维度索引越界。');
  const angle = position / Math.pow(10000, (2 * Math.floor(column / 2)) / dim);
  return column % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
}
export function positionalEncoding(length: number, dim: number): number[][] {
  dimension(dim);
  if (!Number.isSafeInteger(length) || length < 0 || length > LIMITS.sequence) throw new RangeError('序列长度须为 0～32。');
  return Array.from({ length }, (_, pos) => Array.from({ length: dim }, (_, column) => positionalValue(pos, column, dim)));
}
export function positionalCurves(length: number, column: number, dim: number) {
  if (!Number.isSafeInteger(length) || length < 1 || length > LIMITS.sequence) throw new RangeError('曲线长度须为 1～32。');
  positionalValue(0, column, dim);
  const pair = 2 * Math.floor(column / 2);
  const positions = sampleDomain(0, Math.max(1, length - 1), 129)!;
  return [pair, pair + 1].map(index => ({ column: index, points: positions.map(x => ({ x, y: positionalValue(x, index, dim) })) }));
}
export function addRepresentations(a: number[][], b: number[][], dim: number): number[][] {
  dimension(dim);
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length > LIMITS.sequence) throw new RangeError('相加矩阵形状不一致。');
  if (a.length === 0) return [];
  const shape = tensorShape(a), other = tensorShape(b);
  if (shape[1] !== dim || other[1] !== dim) throw new RangeError('相加矩阵维度与 d_model 不一致。');
  return a.map((row, i) => row.map((value, j) => finite(value + b[i][j])));
}
