export interface Experiment { id: string; title: string; description: string; tag: string; symbol: string; path?: string; entryLabel?: string }
export const experiments: Experiment[] = [
  { id: 'neuron', title: '可视化神经元实验室', description: '调整 1～5 个输入与权重，逐步观察加权求和、偏置与激活，并完成三道挑战。', tag: '已开放 · 前向传播', symbol: 'Σ', path: '/laboratory/neuron', entryLabel: '进入神经元实验室' },
  { id: 'activation', title: '激活函数与梯度实验室', description: '比较非线性、移动切线，并用 1～8 层标量复合函数观察链式法则与梯度幅度。', tag: '已开放 · 导数与链式法则', symbol: 'f′', path: '/laboratory/activation', entryLabel: '进入激活与梯度实验室' },
  { id: 'neural-network', title: '多层神经网络与训练实验室', description: '搭建小型 MLP，检查矩阵与手写反向传播，用真实 SGD 训练 XOR 并观察决策边界。', tag: '已开放 · MLP 与 SGD', symbol: '∇', path: '/laboratory/neural-network', entryLabel: '进入神经网络训练实验室' },
  { id: 'language-representation', title: 'Token、Embedding 与位置编码实验室', description: '比较分词、编辑词向量、计算相似度，并逐步构造真实的 Transformer 输入矩阵。', tag: '已开放 · 语言表示', symbol: '文', path: '/laboratory/language-representation', entryLabel: '进入语言表示实验室' },
  { id: 'vector', title: '向量的几何世界', description: '计划通过拖动向量，观察方向、长度与点积的关系。', tag: '数学直觉', symbol: '↗' },
  { id: 'attention', title: 'Attention 核心机制实验室', description: '编辑 Q/K/V 投影，逐步计算真实注意力，观察多头、Value 贡献和因果 Mask。', tag: '已开放 · Attention', symbol: '◎', path: '/laboratory/attention', entryLabel: '进入 Attention 实验室' },
  { id: 'position', title: '位置编码探索', description: '计划可视化不同位置的编码，理解顺序如何进入模型。', tag: '序列表示', symbol: '∿' },
  { id: 'transformer', title: 'Transformer 完整架构实验室', description: '搭建 Post-LN Encoder–Decoder，追踪 FFN、残差、LayerNorm、Cross-Attention 与真实输出概率。', tag: '已开放 · 完整前向传播', symbol: '⇄', path: '/laboratory/transformer', entryLabel: '进入 Transformer 架构实验室' },
  { id: 'transformer-training', title: 'Mini Transformer 训练与推理', description: '连接本地 PyTorch，训练 Copy/Reverse，检查指标、Checkpoint 与逐 Token 生成。', tag: '本地后端 · 训练与推理', symbol: 'θ', path: '/laboratory/transformer-training', entryLabel: '进入 Mini Transformer 训练实验室' },
];
export function experimentPath(id: string, fromLessonId?: string): string {
  const experiment = experiments.find(item => item.id === id);
  return experiment?.path ? `${experiment.path}${fromLessonId ? '?from=' + encodeURIComponent(fromLessonId) : ''}` : `/laboratory?experiment=${encodeURIComponent(id)}#experiment-preview`;
}
