import { activate } from './neuronMath.ts';
import { sampleDomain } from './plotSampling.ts';
export interface AffineParameters { w1: number; b1: number; w2: number; b2: number }
export interface AffineResult { hidden: number; linearOutput: number; equivalentWeight: number; equivalentBias: number; equivalentOutput: number; reluHidden: number; reluOutput: number }
export function computeAffinePair(x: number, parameters: AffineParameters): AffineResult | null {
  if (!parameters || ![x, parameters.w1, parameters.b1, parameters.w2, parameters.b2].every(Number.isFinite)) return null;
  const { w1, b1, w2, b2 } = parameters;
  const hidden = w1 * x + b1, equivalentWeight = w2 * w1, equivalentBias = w2 * b1 + b2;
  const linearOutput = w2 * hidden + b2, equivalentOutput = equivalentWeight * x + equivalentBias;
  const reluHidden = activate(hidden, 'relu');
  if (reluHidden === null) return null;
  const reluOutput = w2 * reluHidden + b2;
  const result = { hidden, equivalentWeight, equivalentBias, linearOutput, equivalentOutput, reluHidden, reluOutput };
  return Object.values(result).every(Number.isFinite) ? result : null;
}
export function sampleAffinePair(parameters: AffineParameters, min = -6, max = 6, count = 401) {
  const domain = sampleDomain(min, max, count);
  if (!domain) return null;
  const samples = domain.map(x => ({ x, result: computeAffinePair(x, parameters) }));
  return samples.some(sample => !sample.result) ? null : samples as { x: number; result: AffineResult }[];
}
