import type { NeuronConfig } from '../../services/neuronMath.ts';
export const NEURON_EXAMPLES: readonly { id: string; title: string; config: NeuronConfig }[] = [
  { id: 'first-neuron', title: '单输入 · 从 7 开始', config: { inputs: [2], weights: [3], bias: 1, activationType: 'linear' } },
  { id: 'negative-relu', title: '负值经过 ReLU', config: { inputs: [2], weights: [-3], bias: 1, activationType: 'relu' } },
  { id: 'multiple-inputs', title: '三个输入共同计算', config: { inputs: [2, -1, 0.5], weights: [3, 2, -4], bias: 1, activationType: 'linear' } },
  { id: 'sigmoid-center', title: 'Sigmoid 的中心', config: { inputs: [2, 1], weights: [1, -2], bias: 0, activationType: 'sigmoid' } },
];
export const cloneConfig = (config: NeuronConfig): NeuronConfig => ({ ...config, inputs: [...config.inputs], weights: [...config.weights] });
export function resizeInputs(config: NeuronConfig, count: number): NeuronConfig | null {
  if (!Number.isSafeInteger(count) || count < 1 || count > 5) return null;
  return { ...config, inputs: Array.from({ length: count }, (_, index) => config.inputs[index] ?? 1), weights: Array.from({ length: count }, (_, index) => config.weights[index] ?? 1) };
}
/** Seeded pseudorandom teaching parameters; reproducible and independent of Math.random. */
export function randomConfig(seed: number, count: number): NeuronConfig | null {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isSafeInteger(count) || count < 1 || count > 5) return null;
  let state = seed >>> 0;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return (Math.floor(state / 0x100000000 * 81) - 40) / 10; };
  return { inputs: Array.from({ length: count }, next), weights: Array.from({ length: count }, next), bias: next(), activationType: 'linear' };
}
