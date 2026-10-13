import { finite } from '../tensorMath.ts';
export function compareVectors(a: readonly number[], b: readonly number[]) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 1 || a.length > 16 || a.length !== b.length) throw new RangeError('向量须等长，长度为 1～16。');
  a.forEach(finite); b.forEach(finite);
  const products = a.map((value, i) => finite(value * b[i]));
  const differences = a.map((value, i) => finite(value - b[i]));
  const dot = products.reduce((sum, value) => finite(sum + value), 0);
  const normA = finite(Math.hypot(...a)), normB = finite(Math.hypot(...b));
  // Normalize each component first, avoiding normA * normB overflow.
  const cosine = normA === 0 || normB === 0 ? null : Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + (value / normA) * (b[i] / normB), 0)));
  return { products, differences, squaredDifferences: differences.map(value => finite(value * value)), dot, cosine, distance: finite(Math.hypot(...differences)), normA, normB };
}
