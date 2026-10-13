import type { NeuronComputation } from '../../services/neuronMath.ts';
import { ACTIVATIONS } from '../../services/neuronMath.ts';
import { formatNumber } from '../../services/neuron.ts';
export interface ForwardStep { title: string; latex: string; explanation: string; nodes: string[]; edges: string[] }
export function forwardSteps(result: NeuronComputation): ForwardStep[] {
  const inputs = result.inputs.map((_, index) => `input-${index}`);
  const weights = result.inputs.map((_, index) => `weight-${index}`);
  const edges = result.inputs.map((_, index) => `term-${index}`);
  const number = formatNumber;
  return [
    { title: '展示输入值', latex: result.inputs.map((value, index) => `x_{${index + 1}}=${number(value)}`).join(',\\quad '), explanation: '读取当前输入；输入本身还没有乘上权重。', nodes: inputs, edges: [] },
    { title: '分别乘以权重', latex: `\\begin{aligned}${result.weightedTerms.map((term, index) => `x_{${index + 1}}w_{${index + 1}} &= (${number(result.inputs[index])})\\times(${number(result.weights[index])}) = ${number(term)}`).join('\\\\')}\\end{aligned}`, explanation: '每个输入只乘以自己的权重，得到各项贡献。', nodes: [...inputs, ...weights], edges },
    { title: '对所有乘积求和', latex: `s = ${result.weightedTerms.map(value => `(${number(value)})`).join('+')} = ${number(result.weightedSum)}`, explanation: '把各项贡献相加；此时尚未加上偏置。', nodes: ['sum'], edges },
    { title: '加入偏置', latex: `z=s+b=(${number(result.weightedSum)})+(${number(result.bias)})=${number(result.preActivation)}`, explanation: '偏置只加一次，得到激活前的值 z。', nodes: ['sum', 'bias'], edges: ['bias'] },
    { title: '执行激活函数', latex: `y=f(z),\\quad ${ACTIVATIONS[result.activationType].latex},\\quad f(${number(result.preActivation)})=${number(result.output)}`, explanation: ACTIVATIONS[result.activationType].description, nodes: ['activation'], edges: ['activation'] },
    { title: '输出最终结果', latex: `y=${number(result.output)}`, explanation: '这是当前神经元的前向传播结果，不涉及参数学习或反向传播。', nodes: ['output'], edges: ['output'] },
  ];
}
