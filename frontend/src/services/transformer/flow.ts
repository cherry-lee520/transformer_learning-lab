import { tensorShape } from '../tensorMath.ts';
import { transpose } from '../attention/math.ts';
import type { Matrix, NormResult, FFNResult, MultiResult } from './math.ts';
import type { TransformerResult } from './model.ts';
export const TRANSFORMER_FORMULAS = {
  attention: '\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\left(\\frac{QK^{\\mathsf T}}{\\sqrt{d_k}}\\right)V',
  normStatistics: '\\mu_i=\\frac1d\\sum_j r_{ij},\\quad \\sigma_i^2=\\frac1d\\sum_j(r_{ij}-\\mu_i)^2',
  normOutput: 'o_{ij}=\\gamma_j\\frac{r_{ij}-\\mu_i}{\\sqrt{\\sigma_i^2+\\epsilon}}+\\beta_j',
  probabilities: 'Z=HE^{\\mathsf T},\\qquad P_i=\\mathrm{softmax}(Z_i)',
};
export interface TensorStep {
  id: string; title: string; lane: 'encoder' | 'decoder'; layer?: number;
  inputs: { name: string; values: Matrix }[]; output: Matrix; dependencies: string[];
  formula: string; explanation: string; shape: [number, number];
  norm?: NormResult; ffn?: FFNResult; attention?: MultiResult;
}
export function tensorFlow(result: TransformerResult): TensorStep[] {
  const steps: TensorStep[] = [];
  const add = (value: Omit<TensorStep, 'shape'>) => { steps.push({ ...value, shape: tensorShape(value.output) }); return value.id; };
  const input = (name: string, values: Matrix) => ({ name, values });
  const embedding = (type: 'source' | 'target', lane: TensorStep['lane']) => {
    const value = type === 'source' ? result.source : result.target, title = type === 'source' ? 'Source' : 'Target';
    const ids = value.ids.map(id => [id]);
    add({ id: type + '-tokens', title: title + ' Tokens / IDs', lane, inputs: [], output: ids, dependencies: [], formula: 't_i\\mapsto\\mathrm{ID}(t_i)', explanation: '空格分隔的教学 Token。未知词映射到 UNK；位置按真实序列顺序，未加入未来目标。' });
    add({ id: type + '-embedding', title: title + ' Embedding', lane, inputs: [input('Token IDs', ids), input('共享 Embedding E', transpose(result.projection))], output: value.vectors, dependencies: [type + '-tokens'], formula: 'E[\\mathrm{ID}]', explanation: '源和目标查询同一份可编辑 E，每行是一个 Token 的未训练向量。' });
    add({ id: type + '-scaled', title: title + ' Embedding 缩放', lane, inputs: [input('Embedding', value.vectors)], output: value.scaled, dependencies: [type + '-embedding'], formula: 'E[\\mathrm{ID}]\\sqrt{d_{model}}', explanation: '按论文乘以根号 d_model；只在 T09 接入层缩放，不改变 T07。' });
    add({ id: type + '-pe', title: title + ' Positional Encoding', lane, inputs: [input('Token IDs（只取长度）', ids)], output: value.pe, dependencies: [type + '-tokens'], formula: '\\begin{aligned}PE_{pos,2i}&=\\sin(pos/10000^{2i/d_{model}})\\\\PE_{pos,2i+1}&=\\cos(pos/10000^{2i/d_{model}})\\end{aligned}', explanation: '按位置计算 sin/cos。第 i 行只依赖 i，不依赖未来 Token 内容或整个序列的统计量。' });
    return add({ id: type + '-input', title: title + ' Embedding + PE', lane, inputs: [input('Scaled Embedding', value.scaled), input('PE', value.pe)], output: value.output, dependencies: [type + '-scaled', type + '-pe'], formula: 'X=\\sqrt{d_{model}}E[\\mathrm{ID}]+PE', explanation: '相同形状逐元素相加；本实验 Dropout=0。' });
  };
  const norm = (id: string, title: string, lane: TensorStep['lane'], layer: number, value: NormResult, dependencies: string[]) => add({ id, title, lane, layer, inputs: [input('残差输入 X', value.skip), input('Sublayer(X)', value.sublayer)], output: value.output, dependencies, formula: '\\mathrm{LN}(X+\\mathrm{Sublayer}(X))', explanation: '原始 Post-LN：先相加，再逐 Token 特征归一化；gamma/beta 为该子层独立参数。', norm: value });
  const ffn = (id: string, title: string, lane: TensorStep['lane'], layer: number, value: FFNResult, dependency: string) => add({ id, title, lane, layer, inputs: [input('FFN 输入', value.input)], output: value.output, dependencies: [dependency], formula: '\\mathrm{ReLU}(XW_1+b_1)W_2+b_2', explanation: '同一层所有 Token 共享 W1/W2；中间宽度 d_ff，输出回到 d_model。该子层不直接混合 Token。', ffn: value });
  let previous = embedding('source', 'encoder');
  result.encoders.forEach((layer, i) => {
    const base = 'encoder-' + i, prefix = 'Encoder ' + (i + 1);
    const self = add({ id: base + '-self', title: prefix + ' Self-Attention', lane: 'encoder', layer: i, inputs: [input('Q/K/V 来源：该层输入', layer.input)], output: layer.self.output, dependencies: [previous], formula: '\\mathrm{MHA}(X,X,X)', explanation: 'Encoder 不使用因果 Mask；各头从同一输入独立投影。', attention: layer.self });
    const n1 = norm(base + '-norm1', prefix + ' Add & Norm 1', 'encoder', i, layer.norm1, [previous, self]);
    const feed = ffn(base + '-ffn', prefix + ' FFN', 'encoder', i, layer.ffn, n1);
    previous = norm(base + '-norm2', prefix + ' Add & Norm 2', 'encoder', i, layer.norm2, [n1, feed]);
  });
  const memory = add({ id: 'encoder-memory', title: 'Encoder Final Memory', lane: 'encoder', inputs: [input('最后 Encoder 输出', result.memory)], output: result.memory, dependencies: [previous], formula: 'M=\\mathrm{EncoderStack}(X)', explanation: '真实编码器堆叠输出。所有 Decoder 层 Cross-Attention 使用这一份最终 Memory。' });
  previous = embedding('target', 'decoder');
  result.decoders.forEach((layer, i) => {
    const base = 'decoder-' + i, prefix = 'Decoder ' + (i + 1);
    const self = add({ id: base + '-self', title: prefix + ' Masked Self-Attention', lane: 'decoder', layer: i, inputs: [input('Q/K/V 来源：Decoder 输入', layer.input)], output: layer.self.output, dependencies: [previous], formula: '\\mathrm{MaskedMHA}(H,H,H)', explanation: '仅 Key j≤Query i 可见。未来权重在 Softmax 计算中严格为 0。', attention: layer.self });
    const n1 = norm(base + '-norm1', prefix + ' Add & Norm 1', 'decoder', i, layer.norm1, [previous, self]);
    const cross = add({ id: base + '-cross', title: prefix + ' Cross-Attention', lane: 'decoder', layer: i, inputs: [input('Q 来源：Masked Add & Norm', layer.norm1.output), input('K/V 来源：最终 Encoder Memory', result.memory)], output: layer.cross.output, dependencies: [n1, memory], formula: '\\mathrm{MHA}(H,M,M)', explanation: 'Q 来自当前目标隐藏状态，K/V 来自最终 Memory。权重为 Target Length×Source Length，不用 Causal Mask。', attention: layer.cross });
    const n2 = norm(base + '-norm2', prefix + ' Add & Norm 2', 'decoder', i, layer.norm2, [n1, cross]);
    const feed = ffn(base + '-ffn', prefix + ' FFN', 'decoder', i, layer.ffn, n2);
    previous = norm(base + '-norm3', prefix + ' Add & Norm 3', 'decoder', i, layer.norm3, [n2, feed]);
  });
  const output = add({ id: 'decoder-output', title: 'Decoder Final Output', lane: 'decoder', inputs: [input('最后 Decoder 输出', result.output)], output: result.output, dependencies: [previous], formula: 'H=\\mathrm{DecoderStack}(T,M)', explanation: '每个位置预测它之后的 Token；不是读取尚未知的下一个 Token。' });
  const logits = add({ id: 'logits', title: 'Output Projection / Logits', lane: 'decoder', inputs: [input('Decoder Output', result.output), input('共享输出投影 Eᵀ', result.projection)], output: result.logits, dependencies: [output], formula: 'Z=HE^{\\mathsf T}', explanation: '投影即时由共享 E 转置得到，不保存一份可能过期的复制参数。未加额外输出偏置。' });
  add({ id: 'probabilities', title: 'Softmax / Next Token Probabilities', lane: 'decoder', inputs: [input('Logits', result.logits)], output: result.probabilities, dependencies: [logits], formula: 'P_{ij}=\\exp(Z_{ij}-\\max Z_i)/\\sum_k\\exp(Z_{ik}-\\max Z_i)', explanation: '逐位置在词表维度归一化。随机模型的概率并不表示已经学会翻译；最后一个前缀位置用于下一个 Token 的分布。' });
  return steps;
}
