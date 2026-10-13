import type { NeuronParameters } from '../lessons/contentTypes.ts';
import { parseBoundedNumber } from './parameters.ts';
import { computeNeuron } from './neuronMath.ts';
export const PARAMETER_RANGE = { min: -10, max: 10, step: 0.1 } as const;
export const DEFAULT_NEURON: NeuronParameters = { x: 2, w: 3, b: 1 };
export function parseParameter(raw: string | number): number | null {
  return parseBoundedNumber(raw, PARAMETER_RANGE.min, PARAMETER_RANGE.max);
}
export function calculateNeuron(parameters: NeuronParameters): { weighted: number; y: number } | null {
  if (['x', 'w', 'b'].some(key => typeof parameters[key as keyof NeuronParameters] !== 'number' || parseParameter(parameters[key as keyof NeuronParameters]) === null)) return null;
  const result = computeNeuron({ inputs: [parameters.x], weights: [parameters.w], bias: parameters.b, activationType: 'linear' });
  return result ? { weighted: result.weightedSum, y: result.output } : null;
}
export const formatNumber = (value: number) => Number(value.toFixed(6)).toString();
