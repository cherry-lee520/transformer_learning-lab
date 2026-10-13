import type { LessonContent } from './types.ts';
import { neuronLesson } from './contents/neuron.ts';
import { networkTrainingLesson, backpropTrainingLesson } from './contents/networkTraining.ts';
import { tokenEmbeddingLesson, positionEncodingLesson } from './contents/languageRepresentation.ts';
import { attentionMathLesson, selfAttentionLesson, multiHeadLesson } from './contents/attention.ts';
import { ffnNormLesson, encoderLesson, decoderArchitectureLesson, transformerLesson } from './contents/transformer.ts';
// Content resources evolve independently from catalog metadata and stable lesson IDs.
export const lessonContents: Record<string, LessonContent> = {
  'intro-network': { intro: '这一节将从生活中的预测问题出发，认识神经网络的输入、输出与学习。', objectives: ['认识神经网络想解决的问题', '区分模型预测与模型训练'] },
  'intro-vectors': { intro: '这一节将用位置和方向建立向量直觉，为后续理解矩阵运算做准备。', objectives: ['认识向量与矩阵的表达', '建立数字与几何之间的联系'] },
  'neuron-forward': neuronLesson,
  'loss-training': networkTrainingLesson,
  'gradients-backprop': backpropTrainingLesson,
  'token-embedding': tokenEmbeddingLesson,
  'attention-math': attentionMathLesson,
  'qkv-attention': selfAttentionLesson,
  'multi-head': multiHeadLesson,
  'position-encoding': positionEncodingLesson,
  'ffn-residual-norm': ffnNormLesson,
  encoder: encoderLesson,
  'decoder-mask': decoderArchitectureLesson,
  'full-transformer': transformerLesson,
  'paper-reading': { intro: '这一节将提供论文精读的路线，并介绍后续如何阅读实验与对比结果。', objectives: ['定位论文中的关键部分', '了解实验分析关注的问题'] },
  'mini-transformer': { intro: '这一节仅预留 Mini Transformer 实践路线，当前不包含代码执行或模型训练。', objectives: ['认识未来实现的基本步骤', '了解数据、训练与验证的联系'] },
};
