import { activate, isActivationType } from '../neuronMath.ts';
import { finite, matVec, matrixShape, vectorShape } from './matrix.ts';
import type { ForwardTrace, LayerForward, LayerParameters, MLPModel, NetworkArchitecture, TrainingSample, Vector } from './types.ts';
export const XOR_DATA: readonly TrainingSample[] = [
  { id: 'xor-00', input: [0, 0], target: 0 }, { id: 'xor-01', input: [0, 1], target: 1 },
  { id: 'xor-10', input: [1, 0], target: 1 }, { id: 'xor-11', input: [1, 1], target: 0 },
];
export const DEFAULT_ARCHITECTURE: NetworkArchitecture = { inputSize: 2, hiddenSizes: [4], hiddenActivation: 'tanh', outputActivation: 'sigmoid' };
export const DEFAULT_SEED = 42;
export function validateModel(model: MLPModel): void {
  if (!model || !Number.isSafeInteger(model.inputSize) || model.inputSize < 1 || model.inputSize > 8 || !Array.isArray(model.layers) || model.layers.length < 1 || model.layers.length > 3) throw new RangeError('网络应有 1～8 个输入及 1～3 个计算层。');
  let previous = model.inputSize;
  for (const layer of model.layers) {
    if (!layer || !isActivationType(layer.activation)) throw new RangeError('激活函数无效。');
    const [rows, columns] = matrixShape(layer.weights);
    if (columns !== previous || vectorShape(layer.biases) !== rows) throw new RangeError('权重/偏置形状与相邻层不匹配。');
    previous = rows;
  }
  if (previous !== 1) throw new RangeError('本版输出层必须有 1 个神经元。');
}
export function initializeNetwork(architecture: NetworkArchitecture, seed: number): MLPModel {
  if (!architecture || !Number.isSafeInteger(architecture.inputSize) || architecture.inputSize < 1 || architecture.inputSize > 8 || !Array.isArray(architecture.hiddenSizes) || architecture.hiddenSizes.length < 1 || architecture.hiddenSizes.length > 2 || !architecture.hiddenSizes.every(size => Number.isSafeInteger(size) && size >= 1 && size <= 8) || !isActivationType(architecture.hiddenActivation) || !isActivationType(architecture.outputActivation)) throw new RangeError('隐藏层应为 1～2 层，每层 1～8 个神经元。');
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('随机种子应为 0～4294967295 的整数。');
  let state = seed >>> 0, previous = architecture.inputSize;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  const sizes = [...architecture.hiddenSizes, 1];
  const layers = sizes.map((size, index) => {
    const limit = Math.sqrt(6 / (previous + size));
    const weights = Array.from({ length: size }, () => Array.from({ length: previous }, () => (2 * random() - 1) * limit));
    previous = size;
    return { weights, biases: Array(size).fill(0) as number[], activation: index === sizes.length - 1 ? architecture.outputActivation : architecture.hiddenActivation };
  });
  const model = { inputSize: architecture.inputSize, layers }; validateModel(model); return model;
}
export function forwardLayer(layer: LayerParameters, input: Vector): LayerForward {
  const shape = matrixShape(layer.weights);
  if (!isActivationType(layer.activation) || vectorShape(layer.biases) !== shape[0]) throw new RangeError('计算层参数无效。');
  const weighted = matVec(layer.weights, input);
  const z = weighted.map((value, index) => finite(value + layer.biases[index]));
  const a = z.map(value => { const result = activate(value, layer.activation); if (result === null) throw new RangeError('激活计算无效。'); return result; });
  return { input: [...input], weightsShape: shape, biasShape: [shape[0], 1], z, a };
}
export function forwardNetwork(model: MLPModel, input: Vector): ForwardTrace {
  validateModel(model);
  if (vectorShape(input) !== model.inputSize) throw new RangeError('输入列向量维度与网络不匹配。');
  let a = [...input];
  const layers = model.layers.map(layer => { const trace = forwardLayer(layer, a); a = trace.a; return trace; });
  return { input: [...input], layers, prediction: a[0] };
}
export function cloneModel(model: MLPModel): MLPModel {
  return { inputSize: model.inputSize, layers: model.layers.map(layer => ({ ...layer, weights: layer.weights.map(row => [...row]), biases: [...layer.biases] })) };
}

