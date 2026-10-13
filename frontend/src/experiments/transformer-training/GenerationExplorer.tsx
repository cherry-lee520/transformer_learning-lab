import { useState } from 'react';
import { NumberField } from '../language/Controls';
import { AttentionMatrix } from '../attention/AttentionMatrix';
import { AttentionHeatmap } from '../../visualizations/attention/AttentionHeatmap';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import type { GenerationResponse } from '../../services/transformerTraining';
function RectangularHeatmap({weights,queries,keys,query,keyIndex,onSelect}:{weights:number[][];queries:string[];keys:string[];query:number;keyIndex:number;onSelect:(q:number,k:number)=>void}){
  // Square cases directly reuse T08; Cross needs separate query/key labels.
  if(queries.length===keys.length&&queries.every((token,i)=>token===keys[i]))return <AttentionHeatmap weights={weights} tokens={keys} query={query} selectedKey={keyIndex} onSelect={onSelect} label="训练 Attention Heatmap"/>;
  const width=150+keys.length*52,height=70+queries.length*52;
  return <div className="lr-scroll" tabIndex={0} aria-label="Cross-Attention 热图，可滚动"><svg viewBox={'0 0 '+width+' '+height} style={{minWidth:width,width,height}} role="group" aria-label="训练 Attention Heatmap"><text x={150} y={18}>Key →</text>{keys.map((word,j)=><text key={j} x={150+(j+.5)*52} y={48} textAnchor="middle">{word}</text>)}{weights.map((row,i)=><g key={i}><text x={140} y={94+i*52} textAnchor="end">{i} · {queries[i]}</text>{row.map((n,j)=><g key={j} role="button" tabIndex={0} aria-label={'注意力 '+i+','+j+' = '+fmt(n)} data-weight={n} aria-pressed={query===i&&keyIndex===j} onClick={()=>onSelect(i,j)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i,j);}}}><rect x={150+j*52} y={65+i*52} width={48} height={48} rx={4} fill="#8163c5" fillOpacity={.08+.92*n} stroke={query===i&&keyIndex===j?'#4a2a7f':'#eee7f7'}/><text x={150+(j+.5)*52} y={94+i*52} textAnchor="middle">{n.toFixed(3)}</text><title>{n}</title></g>)}</g>)}</svg></div>;
}
export function GenerationExplorer({response}:{response:GenerationResponse}){
  const [comparison,setComparison]=useState('current'),[position,setPosition]=useState(0),[kind,setKind]=useState('cross'),[layer,setLayer]=useState(0),[head,setHead]=useState(0),[query,setQuery]=useState(0),[keyIndex,setKey]=useState(0);
  const generation=comparison==='initial'&&response.initial?response.initial:response.current;
  const index=Math.min(position,generation.steps.length-1),step=generation.steps[index];
  const attentions=kind==='encoder'?generation.encoder_self:kind==='decoder'?step.decoder_self:step.cross;
  const l=Math.min(layer,attentions.length-1),h=Math.min(head,attentions[l].length-1),weights=attentions[l][h];
  const queries=kind==='encoder'?generation.source_tokens:step.prefix,keys=kind==='decoder'?step.prefix:generation.source_tokens,q=Math.min(query,queries.length-1),k=Math.min(keyIndex,keys.length-1);
  return <section aria-label="真实推理结果"><h3>逐 Token Greedy 解码</h3><p data-testid="generated-sequence">生成序列：{generation.generated_tokens.join(' ')} · {generation.stop_reason==='eos'?'遇到 EOS 停止':'达到长度上限停止'}</p><p className="lr-caption">模型快照 Step {response.model_step}。{response.trained?'这是当前训练模型的真实输出，仍需验证泛化。':'模型尚未训练，预测不可靠。'}与初始化模型的比较使用相同输入、真实参数，不是正确答案预设。</p>
    <div className="lr-controls"><label className="lr-field">比较模型<select aria-label="比较模型" value={comparison} onChange={e=>{setComparison(e.target.value);setPosition(0);setQuery(0);setKey(0);}}><option value="current">当前模型</option>{response.initial&&<option value="initial">训练前初始化模型</option>}</select></label><NumberField label="解码步骤" value={index} min={0} max={generation.steps.length-1} onChange={setPosition}/></div>
    <div className="lesson-callout callout-tip"><strong>Step {index+1}：前缀 [{step.prefix.join(' ')}]</strong><p data-testid="chosen-token">本步选择：{step.chosen_token}（Logits 最大项）</p><p>Top-K：{step.top_k.map(item=>item.token+' '+fmt(item.probability)).join(' · ')}</p></div>
    <AttentionMatrix title="本步 Logits" values={[step.logits]}/><AttentionMatrix title="本步 Softmax 概率" values={[step.probabilities]}/><p className="lr-caption">词表顺序：{response.vocabulary.join(' · ')}。概率和 {fmt(step.probabilities.reduce((a,b)=>a+b,0))}。</p>
    <h3>真实注意力快照</h3><div className="lr-controls"><label className="lr-field">注意力类型<select aria-label="注意力类型" value={kind} onChange={e=>{setKind(e.target.value);setQuery(0);setKey(0);}}><option value="encoder">Encoder Self-Attention</option><option value="decoder">Decoder Masked Self-Attention</option><option value="cross">Encoder–Decoder Cross-Attention</option></select></label><NumberField label="注意力层索引" value={l} min={0} max={attentions.length-1} onChange={setLayer}/><NumberField label="Head 索引" value={h} min={0} max={attentions[l].length-1} onChange={setHead}/></div>
    <RectangularHeatmap weights={weights} queries={queries} keys={keys} query={q} keyIndex={k} onSelect={(i,j)=>{setQuery(i);setKey(j);}}/><p data-testid="training-attention-value">Query {q} {queries[q]} → Key {k} {keys[k]}：{fmt(weights[q][k])}</p><AttentionMatrix title="训练 Attention 权重" values={weights} row={q} column={k}/>
    <details><summary>关键张量形状</summary>{Object.entries(generation.shapes).map(([name,shape])=><p key={name}>{name}：{shape.join('×')}</p>)}</details><p className="lr-caption">推理时 Dropout 关闭。热图使用 Softmax 后、Dropout 前的真实权重；Causal 未来键与 PAD 键严格为 0，PAD Query 行为零行。注意力分布不等同于完整模型解释。</p>
  </section>;
}
