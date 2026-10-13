import { backwardBatch, datasetLoss, trainingActivationSlope } from './backprop.ts';
import { cloneModel } from './network.ts';
import type { LossType, MLPModel, TrainingSample } from './types.ts';
export interface GradientCheckEntry { parameter: string; analytic: number; numerical: number; absoluteError: number; relativeError: number; passed: boolean }
export interface GradientCheckResult { status: 'checked' | 'skipped'; reason?: string; entries: GradientCheckEntry[]; maxAbsoluteError: number; maxRelativeError: number; passed: boolean }
export function checkGradients(model: MLPModel, samples: readonly TrainingSample[], loss: LossType, epsilon = 1e-5, tolerance = 1e-6): GradientCheckResult {
  if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon > 0.01 || !Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError('梯度检查的步长或容差无效。');
  const backward = backwardBatch(model, samples, loss);
  // ReLU kinks require one-sided analysis, not an ordinary central-difference assertion.
  const kink = (traces: typeof backward.samples) => traces.some(trace => trace.forward.layers.some((layer, index) => model.layers[index].activation === 'relu' && layer.z.some(z => Math.abs(z) < 1e-10)));
  if (kink(backward.samples)) return { status: 'skipped', reason: '样本命中 ReLU 零点；训练使用次梯度 0，普通中心差分不适用。', entries: [], maxAbsoluteError: 0, maxRelativeError: 0, passed: false };
  const entries: GradientCheckEntry[] = [];
  for (let index = 0; index < model.layers.length; index++) {
    const layer = model.layers[index];
    const parameters = [...layer.weights.flatMap((row, r) => row.map((_, c) => ({ r, c }))), ...layer.biases.map((_, r) => ({ r, c: -1 }))];
    for (const { r, c } of parameters) {
      const plus = cloneModel(model), minus = cloneModel(model);
      const change = (copy: MLPModel, amount: number) => { if (c < 0) copy.layers[index].biases[r] += amount; else copy.layers[index].weights[r][c] += amount; };
      change(plus, epsilon); change(minus, -epsilon);
      // A perturbation that crosses a ReLU region is also unsuitable for this smooth-point check.
      if (model.layers.some(item => item.activation === 'relu')) {
        const p = backwardBatch(plus, samples, loss), m = backwardBatch(minus, samples, loss);
        if (p.samples.some((sample, s) => sample.forward.layers.some((trace, l) => model.layers[l].activation === 'relu' && trace.z.some((z, n) => trainingActivationSlope(z, 'relu') !== trainingActivationSlope(m.samples[s].forward.layers[l].z[n], 'relu'))))) return { status: 'skipped', reason: '扰动跨越 ReLU 零点，请换用光滑点或减小检查步长。', entries: [], maxAbsoluteError: 0, maxRelativeError: 0, passed: false };
      }
      const numerical = (datasetLoss(plus, samples, loss) - datasetLoss(minus, samples, loss)) / (2 * epsilon);
      const analytic = c < 0 ? backward.gradients[index].biases[r] : backward.gradients[index].weights[r][c];
      const absoluteError = Math.abs(analytic - numerical), relativeError = absoluteError / Math.max(1e-8, Math.abs(analytic) + Math.abs(numerical));
      entries.push({ parameter: (c < 0 ? 'b' : 'W') + '[' + (index + 1) + '][' + (r + 1) + (c < 0 ? '' : ',' + (c + 1)) + ']', analytic, numerical, absoluteError, relativeError, passed: absoluteError <= tolerance * Math.max(1, Math.abs(analytic), Math.abs(numerical)) });
    }
  }
  return { status: 'checked', entries, maxAbsoluteError: Math.max(...entries.map(entry => entry.absoluteError)), maxRelativeError: Math.max(...entries.map(entry => entry.relativeError)), passed: entries.every(entry => entry.passed) };
}

