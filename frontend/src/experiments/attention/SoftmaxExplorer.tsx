import { useState } from 'react';
import { MathFormula } from '../../components/lesson/MathFormula';
import { rowSoftmax } from '../../services/attention/math';
import type { AttentionResult } from '../../services/attention/math';
import { NumberField } from '../language/Controls';
import { AttentionMatrix } from './AttentionMatrix';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
export function ProbabilityBars({ weights, label }: { weights: number[]; label: string }) {
  return <div className="at-bars" aria-label={label}>{weights.map((weight,j)=><div key={j}><span>{j}</span><div className="at-bar-track"><i style={{width:(weight*100)+'%'}}/></div><output data-index={j} data-weight={weight}>{fmt(weight)}</output></div>)}</div>;
}
export function SoftmaxExplorer({ result, query }: { result: AttentionResult; query: number }) {
  const [source,setSource]=useState<'teaching'|'current'>('teaching'), [scores,setScores]=useState([1,2,3]), [dk,setDk]=useState(4), [scaled,setScaled]=useState(true);
  const current = source==='current'?result.scores[query]:scores, dimension=source==='current'?result.dk:dk;
  const scaledScores=current.map(value=>value/Math.sqrt(dimension)), rawWeights=rowSoftmax(current), scaledWeights=rowSoftmax(scaledScores);
  return <section><h2>C · Softmax 与 √dk 缩放</h2><p className="lr-lead">比较同一行分数缩放前后的分布。此模块隔离 Mask，专门观察分数差异，不改变 A/B 的配置。</p><div className="lr-controls"><label className="lr-field">分数来源<select aria-label="分数来源" value={source} onChange={event=>setSource(event.target.value as typeof source)}><option value="teaching">可编辑教学分数</option><option value="current">当前 Query 原始分数</option></select></label>{source==='teaching'&&<NumberField label="缩放示例 dk" value={dk} min={1} max={64} onChange={setDk}/>}<label className="at-check"><input type="checkbox" checked={scaled} onChange={event=>setScaled(event.target.checked)}/>示例缩放开关</label></div>
    {source==='teaching'&&<div className="lr-controls">{scores.map((score,j)=><NumberField key={j} label={'示例分数 '+j} value={score} min={-1000} max={1000} integer={false} onChange={value=>setScores(scores.map((n,k)=>j===k?value:n))}/>)}</div>}
    <MathFormula latex="p_j=\frac{\exp(s_j-m)}{\sum_k\exp(s_k-m)},\quad m=\max_k s_k" display/><div className="lr-two-columns"><div><AttentionMatrix title="原始分数" values={[current]}/><h3>缩放前概率</h3><ProbabilityBars weights={rawWeights} label="缩放前概率"/></div><div><AttentionMatrix title="除以 √dk 后分数" values={[scaledScores]}/><h3>缩放后概率 · dk={dimension}</h3><ProbabilityBars weights={scaledWeights} label="缩放后概率"/></div></div>
    <AttentionMatrix title="当前示例使用的 Softmax 权重" values={[scaled?scaledWeights:rawWeights]}/><p className="lr-note">在 Q、K 分量近似独立、均值为 0、方差为 1 的假设下，点积方差约为 dk；除以 √dk 控制典型尺度。较大分数差异通常产生更尖锐的 Softmax，但不保证所有情况下性能更好。教学分数不是模型训练结果。</p>
  </section>;
}
