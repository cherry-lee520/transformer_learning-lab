import { computeNeuron, isActivationType } from './neuronMath.ts';
import type { ActivationType } from './neuronMath.ts';
import { activationDerivative } from './activationMath.ts';
import type { DerivativeResult } from './activationMath.ts';
export interface ScalarLayer { weight: number; bias: number }
export interface ChainConfig { input: number; activationType: ActivationType; layers: readonly ScalarLayer[] }
export type GradientState =
  | { status: 'defined'; value: number; sign: -1 | 0 | 1; magnitude: number; logMagnitude: number | null; underflow: boolean }
  | { status: 'undefined'; reason: 'local-derivative-undefined' };
export interface ChainStep { index: number; input: number; weight: number; bias: number; z: number; h: number; derivative: DerivativeResult; factor: GradientState; gradient: GradientState }
export interface ChainResult { input: number; output: number; steps: ChainStep[]; gradient: GradientState }
const unavailable: GradientState = { status: 'undefined', reason: 'local-derivative-undefined' };
export const unitGradient = (): GradientState => ({ status: 'defined', value: 1, sign: 1, magnitude: 1, logMagnitude: 0, underflow: false });
function localFactor(weight: number, derivative: DerivativeResult): GradientState | null {
  if (derivative.status === 'undefined') return unavailable;
  if (weight === 0 || derivative.logMagnitude === null) return { status: 'defined', value: 0, magnitude: 0, sign: 0, logMagnitude: null, underflow: false };
  const logMagnitude = Math.log10(Math.abs(weight)) + derivative.logMagnitude;
  const sign = weight < 0 ? -1 : 1;
  const value = derivative.underflow ? sign * Math.pow(10, logMagnitude) : weight * derivative.value;
  if (!Number.isFinite(value) || !Number.isFinite(logMagnitude)) return null;
  return { status: 'defined', value, sign, magnitude: Math.abs(value), logMagnitude, underflow: value === 0 };
}
function multiply(a: GradientState, b: GradientState): GradientState | null {
  // Missing local derivatives invalidate this chain-rule argument; this does NOT prove the composite is nondifferentiable.
  if (a.status === 'undefined' || b.status === 'undefined') return unavailable;
  if (a.sign === 0 || b.sign === 0) return { status: 'defined', value: 0, magnitude: 0, sign: 0, logMagnitude: null, underflow: false };
  const sign = a.sign === b.sign ? 1 : -1;
  const logMagnitude = a.logMagnitude! + b.logMagnitude!;
  // Retained logarithms let a later large factor bring an underflowed prefix back into range.
  const value = a.underflow || b.underflow ? sign * Math.pow(10, logMagnitude) : a.value * b.value;
  if (!Number.isFinite(value) || !Number.isFinite(logMagnitude)) return null;
  return { status: 'defined', value, sign, magnitude: Math.abs(value), logMagnitude, underflow: value === 0 };
}
export function computeGradientChain(config: ChainConfig): ChainResult | null {
  if (!config || !Number.isFinite(config.input) || !isActivationType(config.activationType) || !Array.isArray(config.layers) || config.layers.length < 1 || config.layers.length > 8) return null;
  let h = config.input, gradient = unitGradient();
  const steps: ChainStep[] = [];
  for (const [index, layer] of config.layers.entries()) {
    if (!layer || !Number.isFinite(layer.weight) || !Number.isFinite(layer.bias)) return null;
    const result = computeNeuron({ inputs: [h], weights: [layer.weight], bias: layer.bias, activationType: config.activationType });
    if (!result) return null;
    const derivative = activationDerivative(result.preActivation, config.activationType)!;
    const factor = localFactor(layer.weight, derivative);
    if (!factor) return null;
    const next = multiply(gradient, factor);
    if (!next) return null;
    gradient = next;
    steps.push({ index: index + 1, input: h, weight: layer.weight, bias: layer.bias, z: result.preActivation, h: result.output, derivative, factor, gradient });
    h = result.output;
  }
  return { input: config.input, output: h, steps, gradient };
}
