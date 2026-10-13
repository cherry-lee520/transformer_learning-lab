import { sampleDomain } from './plotSampling.ts';
export const ACTIVATIONS = {
  linear: { label: 'Linear', latex: 'f(z)=z', description: '保持加偏置后的结果不变。' },
  relu: { label: 'ReLU', latex: 'f(z)=\\max(0,z)', description: '负数变成 0，非负数保持原值。' },
  sigmoid: { label: 'Sigmoid', latex: 'f(z)=\\frac{1}{1+e^{-z}}', description: '把结果压缩到 0 和 1 之间；极端值在浮点计算中可能饱和到端点。' },
  tanh: { label: 'Tanh', latex: 'f(z)=\\tanh(z)', description: '把结果压缩到 -1 和 1 之间，以 0 为中心。' },
} as const;
export type ActivationType = keyof typeof ACTIVATIONS;
export interface NeuronConfig { inputs: readonly number[]; weights: readonly number[]; bias: number; activationType: ActivationType }
export interface NeuronComputation {
  inputs: number[]; weights: number[]; weightedTerms: number[]; weightedSum: number;
  bias: number; preActivation: number; activationType: ActivationType; output: number;
}
export const isActivationType = (value: unknown): value is ActivationType => typeof value === 'string' && Object.hasOwn(ACTIVATIONS, value);
export function activate(z: number, type: ActivationType): number | null {
  if (!Number.isFinite(z) || !isActivationType(type)) return null;
  switch (type) {
    case 'linear': return z;
    case 'relu': return Math.max(0, z);
    case 'sigmoid': {
      // The exponent is always nonpositive, so exp cannot overflow.
      if (z >= 0) return 1 / (1 + Math.exp(-z));
      const exponential = Math.exp(z);
      return exponential / (1 + exponential);
    }
    case 'tanh': return Math.tanh(z);
  }
}
/** One calculation kernel for both T03 and T04. Invalid/overflowing calculations return null. */
export function computeNeuron(config: NeuronConfig): NeuronComputation | null {
  if (!config || !Array.isArray(config.inputs) || !Array.isArray(config.weights) || config.inputs.length < 1 || config.inputs.length > 5 || config.weights.length !== config.inputs.length || !Number.isFinite(config.bias) || !isActivationType(config.activationType)) return null;
  if (![...config.inputs, ...config.weights].every(value => typeof value === 'number' && Number.isFinite(value))) return null;
  const weightedTerms = config.inputs.map((input, index) => input * config.weights[index]);
  if (!weightedTerms.every(Number.isFinite)) return null;
  let weightedSum = 0;
  for (const term of weightedTerms) {
    weightedSum += term;
    if (!Number.isFinite(weightedSum)) return null;
  }
  const preActivation = weightedSum + config.bias;
  const output = activate(preActivation, config.activationType);
  if (output === null) return null;
  return { inputs: [...config.inputs], weights: [...config.weights], weightedTerms, weightedSum, bias: config.bias, preActivation, activationType: config.activationType, output };
}
export interface FunctionPoint { z: number; y: number }
export function sampleActivation(type: ActivationType, min: number, max: number, count = 401): FunctionPoint[] | null {
  if (!isActivationType(type)) return null;
  return sampleDomain(min, max, count)?.map(z => ({ z, y: activate(z, type)! })) ?? null;
}
