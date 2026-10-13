import { useState } from 'react';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import { NumberField } from '../language/Controls';
import type { Matrix } from '../../services/attention/math';
export function AttentionMatrix({ title, values, onSelect, row, column, labels }: { title: string; values: readonly (readonly (number | null)[])[]; onSelect?: (row: number, column: number) => void; row?: number; column?: number; labels?: readonly string[] }) {
  return <figure className="lr-matrix at-matrix"><figcaption>{title}<span>{values.length} × {values[0]?.length ?? 0}</span></figcaption><div className="lr-scroll" tabIndex={0} aria-label={title + '，可滚动'}><table aria-label={title}><thead><tr><th>行 / 列</th>{values[0]?.map((_, j) => <th key={j}>{j}</th>)}</tr></thead><tbody>{values.map((values, i) => <tr key={i}><th>{labels ? i + ' · ' + labels[i] : i}</th>{values.map((value, j) => <td key={j} data-row={i} data-column={j} data-value={value === null ? 'masked' : value} className={row === i || column === j ? 'at-highlight' : undefined}>{onSelect ? <button type="button" aria-label={'选择 ' + title + '[' + i + ',' + j + ']'} onClick={() => onSelect(i, j)}>{value === null ? '−∞' : fmt(value)}</button> : value === null ? <span title="被 Mask，等价于在 Softmax 前设为负无穷">−∞</span> : fmt(value)}</td>)}</tr>)}</tbody></table></div></figure>;
}
export function MatrixEditor({ title, values, onChange, onDraft, max = 10 }: { title: string; values: Matrix; onChange: (next: Matrix) => void; onDraft?: () => void; max?: number }) {
  const [selected, setSelected] = useState<[number, number]>([0, 0]);
  const row = Math.min(selected[0], values.length - 1), col = Math.min(selected[1], values[0].length - 1);
  return <div className="at-editor"><AttentionMatrix title={title} values={values} row={row} column={col} onSelect={(i,j) => setSelected([i,j])} /><div className="lr-controls" onChangeCapture={onDraft}>
    <NumberField label={title + ' 行索引'} value={row} min={0} max={values.length - 1} onChange={i => setSelected([i,col])} />
    <NumberField label={title + ' 列索引'} value={col} min={0} max={values[0].length - 1} onChange={j => setSelected([row,j])} />
    <NumberField key={row + '-' + col} label={title + ' 元素值'} value={values[row][col]} min={-max} max={max} integer={false} onChange={value => onChange(values.map((line,i) => line.map((n,j) => i === row && j === col ? value : n)))} />
  </div><p className="lr-caption">点击元素或用行/列索引选择；编辑草稿不会污染有效计算。</p></div>;
}
