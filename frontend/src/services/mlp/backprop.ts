import { activationDerivative } from '../activationMath.ts';
import type { ActivationType } from '../neuronMath.ts';
import { finite, matVec, outer, transpose, vectorShape } from './matrix.ts';
import { forwardNetwork, validateModel } from './network.ts';
import { isLossType, mseLoss, sigmoidBCELoss, validateTarget } from './loss.ts';
import type { BatchBackward, LayerGradient, LossType, MLPModel, SampleBackward, TrainingSample } from './types.ts';
/** Training convention only. T05 continues to report the mathematical derivative at ReLU(0) as undefined. */
export function trainingActivationSlope(z: number, activation: ActivationType): number {
  const slope = activationDerivative(z, activation);
  if (!slope) throw new RangeError('无法计算激活导数。');
  return slope.status === 'undefined' ? 0 : slope.value;
}
export function assertLossCompatible(model: MLPModel, loss: LossType): void {
  validateModel(model);
  if (!isLossType(loss)) throw new RangeError('损失函数无效。');
  if (loss === 'bce' && model.layers.at(-1)!.activation !== 'sigmoid') throw new RangeError('BCE 训练必须使用单输出 Sigmoid。');
}
export function backwardSample(model: MLPModel, sample: TrainingSample, loss: LossType): SampleBackward {
  assertLossCompatible(model, loss);
  if (!sample || typeof sample.id !== 'string' || !sample.id) throw new RangeError('训练样本无效。');
  validateTarget(sample.target);
  const forward = forwardNetwork(model, sample.input), last = model.layers.length - 1;
  const prediction = forward.prediction;
  const outputLoss = loss === 'bce' ? sigmoidBCELoss(forward.layers[last].z[0], sample.target) : null;
  const mse = loss === 'mse' ? mseLoss(prediction, sample.target) : null;
  const outputGradient = outputLoss ? outputLoss.outputGradient : mse!.gradient;
  let delta = [outputLoss ? outputLoss.delta : finite(mse!.gradient * trainingActivationSlope(forward.layers[last].z[0], model.layers[last].activation))];
  let upstream = outputGradient === null ? null : [outputGradient];
  const layers: LayerGradient[] = Array(model.layers.length);
  for (let index = last; index >= 0; index--) {
    const trace = forward.layers[index];
    layers[index] = { delta: [...delta], upstream: upstream ? [...upstream] : null, weights: outer(delta, trace.input), biases: [...delta] };
    if (index > 0) {
      upstream = matVec(transpose(model.layers[index].weights), delta);
      delta = upstream.map((value, row) => finite(value * trainingActivationSlope(forward.layers[index - 1].z[row], model.layers[index - 1].activation)));
    }
  }
  return { sample: { ...sample, input: [...sample.input] }, forward, loss: outputLoss ? outputLoss.value : mse!.value, outputGradient, layers };
}
export function backwardBatch(model: MLPModel, samples: readonly TrainingSample[], loss: LossType): BatchBackward {
  assertLossCompatible(model, loss);
  if (!Array.isArray(samples) || samples.length < 1 || samples.length > 64) throw new RangeError('批量样本数应为 1～64。');
  const traces = samples.map(sample => backwardSample(model, sample, loss));
  const gradients = model.layers.map((layer, index) => ({
    weights: layer.weights.map((row, r) => row.map((_, c) => finite(traces.reduce((sum, trace) => finite(sum + trace.layers[index].weights[r][c] / samples.length), 0)))),
    biases: layer.biases.map((_, r) => finite(traces.reduce((sum, trace) => finite(sum + trace.layers[index].biases[r] / samples.length), 0))),
  }));
  const norm = finite(Math.hypot(...gradients.flatMap(layer => [...layer.weights.flat(), ...layer.biases])));
  return { loss: finite(traces.reduce((sum, trace) => finite(sum + trace.loss / samples.length), 0)), gradients, samples: traces, norm };
}
export function datasetLoss(model: MLPModel, samples: readonly TrainingSample[], loss: LossType): number {
  assertLossCompatible(model, loss);
  if (!Array.isArray(samples) || samples.length < 1 || samples.length > 64) throw new RangeError('数据集样本数应为 1～64。');
  return finite(samples.reduce((sum, sample) => {
    validateTarget(sample.target); const trace = forwardNetwork(model, sample.input);
    const value = loss === 'bce' ? sigmoidBCELoss(trace.layers.at(-1)!.z[0], sample.target).value : mseLoss(trace.prediction, sample.target).value;
    return finite(sum + value / samples.length);
  }, 0));
}
export function applySGD(model: MLPModel, gradients: BatchBackward['gradients'], learningRate: number): MLPModel {
  validateModel(model); finite(learningRate);
  if (learningRate <= 0 || learningRate > 10 || !Array.isArray(gradients) || gradients.length !== model.layers.length) throw new RangeError('SGD 学习率或梯度层数无效。');
  const layers = model.layers.map((layer, index) => {
    const gradient = gradients[index];
    if (!gradient || !Array.isArray(gradient.weights) || vectorShape(gradient.biases) !== layer.biases.length || gradient.weights.length !== layer.weights.length || !gradient.weights.every((row, r) => vectorShape(row) === layer.weights[r].length)) throw new RangeError('梯度形状与参数不一致。');
    return { ...layer, weights: layer.weights.map((row, r) => row.map((value, c) => finite(value - finite(learningRate * gradient.weights[r][c])))), biases: layer.biases.map((value, r) => finite(value - finite(learningRate * gradient.biases[r]))) };
  });
  return { inputSize: model.inputSize, layers };
}

