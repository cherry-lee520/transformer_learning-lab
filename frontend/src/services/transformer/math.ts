import { finite, tensorShape, matrixProduct } from '../tensorMath.ts';
import { activate } from '../neuronMath.ts';
import { attentionShape, integer, transpose, scaleMatrix, softmaxDetails, applyMask, concatHeads, multiHead } from '../attention/math.ts';
import type { Matrix, MultiParameters, AttentionResult } from '../attention/math.ts';
export type { Matrix, MultiParameters };
export interface FFNParameters { w1: Matrix; b1: number[]; w2: Matrix; b2: number[] }
export interface NormParameters { gamma: number[]; beta: number[] }
export function exactShape(matrix: Matrix, rows: number, columns: number, name: string): void {
  const shape = tensorShape(matrix);
  if (shape[0] !== rows || shape[1] !== columns) throw new RangeError(name + ' 应为 ' + rows + '×' + columns + '。');
}
export function vector(values: number[], length: number, name: string): void {
  if (!Array.isArray(values) || values.length !== length) throw new RangeError(name + ' 长度不匹配。');
  for (const value of values) finite(value);
}
export function addMatrices(a: Matrix, b: Matrix): Matrix {
  const [rows, columns] = tensorShape(a); exactShape(b, rows, columns, '相加矩阵');
  return a.map((row, i) => row.map((n, j) => finite(n + b[i][j])));
}
export function affine(x: Matrix, weights: Matrix, bias: number[]): Matrix {
  const output = matrixProduct(x, weights); vector(bias, output[0].length, '偏置');
  return output.map(row => row.map((n, j) => finite(n + bias[j])));
}
export function feedForward(x: Matrix, p: FFNParameters) {
  const [, model] = tensorShape(x), [rows, hidden] = tensorShape(p.w1);
  if (rows !== model) throw new RangeError('FFN W1 输入维度不匹配。');
  exactShape(p.w2, hidden, model, 'FFN W2');
  const linear1 = affine(x, p.w1, p.b1);
  const activated = linear1.map(row => row.map(n => finite(activate(n, 'relu')!)));
  const output = affine(activated, p.w2, p.b2);
  return { input: x, linear1, activated, output, parameters: p };
}
export function layerNorm(x: Matrix, p: NormParameters, epsilon = 1e-5) {
  const [, columns] = tensorShape(x); vector(p.gamma, columns, 'gamma'); vector(p.beta, columns, 'beta');
  if (!Number.isFinite(epsilon) || epsilon <= 0) throw new RangeError('LayerNorm epsilon 必须为正有限数。');
  const means = x.map(row => finite(row.reduce((sum, n) => finite(sum + n), 0) / columns));
  const centered = x.map((row, i) => row.map(n => finite(n - means[i])));
  const variances = centered.map(row => finite(row.reduce((sum, n) => finite(sum + finite(n * n)), 0) / columns));
  const normalized = centered.map((row, i) => row.map(n => finite(n / Math.sqrt(variances[i] + epsilon))));
  const output = normalized.map(row => row.map((n, j) => finite(finite(n * p.gamma[j]) + p.beta[j])));
  return { input: x, means, variances, centered, normalized, output, parameters: p, epsilon };
}
export function addNorm(x: Matrix, sublayer: Matrix, p: NormParameters, epsilon = 1e-5) {
  const residual = addMatrices(x, sublayer);
  return { skip: x, sublayer, residual, ...layerNorm(residual, p, epsilon) };
}
export type NormResult = ReturnType<typeof addNorm>;
export type FFNResult = ReturnType<typeof feedForward>;
export type MultiResult = ReturnType<typeof multiHead>;
/** T09 adapter: rectangular query/key lengths, reusing T08 numerical primitives. */
export function crossAttention(q: Matrix, k: Matrix, v: Matrix): AttentionResult {
  const [, dk] = attentionShape(q), [keys, keyDim] = attentionShape(k), [values, dv] = attentionShape(v);
  if (keys !== values || dk !== keyDim) throw new RangeError('Cross-Attention Q/K 特征或 K/V 长度不匹配。');
  const kt = transpose(k), scores = matrixProduct(q, kt), factor = 1 / Math.sqrt(dk);
  const scaledScores = scaleMatrix(scores, factor), mask = scores.map(row => row.map(() => true));
  const maskedScores = applyMask(scaledScores, mask), softmax = scaledScores.map(row => softmaxDetails(row));
  const weights = softmax.map(row => row.weights), output = matrixProduct(weights, v);
  return { q, k, v, kt, scores, factor, scaledScores, mask, maskedScores, softmax, weights, output, dk, dv };
}
export function multiCross(query: Matrix, memory: Matrix, p: MultiParameters): MultiResult {
  const [, model] = attentionShape(query), [, memoryDim] = attentionShape(memory);
  integer(p.heads.length, 1, 4, 'Heads');
  if (memoryDim !== model || model % p.heads.length) throw new RangeError('Cross-Attention 模型维度/头数不匹配。');
  const dim = model / p.heads.length;
  const heads = p.heads.map(weights => {
    exactShape(weights.wq, model, dim, 'WQ'); exactShape(weights.wk, model, dim, 'WK'); exactShape(weights.wv, model, dim, 'WV');
    return crossAttention(matrixProduct(query, weights.wq), matrixProduct(memory, weights.wk), matrixProduct(memory, weights.wv));
  });
  exactShape(p.wo, model, model, 'WO');
  const concat = concatHeads(heads.map(head => head.output));
  return { heads, concat, output: matrixProduct(concat, p.wo) };
}
export interface EncoderParameters { self: MultiParameters; ffn: FFNParameters; norm1: NormParameters; norm2: NormParameters }
export interface DecoderParameters extends EncoderParameters { cross: MultiParameters; norm3: NormParameters }
export function encoderBlock(x: Matrix, p: EncoderParameters, epsilon = 1e-5) {
  const self = multiHead(x, p.self), norm1 = addNorm(x, self.output, p.norm1, epsilon);
  const ffn = feedForward(norm1.output, p.ffn), norm2 = addNorm(norm1.output, ffn.output, p.norm2, epsilon);
  return { input: x, self, norm1, ffn, norm2, output: norm2.output };
}
export function decoderBlock(x: Matrix, memory: Matrix, p: DecoderParameters, epsilon = 1e-5) {
  const self = multiHead(x, p.self, true), norm1 = addNorm(x, self.output, p.norm1, epsilon);
  const cross = multiCross(norm1.output, memory, p.cross), norm2 = addNorm(norm1.output, cross.output, p.norm2, epsilon);
  const ffn = feedForward(norm2.output, p.ffn), norm3 = addNorm(norm2.output, ffn.output, p.norm3, epsilon);
  return { input: x, memory, self, norm1, cross, norm2, ffn, norm3, output: norm3.output };
}
