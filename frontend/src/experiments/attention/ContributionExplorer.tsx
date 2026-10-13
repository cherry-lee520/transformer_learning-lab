import { MathFormula } from '../../components/lesson/MathFormula';
import { contribution } from '../../services/attention/math';
import type { AttentionResult } from '../../services/attention/math';
import { AttentionMatrix } from './AttentionMatrix';
import { AttentionHeatmap, AttentionLinks } from '../../visualizations/attention/AttentionHeatmap';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
export function ContributionExplorer({ result, tokens, query, selectedKey, onSelect }: { result: AttentionResult; tokens: string[]; query: number; selectedKey: number; onSelect: (query: number, key: number) => void }) {
  const detail = contribution(result,query), score = result.scores[query][selectedKey], scaled = result.scaledScores[query][selectedKey], soft = result.softmax[query];
  return <section><h2>D · Self-Attention 与 Value 贡献</h2><p className="lr-lead">横轴是 Key，纵轴是 Query。选一格查看来源；选一行观察该位置如何混合所有 Value。</p><label className="lr-field">选择 Query Token<select aria-label="选择 Query Token" value={query} onChange={event => onSelect(Number(event.target.value),selectedKey)}>{tokens.map((token,i) => <option key={i} value={i}>{i} · {token}</option>)}</select></label>
    <div className="lr-two-columns"><AttentionHeatmap weights={result.weights} tokens={tokens} query={query} selectedKey={selectedKey} onSelect={onSelect}/><div className="lr-step-card"><h3>Weights[{query},{selectedKey}]</h3><p>Q[{query}] · K[{selectedKey}] = {fmt(score)}；缩放后 = {fmt(scaled)}</p><p>{result.mask[query][selectedKey] ? '可见位置' : '被 Causal Mask 排除'}；行最大值 m = {fmt(soft.maximum)}</p><p>exp(s − m) = {fmt(soft.exponentials[selectedKey])}；该行指数和 = {fmt(soft.denominator)}</p><p className="lr-result" data-testid="heatmap-detail">权重 = {fmt(result.weights[query][selectedKey])}</p><p>该行概率和 = {fmt(result.weights[query].reduce((a,b)=>a+b,0))}</p></div></div>
    <AttentionLinks weights={result.weights[query]} tokens={tokens} query={query}/><MathFormula latex="O_i=\sum_j A_{ij}V_j" display/>
    <AttentionMatrix title="当前 Query 权重" values={[result.weights[query]]}/><AttentionMatrix title="Value V" values={result.v} row={selectedKey}/>
    <AttentionMatrix title="逐项 Weight × Value 贡献" values={detail.terms} row={selectedKey} labels={tokens.map((token,j) => 'Weight['+query+','+j+'] × '+token)}/><AttentionMatrix title="贡献求和 Output[i]" values={[detail.sum]}/>
    <details open><summary>展开选中 Key {selectedKey} 的每个维度贡献</summary><p>{fmt(result.weights[query][selectedKey])} × [{result.v[selectedKey].map(fmt).join(', ')}] = [{detail.terms[selectedKey].map(fmt).join(', ')}]</p><div className="lr-scroll" tabIndex={0} aria-label="选中 Value 的逐元素乘法"><table aria-label="选中 Value 的逐元素乘法"><thead><tr><th>维度</th><th>Weight</th><th>Value</th><th>贡献</th></tr></thead><tbody>{result.v[selectedKey].map((value,j)=><tr key={j}><th>{j}</th><td>{fmt(result.weights[query][selectedKey])}</td><td>{fmt(value)}</td><td>{fmt(detail.terms[selectedKey][j])}</td></tr>)}</tbody></table></div></details>
    <p className="lr-note">注意力权重能显示这一层的信息混合。教学/随机参数没有学会词义或句法；权重也不等同于完整模型解释。</p>
  </section>;
}
