import { useState } from 'react';
import { MathFormula } from '../../components/lesson/MathFormula';
import { AttentionMatrix } from '../attention/AttentionMatrix';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import { productElement } from '../../services/attention/math';
import type { TensorStep } from '../../services/transformer/flow';
import { TRANSFORMER_FORMULAS } from '../../services/transformer/flow';
export function TensorInspector({ step, steps }: { step: TensorStep; steps: TensorStep[] }) {
  const [cell, setCell] = useState<[number,number]>([0,0]);
  const ff = step.ffn, norm = step.norm, row = Math.min(cell[0],step.output.length-1), col = Math.min(cell[1],step.output[0].length-1);
  const dot = ff ? productElement(ff.activated,ff.parameters.w2,row,col) : null;
  return <section className="tr-inspector" aria-label="张量检查器"><span className="eyebrow">TENSOR FLOW EXPLORER</span><h2 data-testid="current-tensor">{step.title}</h2><p className="lr-caption" data-testid="tensor-shape">{step.shape.join(' × ')} · {step.lane==='encoder'?'Encoder':'Decoder'}{step.layer!==undefined?' Layer '+(step.layer+1):''}</p>
    <MathFormula latex={step.formula} display/><p>{step.explanation}</p>
    <p className="lr-caption">来源：{step.dependencies.map(id=>steps.find(s=>s.id===id)?.title).join(' / ')||'用户输入'}。下一步去向：{steps.filter(s=>s.dependencies.includes(step.id)).map(s=>s.title).join(' / ')||'目标 Token 概率查看'}。</p>
    <AttentionMatrix title="当前张量" values={step.output} onSelect={ff?(i,j)=>setCell([i,j]):undefined} row={ff?row:undefined} column={ff?col:undefined}/>
    {step.inputs.map((input,i)=><details key={i}><summary>{input.name} · {input.values.length}×{input.values[0].length}</summary><AttentionMatrix title={input.name} values={input.values}/></details>)}
    {ff&&<div className="tr-detail" data-testid="ffn-detail"><h3>FFN 内部两次仿射与 ReLU</h3><MathFormula latex={'('+ff.input.length+'\\times'+ff.input[0].length+')('+ff.parameters.w1.length+'\\times'+ff.parameters.w1[0].length+')\\to('+ff.linear1.length+'\\times'+ff.linear1[0].length+')'} display/>
      <AttentionMatrix title="FFN W1" values={ff.parameters.w1}/><AttentionMatrix title="FFN b1" values={[ff.parameters.b1]}/><AttentionMatrix title="FFN Linear 1" values={ff.linear1}/><AttentionMatrix title="FFN ReLU" values={ff.activated} row={row}/><AttentionMatrix title="FFN W2" values={ff.parameters.w2} column={col}/><AttentionMatrix title="FFN b2" values={[ff.parameters.b2]}/>
      <aside className="lesson-callout callout-tip" data-testid="ffn-element"><strong>输出 [{row},{col}] 的真实来源</strong><p>ReLU 第 {row} 行 · W2 第 {col} 列：{dot!.products.map(fmt).join(' + ')}，点积 {fmt(dot!.value)} + b2[{col}] {fmt(ff.parameters.b2[col])} = {fmt(ff.output[row][col])}。</p><p>点击上方“当前张量”中的其他元素可切换；同一位置只使用自己的行，不混合别的 Token。</p></aside></div>}
    {norm&&<div className="tr-detail" data-testid="norm-detail"><h3>Post-LN：残差 → 逐 Token LayerNorm</h3><MathFormula latex={TRANSFORMER_FORMULAS.normStatistics} display/><MathFormula latex={TRANSFORMER_FORMULAS.normOutput} display/>
      <AttentionMatrix title="残差输入 X" values={norm.skip}/><AttentionMatrix title="子层输出" values={norm.sublayer}/><AttentionMatrix title="残差相加" values={norm.residual}/><AttentionMatrix title="每 Token 均值" values={norm.means.map(n=>[n])}/><AttentionMatrix title="每 Token 方差" values={norm.variances.map(n=>[n])}/><AttentionMatrix title="标准化结果" values={norm.normalized}/><AttentionMatrix title="gamma" values={[norm.parameters.gamma]}/><AttentionMatrix title="beta" values={[norm.parameters.beta]}/><p>epsilon={norm.epsilon}，零方差行标准化为 0，再得到 beta。LayerNorm 在每行特征维度统计；BatchNorm 采用的跨样本统计与此不同。</p></div>}
  </section>;
}
