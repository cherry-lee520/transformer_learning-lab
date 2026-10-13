import { MathFormula } from '../../components/lesson/MathFormula';
import type { Matrix, ProjectionWeights, AttentionResult } from '../../services/attention/math';
import type { useForwardPlayer } from '../neuron/useForwardPlayer';
import { AttentionMatrix } from './AttentionMatrix';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
export const ATTENTION_STEPS = [
  ['输入 X','X\\in\\mathbb{R}^{n\\times d_{model}}','一行对应一个 Token。这里已是输入表示，不再次添加 PE。'],
  ['Q、K、V 投影','Q=XW_Q,\\ K=XW_K,\\ V=XW_V','将 X 的每一行与权重的列做点积，三套参数独立。'],
  ['转置 K','K^T\\in\\mathbb{R}^{d_k\\times n}','交换行列，不改变元素值。每一列对应一个 Key。'],
  ['匹配分数','S=QK^T','每个 Query 与每个 Key 做点积，得到 n×n。'],
  ['缩放分数','\\widetilde S=S/\\sqrt{d_k}','缩放开关控制是否除以 √dk。关闭时保留原始分数用于对照。'],
  ['应用 Mask','S^{masked}_{ij}=\\begin{cases}\\widetilde S_{ij}&M_{ij}=1\\\\-\\infty&M_{ij}=0\\end{cases}','M=1 表示可见，M=0 表示排除。无 Mask 时所有 Key 可见；Causal 模式严格排除未来位置。'],
  ['逐行 Softmax','A_{ij}=\\frac{\\exp(s_{ij}-m_i)}{\\sum_{k\\ visible}\\exp(s_{ik}-m_i)}','每行独立减去可见项最大值并归一化；全 Mask 行未定义。'],
  ['加权 Value','O=AV','矩阵乘法把每个 Value 行按当前 Query 的权重加起来。'],
  ['最终输出','O\\in\\mathbb{R}^{n\\times d_v}','输出与 Token 一一对应，列数由 dv 决定；这不是完整 Encoder。'],
] as const;
export function attentionStepFormula(step: number, result: AttentionResult): string {
  if (step === 5 && result.factor === 1) return '\\widetilde S=S\\quad(\\alpha=1)';
  return ATTENTION_STEPS[step-1][1];
}
export function AttentionSteps({ x, parameters, result, player, query, onQuery }: { x: Matrix; parameters: ProjectionWeights; result: AttentionResult; player: ReturnType<typeof useForwardPlayer>; query: number; onQuery: (query: number) => void }) {
  const step = player.step, info = ATTENTION_STEPS[step-1];
  const matrix = (title: string, values: readonly (readonly (number|null)[])[], row?: number) => <AttentionMatrix title={title} values={values} row={row}/>;
  const inputs = [<>{matrix('输入表示 X',x)}</>, <>{matrix('X',x)}{matrix('WQ',parameters.wq)}{matrix('WK',parameters.wk)}{matrix('WV',parameters.wv)}</>, matrix('K',result.k), <>{matrix('Q',result.q)}{matrix('Kᵀ',result.kt)}</>, matrix('Scores',result.scores), matrix('ScaledScores',result.scaledScores), matrix('MaskedScores',result.maskedScores,query), <>{matrix('Weights',result.weights,query)}{matrix('V',result.v)}</>, matrix('加权输出',result.output)];
  const outputs = [matrix('X',x), <>{matrix('Q',result.q)}{matrix('K',result.k)}{matrix('V',result.v)}</>, matrix('Kᵀ',result.kt), matrix('Scores',result.scores), matrix('ScaledScores',result.scaledScores), <>{matrix('可见 Mask（1 可见，0 排除）',result.mask.map(row=>row.map(Number)))}{matrix('MaskedScores',result.maskedScores)}</>, matrix('Weights',result.weights,query), matrix('Weights × V',result.output,query), matrix('Attention Output',result.output)];
  return <section><h2>B · 九步计算 Attention</h2><p className="lr-lead">数值始终来自当前配置；高亮表示正在解释的步骤。编辑上游会暂停并回到第 1 步。</p><nav className="lr-steps" aria-label="Attention 计算步骤">{ATTENTION_STEPS.map((item,i)=><button key={item[0]} aria-current={step===i+1?'step':undefined} onClick={()=>player.go(i+1)}><span>{i+1}</span>{item[0]}</button>)}</nav>
    <div className="lr-actions"><button className="button secondary" disabled={step===1} onClick={()=>player.go(step-1)}>上一步</button><button className="button secondary" disabled={step===9} onClick={()=>player.go(step+1)}>下一步</button><button className="button primary" onClick={player.playing?player.pause:player.play}>{player.playing?'暂停播放':'自动播放'}</button><button className="button secondary" onClick={player.reset}>重置步骤</button><label className="lr-field">播放速度<select aria-label="播放速度" value={player.speed} onChange={event=>player.changeSpeed(Number(event.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label></div>
    <div className="lr-step-card at-current-step" data-testid="attention-step" data-step={step}><span className="eyebrow">STEP {step} / 9</span><h3>{info[0]}</h3><MathFormula latex={attentionStepFormula(step,result)} display/><p>{info[2]}</p>{step===5 && <p>当前乘数 = {fmt(result.factor)}，dk={result.dk}。</p>}
      <details open><summary>本步输入矩阵及形状</summary><div className="at-grid">{inputs[step-1]}</div></details><details open><summary>本步输出矩阵及形状 · 当前计算</summary><div className="at-grid at-step-output">{outputs[step-1]}</div></details>
      {step===7 && <div className="lr-note"><label className="lr-field">Softmax 行<select aria-label="Softmax 行" value={query} onChange={event=>onQuery(Number(event.target.value))}>{result.weights.map((_,i)=><option key={i} value={i}>Query {i}</option>)}</select></label><p>行最大值 {fmt(result.softmax[query].maximum)}；可见项指数和 {fmt(result.softmax[query].denominator)}；归一化后行和 {fmt(result.weights[query].reduce((a,b)=>a+b,0))}。</p><AttentionMatrix title="本行 exp(s − max)" values={[result.softmax[query].exponentials]}/><button className="button secondary" onClick={()=>onQuery((query+1)%x.length)}>查看下一行 Softmax</button></div>}
    </div><p className="lr-caption">没有持续位移动画；减少动态效果时仍可手动逐步查看。离开本模块会暂停播放。</p>
  </section>;
}
