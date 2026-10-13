import { formatMathNumber } from '../../services/mathDisplay';
export function MatrixView({ title, values, columns, rowLabels, selectedRow }: { title: string; values: readonly (readonly number[])[]; columns: number; rowLabels?: readonly string[]; selectedRow?: number }) {
  return <figure className="lr-matrix"><figcaption>{title}<span>{values.length} × {columns} · number[][]</span></figcaption><div className="lr-scroll" tabIndex={0} aria-label={title + '，可横向滚动'}>
    {values.length ? <table aria-label={title}><thead><tr><th scope="col">行 / 维度</th>{Array.from({ length: columns }, (_, i) => <th scope="col" key={i}>{i}</th>)}</tr></thead><tbody>{values.map((row, i) => <tr key={i} className={selectedRow === i ? 'lr-selected' : undefined}><th scope="row">{rowLabels?.[i] ?? i}</th>{row.map((value, j) => <td key={j} data-row={i} data-column={j} data-value={value}>{formatMathNumber(value)}</td>)}</tr>)}</tbody></table> : <p className="lr-empty">空序列：0 × {columns}，没有虚构的填充行。</p>}
  </div></figure>;
}
