import { activate } from '../neuronMath.ts';
import { finite } from './matrix.ts';
import type { LossType } from './types.ts';
export const isLossType = (value: unknown): value is LossType => value === 'mse' || value === 'bce';
export function validateTarget(target: number): void {
  finite(target); if (target < 0 || target > 1) throw new RangeError('二分类标签应在 0～1 内。');
}
export function mseLoss(prediction: number, target: number): { value: number; gradient: number } {
  finite(prediction); finite(target);
  const difference = finite(prediction - target);
  return { value: finite(difference * difference), gradient: finite(2 * difference) };
}
const softplus = (z: number) => Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
/** BCE evaluated from Sigmoid logits. No clipping, so fused gradient matches the same objective. */
export function sigmoidBCELoss(z: number, target: number): { value: number; delta: number; outputGradient: number | null } {
  finite(z); validateTarget(target);
  const prediction = activate(z, 'sigmoid')!, complement = activate(-z, 'sigmoid')!;
  const value = finite(target * softplus(-z) + (1 - target) * softplus(z));
  const delta = finite((1 - target) * prediction - target * complement);
  const negative = target === 0 ? 0 : prediction === 0 ? null : -target / prediction;
  const positive = target === 1 ? 0 : complement === 0 ? null : (1 - target) / complement;
  const candidate = negative === null || positive === null ? null : negative + positive;
  return { value, delta, outputGradient: candidate !== null && Number.isFinite(candidate) ? candidate : null };
}
/** For the teaching probability curve. Wrong endpoints have an infinite limit, represented as missing. */
export function probabilityBCE(prediction: number, target: number): number | null {
  finite(prediction); validateTarget(target);
  if (prediction < 0 || prediction > 1) throw new RangeError('BCE 概率必须在 0～1 内。');
  if (prediction === 0) return target === 0 ? 0 : null;
  if (prediction === 1) return target === 1 ? 0 : null;
  return finite(-target * Math.log(prediction) - (1 - target) * Math.log1p(-prediction));
}

