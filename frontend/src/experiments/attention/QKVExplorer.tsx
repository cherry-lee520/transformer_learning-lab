import { useState } from 'react';
import { MathFormula } from '../../components/lesson/MathFormula';
import { productElement } from '../../services/attention/math';
import type { Matrix, ProjectionWeights, AttentionResult } from '../../services/attention/math';
import { AttentionMatrix, MatrixEditor } from './AttentionMatrix';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
export function QKVExplorer({ x, parameters, result, onWeights, onDraft }: { x: Matrix; parameters: ProjectionWeights; result: AttentionResult; onWeights: (key: keyof ProjectionWeights, next: Matrix) => void; onDraft: () => void }) {
  const [selection, select] = useState<{ kind: 'q'|'k'|'v'; row: number; col: number }>({kind:'q',row:0,col:0});
  const kind = selection.kind, row = Math.min(selection.row,x.length-1), col = Math.min(selection.col,result[kind][0].length-1), key = ('w'+kind) as keyof ProjectionWeights, detail = productElement(x, parameters[key], row, col);
  return <section><h2>A · Q、K、V 从哪里来？</h2><p className="lr-lead">同一个 X 乘三套独立参数，得到匹配用的 Query/Key 和聚合用的 Value。权重是模型训练会学习的参数，这里仅做教学计算。</p><MathFormula latex="Q=XW_Q,\quad K=XW_K,\quad V=XW_V" display/>
    <div className="at-grid">{(['wq','wk','wv'] as const).map(key => <details key={key} open><summary>{key.toUpperCase()} · 展开编辑权重</summary><MatrixEditor title={key.toUpperCase()} values={parameters[key]} onChange={next => onWeights(key,next)} onDraft={onDraft}/></details>)}</div>
    <p className="lr-note">点击 Q/K/V 任意元素，追踪 X 的一行与对应 W 的一列。类比为“我要找什么 / 可匹配什么 / 提供什么”，不代表模型有人为固定的语法或语义标签。</p>
    <div className="at-grid">{(['q','k','v'] as const).map(key => <AttentionMatrix key={key} title={key.toUpperCase()} values={result[key]} row={selection.kind === key ? row : undefined} column={selection.kind === key ? col : undefined} onSelect={(row,col) => select({kind:key,row,col})}/>)}</div>
    <div className="lr-step-card" aria-label="投影元素计算"><h3>{kind.toUpperCase()}[{row},{col}] 的真实计算</h3><div className="lr-two-columns"><AttentionMatrix title="参与计算的 X 行" values={x} row={row}/><AttentionMatrix title={'参与计算的 '+key.toUpperCase()+' 列'} values={parameters[key]} column={col}/></div><p data-testid="projection-detail">{detail.left.map((value,j) => fmt(value)+' × '+fmt(detail.right[j])).join(' + ')} = <strong>{fmt(detail.value)}</strong></p><AttentionMatrix title="逐项乘积" values={[detail.products]}/></div>
  </section>;
}
