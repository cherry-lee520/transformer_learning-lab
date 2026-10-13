import { finite, matrixProduct, tensorShape } from '../tensorMath.ts';
export type Matrix = number[][];
export interface ProjectionWeights { wq: Matrix; wk: Matrix; wv: Matrix }
export interface MultiParameters { heads: ProjectionWeights[]; wo: Matrix }
export function integer(value: number, min: number, max: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(label + ' 须为 ' + min + '～' + max + ' 的整数。');
  return value;
}
export function attentionShape(matrix: readonly (readonly number[])[], maxColumns = 16): [number, number] {
  const shape = tensorShape(matrix);
  if (shape[0] > 32 || shape[1] > maxColumns) throw new RangeError('Attention 教学矩阵尺寸超限（最多 32 行、' + maxColumns + ' 列）。');
  return shape;
}
export function transpose(matrix: Matrix): Matrix {
  const [rows, columns] = tensorShape(matrix);
  return Array.from({ length: columns }, (_, j) => Array.from({ length: rows }, (_, i) => matrix[i][j]));
}
export function scaleMatrix(matrix: Matrix, factor: number): Matrix {
  tensorShape(matrix); finite(factor);
  return matrix.map(row => row.map(value => finite(value * factor)));
}
/** true means visible. Missing/invalid entries are rejected, never treated as visible. */
export function causalMask(count: number): boolean[][] {
  integer(count, 1, 32, '序列长度');
  return Array.from({ length: count }, (_, i) => Array.from({ length: count }, (_, j) => j <= i));
}
export function softmaxDetails(scores: readonly number[], visible: readonly boolean[] = scores.map(() => true)) {
  if (!Array.isArray(scores)) throw new RangeError('Softmax 输入须为一行数值。');
  integer(scores.length, 1, 32, 'Softmax 行长度');
  if (!Array.isArray(visible) || visible.length !== scores.length) throw new RangeError('Mask 长度不匹配。');
  for (const score of scores) finite(score);
  for (const allowed of visible) if (typeof allowed !== 'boolean') throw new RangeError('Mask 必须是布尔值。');
  const allowedScores = scores.filter((_, j) => visible[j]);
  if (!allowedScores.length) throw new RangeError('该行所有位置均被 Mask，Softmax 未定义。');
  const maximum = Math.max(...allowedScores);
  // A finite extreme difference can underflow to -Infinity; exp then correctly tends to zero.
  const shifted = scores.map((value, j) => visible[j] ? value - maximum : null);
  const exponentials = shifted.map(value => value === null ? 0 : Math.exp(value));
  const denominator = finite(exponentials.reduce((sum, value) => sum + value, 0));
  const weights = exponentials.map((value, j) => visible[j] ? finite(value / denominator) : 0);
  return { maximum, shifted, exponentials, denominator, weights };
}
export function rowSoftmax(scores: readonly number[], visible?: readonly boolean[]): number[] { return softmaxDetails(scores, visible).weights; }
export function applyMask(scores: Matrix, mask: boolean[][]): (number | null)[][] {
  const [rows, columns] = attentionShape(scores, 32);
  if (!Array.isArray(mask) || mask.length !== rows) throw new RangeError('Mask 行数不匹配。');
  for (const row of mask) {
    if (!Array.isArray(row) || row.length !== columns) throw new RangeError('Mask 列数不匹配。');
    for (const allowed of row) if (typeof allowed !== 'boolean') throw new RangeError('Mask 必须是布尔值。');
  }
  return scores.map((row, i) => row.map((value, j) => mask[i][j] ? value : null));
}
export function attention(q: Matrix, k: Matrix, v: Matrix, options: { scaled?: boolean; causal?: boolean; mask?: boolean[][] } = {}) {
  const [count, dk] = attentionShape(q), [keys, keyDim] = attentionShape(k), [values, dv] = attentionShape(v);
  if (count !== keys || keys !== values || dk !== keyDim) throw new RangeError('Self-Attention 的 Q/K/V 序列长度或 Q/K 维度不匹配。');
  if (options.scaled !== undefined && typeof options.scaled !== 'boolean' || options.causal !== undefined && typeof options.causal !== 'boolean') throw new RangeError('缩放和 Causal 开关须为布尔值。');
  const kt = transpose(k), scores = matrixProduct(q, kt);
  const factor = options.scaled === false ? 1 : 1 / Math.sqrt(dk);
  const scaledScores = scaleMatrix(scores, factor);
  const causal = options.causal ? causalMask(count) : Array.from({ length: count }, () => Array<boolean>(count).fill(true));
  if (options.mask !== undefined) applyMask(scores, options.mask);
  const mask = causal.map((row, i) => row.map((allowed, j) => allowed && (options.mask?.[i][j] ?? true)));
  const maskedScores = applyMask(scaledScores, mask);
  const softmax = scaledScores.map((row, i) => softmaxDetails(row, mask[i]));
  const weights = softmax.map(row => row.weights), output = matrixProduct(weights, v);
  return { q, k, v, kt, scores, factor, scaledScores, mask, maskedScores, softmax, weights, output, dk, dv };
}
export type AttentionResult = ReturnType<typeof attention>;
export function project(x: Matrix, parameters: ProjectionWeights) {
  const [, model] = attentionShape(x), [qRows, dk] = attentionShape(parameters.wq), [kRows, kDim] = attentionShape(parameters.wk), [vRows] = attentionShape(parameters.wv);
  if (model !== qRows || model !== kRows || model !== vRows || dk !== kDim) throw new RangeError('投影权重形状不匹配：WQ/WK 应为 d_model×dk，WV 为 d_model×dv。');
  return { q: matrixProduct(x, parameters.wq), k: matrixProduct(x, parameters.wk), v: matrixProduct(x, parameters.wv) };
}
export function selfAttention(x: Matrix, parameters: ProjectionWeights, options: { scaled?: boolean; causal?: boolean } = {}) {
  const { q, k, v } = project(x, parameters); return attention(q, k, v, options);
}
export function contribution(result: AttentionResult, query: number) {
  integer(query, 0, result.weights.length - 1, 'Query 索引');
  const terms = result.weights[query].map((weight, j) => result.v[j].map(value => finite(weight * value)));
  const sum = Array.from({ length: result.dv }, (_, col) => terms.reduce((total, row) => finite(total + row[col]), 0));
  return { terms, sum };
}
export function productElement(a: Matrix, b: Matrix, row: number, column: number) {
  const [rows, inner] = tensorShape(a), [bRows, columns] = tensorShape(b);
  if (inner !== bRows) throw new RangeError('点积内部维度不匹配。');
  integer(row, 0, rows - 1, '行索引'); integer(column, 0, columns - 1, '列索引');
  const left = [...a[row]], right = b.map(values => values[column]), products = left.map((value, j) => finite(value * right[j]));
  return { left, right, products, value: products.reduce((sum, value) => finite(sum + value), 0) };
}
export function concatHeads(outputs: Matrix[]): Matrix {
  integer(outputs.length, 1, 8, 'Head 数量');
  const [rows, columns] = attentionShape(outputs[0]);
  for (const output of outputs) { const shape = attentionShape(output); if (shape[0] !== rows || shape[1] !== columns) throw new RangeError('Head 输出形状不一致。'); }
  if (columns * outputs.length > 16) throw new RangeError('Concat 总列数不能超过 16。');
  return Array.from({ length: rows }, (_, row) => outputs.flatMap(output => [...output[row]]));
}
export function multiHead(x: Matrix, parameters: MultiParameters, causal = false) {
  const [, model] = attentionShape(x);
  integer(parameters.heads.length, 1, 8, 'Head 数量');
  if (model % parameters.heads.length !== 0) throw new RangeError('d_model 必须能被 Head 数量整除。');
  const dimension = model / parameters.heads.length;
  const heads = parameters.heads.map(weights => {
    const result = selfAttention(x, weights, { causal });
    if (result.dk !== dimension || result.dv !== dimension) throw new RangeError('每头 dk=dv=d_model/head_count。');
    return result;
  });
  const concat = concatHeads(heads.map(head => head.output));
  const [rows, columns] = tensorShape(parameters.wo);
  if (rows !== model || columns !== model) throw new RangeError('WO 应为 (h×dv)×d_model。');
  return { heads, concat, output: matrixProduct(concat, parameters.wo) };
}
/** One sequential generator across independent matrices; no Math.random or shared row references. */
export function initializeProjections(model: number, dk: number, dv: number, seed: number | null = null): ProjectionWeights {
  integer(model, 1, 16, 'd_model'); integer(dk, 1, 16, 'dk'); integer(dv, 1, 16, 'dv');
  if (seed !== null) integer(seed, 0, 0xffffffff, '随机种子');
  let state = seed ?? 0;
  const matrix = (columns: number) => Array.from({ length: model }, (_, i) => Array.from({ length: columns }, (_, j) => {
    if (seed === null) return i === j ? 1 : 0;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0x100000000 * 2 - 1) / Math.sqrt(model);
  }));
  return { wq: matrix(dk), wk: matrix(dk), wv: matrix(dv) };
}
export function initializeMulti(model: number, count: number, seed: number): MultiParameters {
  integer(model, 1, 16, 'd_model'); integer(count, 1, 8, 'Head 数量'); integer(seed, 0, 0xffffffff, '随机种子');
  if (model % count !== 0) throw new RangeError('d_model 必须能被 Head 数量整除。');
  // Distinct deterministic streams for each head, with full independent allocations.
  const heads = Array.from({ length: count }, (_, i) => initializeProjections(model, model / count, model / count, (seed + Math.imul(i + 1, 2654435761)) >>> 0));
  const wo = initializeProjections(model, model, model, (seed ^ 0xa5a5a5a5) >>> 0).wq;
  return { heads, wo };
}
