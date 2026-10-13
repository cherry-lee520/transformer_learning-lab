import type { ActivationType } from '../neuronMath.ts';
export type Vector = number[];
export type Matrix = number[][];
export interface LayerParameters { weights: Matrix; biases: Vector; activation: ActivationType }
export interface MLPModel { inputSize: number; layers: LayerParameters[] }
export interface NetworkArchitecture { inputSize: number; hiddenSizes: number[]; hiddenActivation: ActivationType; outputActivation: ActivationType }
export type LossType = 'mse' | 'bce';
export interface TrainingSample { id: string; input: Vector; target: number }
export interface LayerForward {
  input: Vector; weightsShape: [number, number]; biasShape: [number, 1];
  z: Vector; a: Vector;
}
export interface ForwardTrace { input: Vector; layers: LayerForward[]; prediction: number }
export interface LayerGradient { delta: Vector; upstream: Vector | null; weights: Matrix; biases: Vector }
export interface SampleBackward { sample: TrainingSample; forward: ForwardTrace; loss: number; outputGradient: number | null; layers: LayerGradient[] }
export interface BatchBackward { loss: number; gradients: { weights: Matrix; biases: Vector }[]; samples: SampleBackward[]; norm: number }
export interface TrainingSettings { loss: LossType; learningRate: number; batchSize: number; maxSteps: number }
export interface LossRecord { step: number; epoch: number; loss: number }
export interface TrainingSnapshot {
  step: number; epoch: number; learningRate: number; lossType: LossType;
  before: MLPModel; after: MLPModel; backward: BatchBackward; datasetLossAfter: number; updateNorm: number;
}
export interface TrainingSession {
  model: MLPModel; step: number; examplesSeen: number; epoch: number; loss: number;
  history: LossRecord[]; snapshots: TrainingSnapshot[];
}

