import { useState } from 'react';
import { AttentionMatrix } from '../attention/AttentionMatrix';
import { NumberField } from '../language/Controls';
import { MathFormula } from '../../components/lesson/MathFormula';
import { contribution } from '../../services/attention/math';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import type { TensorStep } from '../../services/transformer/flow';
import { TRANSFORMER_FORMULAS } from '../../services/transformer/flow';
export function AttentionInspector({ step, sourceTokens, targetTokens }: { step: TensorStep; sourceTokens: string[]; targetTokens: string[] }) {
  const [headIndex,setHead]=useState(0),[query,setQuery]=useState(0),[keyIndex,setKey]=useState(0);
  const multi=step.attention!, head=Math.min(headIndex,multi.heads.length-1), result=multi.heads[head];
  const cross=step.id.endsWith('-cross'), keys=step.lane==='encoder'?sourceTokens:cross?sourceTokens:targetTokens, queries=step.lane==='encoder'?sourceTokens:targetTokens;
  const q=Math.min(query,result.q.length-1), k=Math.min(keyIndex,result.k.length-1), terms=contribution(result,q);
  const width=155+keys.length*55,height=75+queries.length*55;
  return <section aria-label="注意力检查"><h2>{step.title}</h2><p>{step.explanation}</p><div className="lr-controls"><label className="lr-field">Attention Head<select aria-label="Attention Head" value={head} onChange={e=>setHead(Number(e.target.value))}>{multi.heads.map((_,i)=><option key={i} value={i}>Head {i+1}</option>)}</select></label><NumberField label="Query 位置" value={q} min={0} max={queries.length-1} onChange={setQuery}/><NumberField label="Key 位置" value={k} min={0} max={keys.length-1} onChange={setKey}/></div>
    <p className="lr-caption">{cross?'Q：Masked Add & Norm；K/V：最终 Encoder Memory。不同长度，Cross 不用 Causal Mask。':step.lane==='decoder'?'Q/K/V 均为本层 Decoder 输入；j>i 的未来权重严格为 0。':'Q/K/V 均为本层 Encoder 输入；无 Causal Mask。'}</p>
    <MathFormula latex={TRANSFORMER_FORMULAS.attention} display/>
    <div className="lr-scroll" tabIndex={0} aria-label="矩形 Attention Heatmap，可滚动"><svg viewBox={'0 0 '+width+' '+height} style={{width,minWidth:width,height}} role="group" aria-label="Attention 权重热图"><text x={155} y={18}>Key Token →</text><text x={5} y={50}>Query ↓</text>{keys.map((token,j)=><text key={j} x={155+(j+.5)*55} y={48} textAnchor="middle">{j} · {token.slice(0,4)}</text>)}{result.weights.map((line,i)=><g key={i}><text x={145} y={92+i*55} textAnchor="end">{i} · {queries[i].slice(0,9)}</text>{line.map((n,j)=><g key={j} role="button" tabIndex={0} aria-label={'权重 '+i+','+j+' = '+fmt(n)} aria-pressed={q===i&&k===j} data-query={i} data-key={j} data-weight={n} onClick={()=>{setQuery(i);setKey(j);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setQuery(i);setKey(j);}}}><title>{'Weight['+i+','+j+']='+n}</title><rect x={155+j*55} y={65+i*55} width={51} height={51} rx={5} fill="#8166cb" fillOpacity={.08+.92*n} stroke={q===i&&k===j?'#432575':'#e1d9ee'} strokeWidth={q===i&&k===j?3:1}/><text x={155+(j+.5)*55} y={94+i*55} textAnchor="middle">{n.toFixed(3)}</text></g>)}</g>)}</svg></div>
    <p data-testid="attention-cell">Weight[{q},{k}]={fmt(result.weights[q][k])}；score={fmt(result.scores[q][k])}；缩放={fmt(result.scaledScores[q][k])}；{result.mask[q][k]?'可见':'未来被 Mask'}。</p>
    <div className="tr-matrix-grid"><AttentionMatrix title="Attention Q" values={result.q} row={q}/><AttentionMatrix title="Attention K" values={result.k} row={k}/><AttentionMatrix title="Attention V" values={result.v} row={k}/><AttentionMatrix title="Attention Scores" values={result.scores}/><AttentionMatrix title="可见 Mask" values={result.mask.map(row=>row.map(n=>n?1:0))}/><AttentionMatrix title="Masked Scores" values={result.maskedScores}/><AttentionMatrix title="Attention Weights" values={result.weights} row={q}/><AttentionMatrix title="Head Output" values={result.output} row={q}/></div>
    <details><summary>Query {q} 的 Value 贡献与多头输出</summary><AttentionMatrix title="Value 加权贡献" values={terms.terms}/><AttentionMatrix title="贡献求和" values={[terms.sum]}/><AttentionMatrix title="Concat" values={multi.concat}/><AttentionMatrix title="Multi-Head Output" values={multi.output}/></details>
    <p className="lr-caption">随机注意力只展示数值混合，不证明已经理解语言，也不等同于完整模型解释。</p>
  </section>;
}
