import type { Course } from './types.ts';
export const COURSE_VERSION = '2026.10.t09';
// IDs are permanent identifiers; display order and titles can evolve independently.
export const courses: Course[] = [
  {
    id: 'course-foundations', title: '数学与神经网络', description: '从数学直觉走向神经网络的学习过程。', order: 1, icon: 'brain',
    chapters: [
      {
        id: 'chapter-first-steps', courseId: 'course-foundations', title: '数学与神经网络入门', description: '认识网络、向量与前向传播。', order: 1,
        lessons: [
          { id: 'start', chapterId: 'chapter-first-steps', title: '从这里开始：认识神经网络', description: '建立直觉，认识输入、输出与学习的过程。', order: 1, estimatedMinutes: 15, contentKey: 'intro-network' },
          { id: 'vectors', chapterId: 'chapter-first-steps', title: '向量与矩阵的直觉', description: '用几何语言，理解模型中的数字与变换。', order: 2, estimatedMinutes: 20, contentKey: 'intro-vectors', prerequisites: ['start'], relatedExperimentId: 'vector' },
          { id: 'neuron-forward', chapterId: 'chapter-first-steps', title: '神经元是什么？从一个数学公式开始', description: '用公式、代码与参数小演示理解输入、权重、偏置和激活。', order: 3, estimatedMinutes: 25, contentKey: 'neuron-forward', prerequisites: ['vectors'], relatedExperimentId: 'neuron' },
        ],
      },
      {
        id: 'chapter-training', courseId: 'course-foundations', title: '模型如何学习', description: '认识损失、梯度与参数更新。', order: 2,
        lessons: [
          { id: 'loss-training', chapterId: 'chapter-training', title: '损失函数与模型训练', description: '连接多层感知机、矩阵前向、损失与 SGD，用真实 XOR 训练建立直觉。', order: 1, estimatedMinutes: 30, contentKey: 'loss-training', prerequisites: ['neuron-forward'], relatedExperimentId: 'neural-network' },
          { id: 'gradients-backprop', chapterId: 'chapter-training', title: '梯度与反向传播', description: '先通过激活函数、局部导数与链式法则实验建立梯度直觉。', order: 2, estimatedMinutes: 25, contentKey: 'gradients-backprop', prerequisites: ['loss-training'], relatedExperimentId: 'activation' },
        ],
      },
    ],
  },
  {
    id: 'course-language', title: '语言的数字表示', description: '把文本转换为模型能够处理的表示。', order: 2, icon: 'languages',
    chapters: [{
      id: 'chapter-tokens', courseId: 'course-language', title: 'Token 与 Embedding', description: '从文字到词元，再到词向量。', order: 1,
      lessons: [{ id: 'embedding', chapterId: 'chapter-tokens', title: 'Token 与词向量：把文字变成向量', description: '认识分词、词元 ID 与 Embedding 的联系。', order: 1, estimatedMinutes: 20, contentKey: 'token-embedding', prerequisites: ['gradients-backprop'], relatedPaperSection: '3.4', relatedExperimentId: 'language-representation' }],
    }],
  },
  {
    id: 'course-attention', title: '理解注意力机制', description: '从相似度计算到多头注意力与位置。', order: 3, icon: 'focus',
    chapters: [
      {
        id: 'chapter-self-attention', courseId: 'course-attention', title: '从相似度到 Self-Attention', description: '连接点积、概率权重与 Q、K、V。', order: 1,
        lessons: [
          { id: 'attention-math', chapterId: 'chapter-self-attention', title: 'Attention 数学基础', description: '认识点积、缩放与 Softmax 的角色。', order: 1, estimatedMinutes: 25, contentKey: 'attention-math', prerequisites: ['embedding'], relatedPaperSection: '3.2.1', relatedExperimentId: 'attention' },
          { id: 'attention', chapterId: 'chapter-self-attention', title: 'Q、K、V 与 Self-Attention', description: '理解查询、键和值如何共同聚合信息。', order: 2, estimatedMinutes: 25, contentKey: 'qkv-attention', prerequisites: ['attention-math'], relatedPaperSection: '3.2.1', relatedExperimentId: 'attention' },
        ],
      },
      {
        id: 'chapter-multi-position', courseId: 'course-attention', title: '多个视角与序列位置', description: '认识多头机制与位置信息。', order: 2,
        lessons: [
          { id: 'multi-head', chapterId: 'chapter-multi-position', title: 'Multi-Head Attention', description: '理解多个注意力头如何提供不同视角。', order: 1, estimatedMinutes: 25, contentKey: 'multi-head', prerequisites: ['attention'], relatedPaperSection: '3.2.2', relatedExperimentId: 'attention' },
          { id: 'position-encoding', chapterId: 'chapter-multi-position', title: '位置编码', description: '认识序列顺序如何进入向量表示。', order: 2, estimatedMinutes: 20, contentKey: 'position-encoding', prerequisites: ['multi-head'], relatedPaperSection: '3.5', relatedExperimentId: 'language-representation' },
        ],
      },
    ],
  },
  {
    id: 'course-architecture', title: '组装 Transformer', description: '从基本组件到完整 Encoder–Decoder 架构。', order: 4, icon: 'layers',
    chapters: [
      {
        id: 'chapter-blocks', courseId: 'course-architecture', title: '网络中的辅助组件', description: '理解变换、信息传递与稳定性。', order: 1,
        lessons: [{ id: 'ffn-residual-norm', chapterId: 'chapter-blocks', title: 'FFN、残差连接与归一化', description: '认识前馈网络、残差路径和归一化。', order: 1, estimatedMinutes: 25, contentKey: 'ffn-residual-norm', prerequisites: ['position-encoding'], relatedPaperSection: '3.1 / 3.3', relatedExperimentId: 'transformer' }],
      },
      {
        id: 'chapter-encoder-decoder', courseId: 'course-architecture', title: 'Encoder 与 Decoder', description: '逐步连接各个组件与信息流。', order: 2,
        lessons: [
          { id: 'encoder', chapterId: 'chapter-encoder-decoder', title: 'Encoder', description: '理解编码器如何形成上下文表示。', order: 1, estimatedMinutes: 25, contentKey: 'encoder', prerequisites: ['ffn-residual-norm'], relatedPaperSection: '3.1', relatedExperimentId: 'transformer' },
          { id: 'decoder-mask', chapterId: 'chapter-encoder-decoder', title: 'Decoder 与 Mask', description: '连接遮罩注意力、Cross-Attention、三个 Post-LN 与目标右移。', order: 2, estimatedMinutes: 25, contentKey: 'decoder-mask', prerequisites: ['encoder'], relatedPaperSection: '3.1 / 3.2.3', relatedExperimentId: 'attention' },
          { id: 'transformer', chapterId: 'chapter-encoder-decoder', title: '完整 Transformer', description: '连接编码器、解码器与输出预测。', order: 3, estimatedMinutes: 30, contentKey: 'full-transformer', prerequisites: ['decoder-mask'], relatedPaperSection: '3', relatedExperimentId: 'transformer' },
        ],
      },
    ],
  },
  {
    id: 'course-practice', title: '论文与实现路线', description: '为论文精读和 Mini Transformer 实践做准备。', order: 5, icon: 'code',
    chapters: [
      { id: 'chapter-paper', courseId: 'course-practice', title: '回到原始论文', description: '连接论文结构与实验分析。', order: 1,
        lessons: [{ id: 'paper-reading', chapterId: 'chapter-paper', title: '论文精读与实验分析', description: '了解论文阅读顺序与实验对比的目的。', order: 1, estimatedMinutes: 30, contentKey: 'paper-reading', prerequisites: ['transformer'], relatedPaperSection: '1–7' }],
      },
      { id: 'chapter-mini', courseId: 'course-practice', title: 'Mini Transformer 实践', description: '规划简化实现与训练的步骤。', order: 2,
        lessons: [{ id: 'implementation', chapterId: 'chapter-mini', title: 'Mini Transformer 实践', description: '了解未来简化实现、数据准备和训练的路线。', order: 1, estimatedMinutes: 40, contentKey: 'mini-transformer', prerequisites: ['paper-reading'] }],
      },
    ],
  },
];
