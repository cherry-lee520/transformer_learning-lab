import { activate, isActivationType, sampleActivation } from './neuronMath.ts';
import type { ActivationType } from './neuronMath.ts';
export type DerivativeResult =
  | { status: 'defined'; value: number; logMagnitude: number | null; underflow: boolean }
  | { status: 'undefined'; reason: 'relu-zero'; leftSlope: 0; rightSlope: 1 };
export function activationDerivative(x: number, type: ActivationType): DerivativeResult | null {
  if (!Number.isFinite(x) || !isActivationType(type)) return null;
  if (type === 'relu' && x === 0) return { status: 'undefined', reason: 'relu-zero', leftSlope: 0, rightSlope: 1 };
  if (type === 'linear' || type === 'relu') {
    const value = type === 'linear' || x > 0 ? 1 : 0;
    return { status: 'defined', value, logMagnitude: value === 0 ? null : 0, underflow: false };
  }
  const absolute = Math.abs(x);
  // Equivalent to f(1-f) and 1-tanh², without cancellation after f rounds to an endpoint.
  const q = Math.exp(type === 'sigmoid' ? -absolute : -2 * absolute);
  // Keep the factor 4 inside exp in the extreme Tanh tail, where q alone may underflow first.
  const numerator = type === 'sigmoid' ? q : q > 1e-300 ? 4 * q : Math.exp(Math.log(4) - 2 * absolute);
  const value = numerator / ((1 + q) * (1 + q));
  const logMagnitude = type === 'sigmoid'
    ? -absolute / Math.LN10 - 2 * Math.log1p(q) / Math.LN10
    : Math.log10(4) - 2 * (absolute / Math.LN10) - 2 * Math.log1p(q) / Math.LN10;
  return { status: 'defined', value, logMagnitude, underflow: value === 0 };
}
export interface ActivationEvaluation { x: number; value: number; derivative: DerivativeResult }
export function evaluateActivation(x: number, type: ActivationType): ActivationEvaluation | null {
  const value = activate(x, type), derivative = activationDerivative(x, type);
  return value === null || derivative === null ? null : { x, value, derivative };
}
export function evaluateActivationVector(values: readonly number[], type: ActivationType): ActivationEvaluation[] | null {
  if (!Array.isArray(values) || values.length < 1 || values.length > 2001 || !isActivationType(type)) return null;
  const results: ActivationEvaluation[] = [];
  for (const value of values) {
    const result = evaluateActivation(value, type);
    if (!result) return null;
    results.push(result);
  }
  return results;
}
export function sampleActivationDetails(type: ActivationType, min: number, max: number, count = 401): ActivationEvaluation[] | null {
  const samples = sampleActivation(type, min, max, count);
  return samples ? evaluateActivationVector(samples.map(point => point.z), type) : null;
}
export function tangentValue(point: ActivationEvaluation, x: number): number | null {
  if (!Number.isFinite(x) || point.derivative.status !== 'defined') return null;
  const value = point.value + point.derivative.value * (x - point.x);
  return Number.isFinite(value) ? value : null;
}
