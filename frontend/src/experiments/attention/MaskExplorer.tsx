import type { AttentionResult } from '../../services/attention/math';
import { AttentionMatrix } from './AttentionMatrix';
import { AttentionHeatmap } from '../../visualizations/attention/AttentionHeatmap';
export function MaskExplorer({ result, tokens, causal, onCausal, query, selectedKey, onSelect }: { result: AttentionResult; tokens: string[]; causal: boolean; onCausal: (value:boolean)=>void; query:number; selectedKey:number; onSelect:(i:number,j:number)=>void }) {
  return <section><h2>F · 看不见未来的 Causal Mask</h2><p className="lr-lead">切换会真正改变 Softmax 的参与项；不是仅把未来格子染灰。</p><label className="at-check"><input type="checkbox" checked={causal} onChange={event=>onCausal(event.target.checked)}/>启用 Causal Mask</label><div className="at-grid"><AttentionMatrix title="原始 Scores" values={result.scores}/><AttentionMatrix title="缩放后 Scores" values={result.scaledScores}/><AttentionMatrix title="Causal 可见矩阵" values={result.mask.map(row=>row.map(Number))}/><AttentionMatrix title="Masked Scores" values={result.maskedScores}/><AttentionMatrix title="Masked Softmax Weights" values={result.weights}/></div><AttentionHeatmap label="Mask Attention Heatmap" weights={result.weights} tokens={tokens} query={query} selectedKey={selectedKey} onSelect={onSelect}/>
    <p className="lr-note">允许 j≤i；未来位置 j&gt;i 的权重严格为 0。内部以显式布尔可见性排除这些项，Masked Scores 的 −∞ 是数学展示，不把 Infinity 混入数值矩阵。若一行全被遮罩，计算明确报错。</p>
    <p>Encoder 的非因果 Self-Attention 可查看整段输入；Decoder 的 Masked Self-Attention 只能查看当前位置及过去。实际自回归训练还会移位目标序列，防止用待预测答案泄漏信息。这里仅演示掩码运算，没有实现完整 Decoder 或生成模型。</p>
  </section>;
}
