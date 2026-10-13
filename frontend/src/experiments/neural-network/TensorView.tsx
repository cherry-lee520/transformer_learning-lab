import { MathFormula } from '../../components/lesson/MathFormula';
import { latexNumber } from '../../services/mathDisplay';
import type { Matrix, Vector } from '../../services/mlp/types';
export const vectorLatex = (values: Vector) => '\\begin{bmatrix}' + values.map(latexNumber).join('\\\\') + '\\end{bmatrix}';
export const matrixLatex = (values: Matrix) => '\\begin{bmatrix}' + values.map(row => row.map(latexNumber).join('&')).join('\\\\') + '\\end{bmatrix}';
export function TensorView({ name, values, vector = false }: { name: string; values: Matrix | Vector; vector?: boolean }) {
  const rows = vector ? (values as Vector).length : (values as Matrix).length, columns = vector ? 1 : (values as Matrix)[0].length;
  return <div className="nn-tensor"><div><strong>{name}</strong><span>{rows} × {columns}</span></div><MathFormula latex={vector ? vectorLatex(values as Vector) : matrixLatex(values as Matrix)} display label={name + '，形状 ' + rows + ' 乘 ' + columns} /></div>;
}

