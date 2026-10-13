import type { QuizBlock } from '../../lessons/contentTypes.ts';
import { activate } from '../../services/neuronMath.ts';
import { activationDerivative } from '../../services/activationMath.ts';
import { computeGradientChain } from '../../services/gradientChain.ts';
import { formatMathNumber } from '../../services/mathDisplay.ts';
import { CHAIN_PRESETS } from './definitions.ts';
const derivative = activationDerivative(0, 'sigmoid')!;
const saturated = [-8, 0, 8].filter(x => {
  const slope = activationDerivative(x, 'sigmoid');
  return slope?.status === 'defined' && slope.value < 0.001;
});
const a = computeGradientChain(CHAIN_PRESETS[0].config)!.gradient;
const b = computeGradientChain(CHAIN_PRESETS[4].config)!.gradient;
if (derivative.status !== 'defined' || a.status !== 'defined' || b.status !== 'defined') throw new Error('挑战配置必须在可导点计算。');
export const ACTIVATION_CHALLENGES: QuizBlock[] = [
  { id: 'ag-predict-output', type: 'quiz', question: { kind: 'numeric', prompt: '挑战 1 · x = -2，经过 ReLU 后的输出是多少？', answer: activate(-2, 'relu')!, tolerance: 0.000001, explanation: 'ReLU(-2) = max(0, -2) = 0。函数输出与输入处的导数是两个不同的量。' } },
  { id: 'ag-predict-derivative', type: 'quiz', question: { kind: 'numeric', prompt: '挑战 2 · Sigmoid 在 x = 0 处的局部导数是多少？', answer: derivative.value, tolerance: 0.000001, explanation: 'Sigmoid(0) = 0.5，因此 f′(0) = 0.5 × (1 - 0.5) = 0.25。' } },
  { id: 'ag-saturation', type: 'quiz', question: { kind: 'multiple', prompt: '挑战 3 · 以 f′(x) < 0.001 为本题的饱和判据，Sigmoid 的哪些输入满足？', options: [-8, 0, 8].map(x => ({ id: 'x-' + x, text: 'x = ' + x })), correctOptionIds: saturated.map(x => 'x-' + x), explanation: '在 ±8 处导数约 0.000335，低于本题阈值；零点导数为 0.25。阈值是本题约定，不是所有任务统一的饱和边界。Tanh 也有远离零点的饱和区。' } },
  { id: 'ag-compare-chain', type: 'quiz', question: { kind: 'single', prompt: '挑战 4 · 两组均为 4 层 Sigmoid，输入 0.5。A：每层 w=1、b=6；B：每层 w=4、b=-2。哪组 |dy/dx| 更小？', options: [{ id: 'a', text: 'A 组衰减更明显' }, { id: 'b', text: 'B 组衰减更明显' }, { id: 'same', text: '两组相同' }], correctOptionId: a.magnitude < b.magnitude ? 'a' : a.magnitude > b.magnitude ? 'b' : 'same', explanation: '真实连乘结果：A 为 ' + formatMathNumber(a.value) + '，B 为 ' + formatMathNumber(b.value) + '。B 每层 z=0，4 × 0.25=1。梯度由权重和激活导数共同决定，不能只凭激活函数名称判断。' } },
];
