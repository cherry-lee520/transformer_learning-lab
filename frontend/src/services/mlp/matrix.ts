import type { Matrix, Vector } from './types.ts';
import { finite, matrixProduct } from '../tensorMath.ts';
export { finite } from '../tensorMath.ts';
export function vectorShape(vector: readonly number[]): number {
  if (!Array.isArray(vector) || vector.length < 1 || vector.length > 8) throw new RangeError('向量长度应为 1～8。');
  vector.forEach(finite); return vector.length;
}
export function matrixShape(matrix: readonly (readonly number[])[]): [number, number] {
  if (!Array.isArray(matrix) || matrix.length < 1 || matrix.length > 8) throw new RangeError('矩阵行数应为 1～8。');
  const columns = vectorShape(matrix[0]);
  if (!matrix.every(row => vectorShape(row) === columns)) throw new RangeError('矩阵必须为规则二维数组。');
  return [matrix.length, columns];
}
export function matVec(matrix: Matrix, vector: Vector): Vector {
  const [rows, columns] = matrixShape(matrix);
  if (vectorShape(vector) !== columns) throw new RangeError('矩阵与列向量维度不匹配。');
  return Array.from({ length: rows }, (_, row) => matrix[row].reduce((sum, weight, column) => finite(sum + finite(weight * vector[column])), 0));
}
export function transpose(matrix: Matrix): Matrix {
  const [rows, columns] = matrixShape(matrix);
  return Array.from({ length: columns }, (_, column) => Array.from({ length: rows }, (_, row) => matrix[row][column]));
}
export function matMul(a: Matrix, b: Matrix): Matrix {
  matrixShape(a); matrixShape(b);
  return matrixProduct(a, b);
}
export function outer(a: Vector, b: Vector): Matrix {
  vectorShape(a); vectorShape(b);
  return a.map(value => b.map(other => finite(value * other)));
}

