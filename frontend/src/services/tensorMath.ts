/** Shared bounded row-major matrix core. Domain-specific callers keep their own limits. */
export function finite(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError('计算遇到非法值或数值溢出，参数未更新。');
  return value === 0 ? 0 : value;
}
export function tensorShape(matrix: readonly (readonly number[])[]): [number, number] {
  if (!Array.isArray(matrix) || matrix.length < 1 || matrix.length > 64 || !Array.isArray(matrix[0]) || matrix[0].length < 1 || matrix[0].length > 64) throw new RangeError('矩阵行列须为 1～64。');
  const columns = matrix[0].length;
  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== columns) throw new RangeError('矩阵必须为规则二维数组。');
    for (const value of row) finite(value);
  }
  return [matrix.length, columns];
}
export function matrixProduct(a: readonly (readonly number[])[], b: readonly (readonly number[])[]): number[][] {
  const [rows, inner] = tensorShape(a), [bRows, columns] = tensorShape(b);
  if (inner !== bRows) throw new RangeError('矩阵乘法的内部维度不匹配。');
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => a[row].reduce((sum, value, index) => finite(sum + finite(value * b[index][column])), 0)));
}
