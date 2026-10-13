import { useState } from 'react';
import { checkGradients } from '../../services/mlp/gradientCheck';
import type { GradientCheckResult } from '../../services/mlp/gradientCheck';
import { XOR_DATA } from '../../services/mlp/network';
import { formatMathNumber as number } from '../../services/mathDisplay';
import type { MLPEngine } from './useMLPTraining';
export function GradientCheckPanel({engine}:{engine:MLPEngine}){
  const [checked,setChecked]=useState<{step:number;result:GradientCheckResult}|null>(null),[error,setError]=useState('');
  function run(){engine.pause();try{setChecked({step:engine.session.step,result:checkGradients(engine.session.model,XOR_DATA,engine.settings.loss)});setError('');}catch(caught){setError(caught instanceof Error?caught.message:'梯度检查失败。');}}
  return <section className="panel nn-gradient-check"><div className="nn-section-head"><div><span className="eyebrow">CHECK THE HANDWRITTEN DERIVATIVE</span><h2>用数值梯度核对反向传播</h2></div><button className="button secondary" onClick={run}>运行数值梯度检查</button></div><p className="nn-caption">检查会暂停训练，逐个参数做中心差分。ε=10⁻⁵；绝对误差容差为 10⁻⁶×max(1,|解析值|,|数值值|)。ReLU 零点及跨零扰动跳过普通检查。</p>
    {error&&<p role="alert">{error}</p>}{checked&&<><div className={'nn-note '+(checked.result.passed?'success':'')} role="status" aria-label="数值梯度检查结果" data-checked-step={checked.step} data-passed={checked.result.passed}>{checked.result.status==='skipped'?checked.result.reason: 'Step '+checked.step+' · '+(checked.result.passed?'梯度检查通过':'梯度误差超出容差')+' · '+checked.result.entries.length+' 个参数；最大绝对误差 '+number(checked.result.maxAbsoluteError)+'，最大相对误差 '+number(checked.result.maxRelativeError)}</div>{checked.result.entries.length>0&&<details className="nn-details"><summary>查看逐参数比较结果</summary><div className="nn-table-scroll" tabIndex={0}><table><thead><tr><th>参数</th><th>手写解析梯度</th><th>中心差分</th><th>绝对误差</th></tr></thead><tbody>{checked.result.entries.map(entry=><tr key={entry.parameter}><th>{entry.parameter}</th><td>{number(entry.analytic)}</td><td>{number(entry.numerical)}</td><td>{number(entry.absoluteError)}</td></tr>)}</tbody></table></div></details>}</>}
  </section>;
}

