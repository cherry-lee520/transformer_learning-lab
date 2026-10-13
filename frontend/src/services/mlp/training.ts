import { backwardBatch, applySGD, datasetLoss } from './backprop.ts';
import { initializeNetwork, XOR_DATA, DEFAULT_ARCHITECTURE, DEFAULT_SEED } from './network.ts';
import { finite } from './matrix.ts';
import { isLossType } from './loss.ts';
import type { NetworkArchitecture, TrainingSettings, TrainingSession, MLPModel, LossType, TrainingSample } from './types.ts';
export const DEFAULT_TRAINING: TrainingSettings = { loss: 'bce', learningRate: 0.5, batchSize: 4, maxSteps: 2000 };
export const HISTORY_LIMIT = 300, SNAPSHOT_LIMIT = 12;
export function validateSettings(settings: TrainingSettings): void {
  if (!settings || !isLossType(settings.loss) || !Number.isFinite(settings.learningRate) || settings.learningRate < 0.001 || settings.learningRate > 2 || ![1, 2, 4].includes(settings.batchSize) || !Number.isSafeInteger(settings.maxSteps) || settings.maxSteps < 1 || settings.maxSteps > 5000) throw new RangeError('训练设置无效：学习率 0.001～2，批量 1/2/4，最多 5000 次更新。');
}
export function sessionForModel(model: MLPModel, loss: LossType, data: readonly TrainingSample[] = XOR_DATA): TrainingSession {
  const value = datasetLoss(model, data, loss);
  return { model, step: 0, examplesSeen: 0, epoch: 0, loss: value, history: [{ step: 0, epoch: 0, loss: value }], snapshots: [] };
}
export function createSession(architecture: NetworkArchitecture = DEFAULT_ARCHITECTURE, seed = DEFAULT_SEED, loss: LossType = 'bce'): TrainingSession {
  return sessionForModel(initializeNetwork(architecture, seed), loss);
}
export function advanceTraining(session: TrainingSession, settings: TrainingSettings, data: readonly TrainingSample[] = XOR_DATA): TrainingSession {
  validateSettings(settings);
  if (session.step >= settings.maxSteps) return session;
  if (!Array.isArray(data) || !data.length || data.length > 64) throw new RangeError('训练数据集无效。');
  const batch = Array.from({ length: settings.batchSize }, (_, index) => data[(session.examplesSeen + index) % data.length]);
  const backward = backwardBatch(session.model, batch, settings.loss);
  const model = applySGD(session.model, backward.gradients, settings.learningRate);
  const loss = datasetLoss(model, data, settings.loss), step = session.step + 1, examplesSeen = session.examplesSeen + batch.length, epoch = Math.floor(examplesSeen / data.length);
  const snapshot = { step, epoch, learningRate: settings.learningRate, lossType: settings.loss, before: session.model, after: model, backward, datasetLossAfter: loss, updateNorm: finite(settings.learningRate * backward.norm) };
  return { model, step, examplesSeen, epoch, loss, history: [...session.history, { step, epoch, loss }].slice(-HISTORY_LIMIT), snapshots: [...session.snapshots, snapshot].slice(-SNAPSHOT_LIMIT) };
}
export function clearLossHistory(session: TrainingSession): TrainingSession {
  return { ...session, history: [{ step: session.step, epoch: session.epoch, loss: session.loss }] };
}

