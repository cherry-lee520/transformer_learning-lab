import { forwardNetwork, validateModel } from './network.ts';
import type { MLPModel } from './types.ts';
export interface BoundaryPoint { x: number; y: number; probability: number }
export interface BoundaryGrid { size: number; min: number; max: number; points: BoundaryPoint[] }
export function sampleDecisionBoundary(model: MLPModel, size = 25, min = -0.25, max = 1.25): BoundaryGrid | null {
  validateModel(model);
  if (model.inputSize !== 2 || model.layers.at(-1)!.activation !== 'sigmoid') return null;
  if (!Number.isSafeInteger(size) || size < 2 || size > 41 || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(max - min) || min >= max) throw new RangeError('决策边界采样设置无效。');
  const points = Array.from({ length: size * size }, (_, index) => {
    const x = min + ((index % size) + 0.5) / size * (max - min), y = min + (Math.floor(index / size) + 0.5) / size * (max - min);
    return { x, y, probability: forwardNetwork(model, [x, y]).prediction };
  });
  return { size, min, max, points };
}

