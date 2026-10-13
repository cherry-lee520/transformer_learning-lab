import { computeNeuron } from '../../services/neuronMath.ts';
import type { NeuronConfig, ActivationType } from '../../services/neuronMath.ts';
import { withinTolerance } from '../../services/numbers.ts';
interface Base { id: string; title: string; prompt: string; tolerance: number }
export interface PredictionChallenge extends Base { kind: 'prediction'; config: NeuronConfig }
export interface TuningChallenge extends Base { kind: 'tuning'; inputs: readonly number[]; activationType: ActivationType; target: number; initialWeights: readonly number[]; initialBias: number }
export type NeuronChallenge = PredictionChallenge | TuningChallenge;
export const NEURON_CHALLENGES: readonly NeuronChallenge[] = [
  { id: 'predict-linear', kind: 'prediction', title: '挑战一 · 预测输出', prompt: 'x = 2，w = 3，b = 1，激活函数为 Linear。请独立预测最终输出 y。', config: { inputs: [2], weights: [3], bias: 1, activationType: 'linear' }, tolerance: 0.000001 },
  { id: 'predict-relu', kind: 'prediction', title: '挑战二 · 负值经过 ReLU', prompt: 'x = 2，w = -3，b = 1。先计算 z，再预测经过 ReLU 的输出 y。', config: { inputs: [2], weights: [-3], bias: 1, activationType: 'relu' }, tolerance: 0.000001 },
  { id: 'tune-target', kind: 'tuning', title: '挑战三 · 调到目标值', prompt: '输入固定为 x1 = 2、x2 = -1，激活函数固定为 Linear。只调整权重与偏置，让输出接近目标 6。', inputs: [2, -1], activationType: 'linear', target: 6, tolerance: 0.05, initialWeights: [1, 1], initialBias: 0 },
];
export type ChallengeSubmission = { kind: 'prediction'; answer: string } | { kind: 'tuning'; weights: readonly number[]; bias: number };
export interface ChallengeVerdict { valid: boolean; success: boolean; actual: number | null; expected: number | null; explanation: string }
export function judgeChallenge(id: string, submission: ChallengeSubmission): ChallengeVerdict {
  const challenge = NEURON_CHALLENGES.find(item => item.id === id);
  const invalid: ChallengeVerdict = { valid: false, success: false, actual: null, expected: null, explanation: '请提供有效答案或范围内的有限参数。' };
  if (!challenge || !submission || challenge.kind !== submission.kind) return invalid;
  if (challenge.kind === 'prediction' && submission.kind === 'prediction') {
    if (typeof submission.answer !== 'string' || !submission.answer.trim()) return invalid;
    const actual = Number(submission.answer), result = computeNeuron(challenge.config);
    if (!Number.isFinite(actual) || !result) return invalid;
    return { valid: true, success: withinTolerance(actual, result.output, challenge.tolerance), actual, expected: result.output, explanation: `先乘：${result.weightedTerms.join(' + ')}；加偏置得到 z = ${result.preActivation}；经过 ${result.activationType === 'relu' ? 'ReLU：max(0, z)' : 'Linear：保持原值'}，y = ${result.output}。` };
  }
  if (challenge.kind === 'tuning' && submission.kind === 'tuning') {
    if (!Array.isArray(submission.weights) || ![...submission.weights, submission.bias].every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10)) return invalid;
    // Fixed inputs, activation and target always come from challenge data, never from submitted UI state.
    const result = computeNeuron({ inputs: challenge.inputs, weights: submission.weights, bias: submission.bias, activationType: challenge.activationType });
    if (!result) return invalid;
    return { valid: true, success: withinTolerance(result.output, challenge.target, challenge.tolerance), actual: result.output, expected: challenge.target, explanation: `当前 y = ${challenge.inputs.map((input, index) => `(${input}) × (${submission.weights[index]})`).join(' + ')} + (${submission.bias}) = ${result.output}。目标为 ${challenge.target}，允许绝对误差 ${challenge.tolerance}；不同参数组合可以得到相同输出。` };
  }
  return invalid;
}
