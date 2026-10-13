import { useState } from 'react';
import { NumberField } from '../language/Controls';
import { AttentionMatrix } from '../attention/AttentionMatrix';
import { topTokens } from '../../services/transformer/model';
import type { TransformerResult } from '../../services/transformer/model';
import type { Vocabulary } from '../../services/language/vocabulary';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import { MathFormula } from '../../components/lesson/MathFormula';
import { TRANSFORMER_FORMULAS } from '../../services/transformer/flow';
export function ProbabilityInspector({ result, vocabulary }: { result: TransformerResult; vocabulary: Vocabulary }) {
  const [position,setPosition]=useState(result.probabilities.length-1),[count,setCount]=useState(5);
  const pos=Math.min(position,result.probabilities.length-1),k=Math.min(count,vocabulary.tokens.length),row=result.probabilities[pos],ranked=topTokens(row,vocabulary,k);
  return <section><h2>输出概率 · 未训练模型</h2><p>最后一个前缀位置的分布用于预测下一个 Token；这里只计算一次前向，不自动生成句子。</p><div className="lr-controls"><NumberField label="查看目标位置" value={pos} min={0} max={result.probabilities.length-1} onChange={setPosition}/><NumberField label="Top-K" value={k} min={1} max={vocabulary.tokens.length} onChange={setCount}/></div><button className="button secondary" onClick={()=>setPosition(result.probabilities.length-1)}>查看前缀最后位置</button>
    <MathFormula latex={TRANSFORMER_FORMULAS.probabilities} display/><div className="lr-stats"><span data-testid="probability-sum">第 {pos} 行概率和：{fmt(row.reduce((sum,n)=>sum+n,0))}</span><span>{result.output.length}×{vocabulary.tokens.length}</span><span>源/目标/输出共享 E</span></div>
    <div className="at-bars" aria-label="Top-K 概率">{ranked.map(item=><div key={item.id}><span>{item.id}</span><div><strong>{item.token}</strong><div className="at-bar-track"><i style={{width:100*item.probability+'%'}}/></div></div><output data-probability={item.probability}>{fmt(item.probability)}</output></div>)}</div>
    <div className="lr-scroll" tabIndex={0} aria-label="目标词表概率，可滚动"><table className="tr-prob-table" aria-label="目标词表概率"><thead><tr><th>ID</th><th>Token</th><th>Logit</th><th>概率</th></tr></thead><tbody>{vocabulary.tokens.map((token,id)=><tr key={id}><th>{id}</th><td>{token}</td><td data-logit={result.logits[pos][id]}>{fmt(result.logits[pos][id])}</td><td data-probability={row[id]}>{fmt(row[id])}</td></tr>)}</tbody></table></div>
    <details><summary>共享投影和全部位置的矩阵</summary><AttentionMatrix title="输出投影 Eᵀ" values={result.projection}/><AttentionMatrix title="Logits" values={result.logits}/><AttentionMatrix title="Probabilities" values={result.probabilities}/></details><p className="lr-caption">所有词表项均参与 Softmax，包括特殊 Token；这里不添加生成约束、损失、训练或采样器。</p>
  </section>;
}
