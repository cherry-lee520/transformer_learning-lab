import { useState } from 'react';
import { ParameterInput } from '../../components/ParameterInput';
import { MathFormula } from '../../components/lesson/MathFormula';
import { computeNeuron } from '../../services/neuronMath';
import { PARAMETER_RANGE, formatNumber } from '../../services/neuron';
import { judgeChallenge, NEURON_CHALLENGES } from './challenges';
import type { ChallengeVerdict, NeuronChallenge } from './challenges';
function ChallengeCard({ challenge, onVerdict }: { challenge: NeuronChallenge; onVerdict: (success: boolean) => void }) {
  const [answer, setAnswer] = useState('');
  const [weights, setWeights] = useState(challenge.kind === 'tuning' ? [...challenge.initialWeights] : []);
  const [bias, setBias] = useState(challenge.kind === 'tuning' ? challenge.initialBias : 0);
  const [revision, setRevision] = useState(0);
  const [verdict, setVerdict] = useState<ChallengeVerdict | null>(null);
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const hasInvalidDraft = Object.values(invalidFields).some(Boolean);
  function clearVerdict() { setVerdict(null); onVerdict(false); }
  function reset() { clearVerdict(); setAnswer(''); setInvalidFields({}); if (challenge.kind === 'tuning') { setWeights([...challenge.initialWeights]); setBias(challenge.initialBias); setRevision(value => value + 1); } }
  const result = challenge.kind === 'tuning' ? computeNeuron({ inputs: challenge.inputs, weights, bias, activationType: challenge.activationType }) : null;
  return <form className="neuron-challenge" data-challenge={challenge.id} onSubmit={event => {
    event.preventDefault();
    if (hasInvalidDraft) return;
    const next = judgeChallenge(challenge.id, challenge.kind === 'prediction' ? { kind: 'prediction', answer } : { kind: 'tuning', weights, bias });
    setVerdict(next); onVerdict(next.valid && next.success);
  }} noValidate><span className="eyebrow">{challenge.kind === 'prediction' ? 'PREDICT' : 'ADJUST & SOLVE'}</span><h3>{challenge.title}</h3><p>{challenge.prompt}</p>{challenge.kind === 'prediction' ? <label className="challenge-answer">预测输出 y<input aria-label={`${challenge.title}答案`} type="number" step="any" value={answer} onChange={event => { setAnswer(event.target.value); clearVerdict(); }} /></label> : <><div className="challenge-fixed"><strong>固定输入：{challenge.inputs.map((value, index) => `x${index + 1} = ${value}`).join('，')}</strong><span>目标 y = {challenge.target} · 允许误差 {challenge.tolerance}</span></div><div className="challenge-parameters">{weights.map((weight, index) => <ParameterInput key={`${revision}-${index}`} scope="挑战三" name={`w${index + 1}`} label="权重" value={weight} {...PARAMETER_RANGE} onEdit={clearVerdict} onValidityChange={valid => setInvalidFields(current => ({ ...current, [String(index)]: !valid }))} onChange={value => { clearVerdict(); setWeights(current => current.map((item, currentIndex) => currentIndex === index ? value : item)); }} />)}<ParameterInput key={`${revision}-bias`} scope="挑战三" name="b" label="偏置" value={bias} {...PARAMETER_RANGE} onEdit={clearVerdict} onValidityChange={valid => setInvalidFields(current => ({ ...current, bias: !valid }))} onChange={value => { clearVerdict(); setBias(value); }} /></div>{result && <div className="challenge-current"><MathFormula latex={`y=${formatNumber(result.output)}`} label="挑战当前输出" /><span>当前输出 <output aria-label="挑战三当前输出">{formatNumber(result.output)}</output></span></div>}</>}
    <div className="challenge-actions"><button className="button primary" type="submit" disabled={hasInvalidDraft}>提交检查</button><button className="button secondary" type="button" onClick={reset}>重新挑战</button></div>{hasInvalidDraft && <p className="parameter-error">请先修正挑战参数，再提交检查。</p>}{verdict && <div className={`challenge-feedback ${verdict.success ? 'correct' : 'incorrect'}`} role={verdict.valid ? 'status' : 'alert'}><strong>{!verdict.valid ? '请检查答案' : verdict.success ? '挑战完成' : '还差一点，再试一次'}</strong><p>{verdict.explanation}</p>{verdict.valid && verdict.actual !== null && verdict.expected !== null && <p>本次提交：{formatNumber(verdict.actual)} · 目标结果：{formatNumber(verdict.expected)}</p>}</div>}
  </form>;
}
export function NeuronChallenges() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  return <section className="panel neuron-challenges" id="neuron-challenges" aria-labelledby="challenges-heading"><div className="lab-panel-heading"><div><span className="eyebrow">TRY IT YOURSELF</span><h2 id="challenges-heading">把理解变成三次小挑战</h2></div><span className="challenge-count">已完成 {Object.values(completed).filter(Boolean).length}/{NEURON_CHALLENGES.length}</span></div><p className="lab-muted">挑战参数独立于上方探索区；只有点击“提交检查”才判定。本次页面刷新会清空挑战记录，不改变课时完成状态。</p><div className="challenge-grid">{NEURON_CHALLENGES.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} onVerdict={success => setCompleted(current => ({ ...current, [challenge.id]: success }))} />)}</div></section>;
}

