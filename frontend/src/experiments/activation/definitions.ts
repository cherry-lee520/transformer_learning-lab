import type { ActivationType } from '../../services/neuronMath.ts';
import type { ChainConfig } from '../../services/gradientChain.ts';
export const ACTIVATION_DETAILS = {
  linear: { derivativeLatex: "f'(x)=1", nonlinear: '否', range: '所有实数', behavior: '正负输入原样输出。', saturation: '没有饱和区域。', kink: '处处可导。', gradient: '局部导数为 1；链式梯度仍会被权重放大、缩小或变号。' },
  relu: { derivativeLatex: "f'(x)=\\begin{cases}0&x<0\\\\1&x>0\\\\\\text{undefined}&x=0\\end{cases}", nonlinear: '是', range: '[0, +∞)', behavior: '负输入输出 0，正输入保持原值。', saturation: '负半轴为常数，局部导数为 0；正半轴不饱和。', kink: 'x = 0 的左右斜率分别为 0、1，数学导数不存在。', gradient: '负半轴可截断该路径的梯度；正半轴的梯度仍受权重影响。' },
  sigmoid: { derivativeLatex: "f'(x)=f(x)(1-f(x))", nonlinear: '是', range: '(0, 1)', behavior: '负输入趋向 0，正输入趋向 1，零点输出 0.5。', saturation: '|x| 很大时趋向端点，导数接近 0；没有统一的饱和分界值。', kink: '处处可导。', gradient: '导数最大为 0.25；梯度连乘还取决于权重，不代表必然梯度消失。' },
  tanh: { derivativeLatex: "f'(x)=1-\\tanh^2(x)", nonlinear: '是', range: '(-1, 1)', behavior: '负输入输出为负，正输入输出为正，零点输出 0。', saturation: '|x| 很大时趋向 ±1，导数接近 0。', kink: '处处可导。', gradient: '零点导数为 1；饱和区局部斜率小，权重会共同影响整体梯度。' },
} satisfies Record<ActivationType, { derivativeLatex: string; nonlinear: string; range: string; behavior: string; saturation: string; kink: string; gradient: string }>;
function repeated(activationType: ActivationType, input: number, weight: number, bias: number): ChainConfig {
  return { activationType, input, layers: Array.from({ length: 4 }, () => ({ weight, bias })) };
}
export const CHAIN_PRESETS = [
  { id: 'sigmoid-saturation', label: 'A · Sigmoid 饱和', config: repeated('sigmoid', 0.5, 1, 6), explanation: '本例权重均为 1，z 位于 Sigmoid 饱和区，小局部导数连续相乘使幅度衰减。' },
  { id: 'tanh-saturation', label: 'B · Tanh 饱和', config: repeated('tanh', 1, 1, 3), explanation: '本例 z 远离零点，Tanh 导数较小，连乘后的梯度幅度下降。' },
  { id: 'relu-zero', label: 'C · ReLU 负半轴', config: repeated('relu', 1, 1, -4), explanation: '本例每层 z 都为负，ReLU 导数为 0；出现真正的零因子时该路径梯度为 0。' },
  { id: 'linear-control', label: 'D · Linear 对照', config: repeated('linear', 1, 1, 0), explanation: '本例局部导数与权重均为 1，因此梯度保持 1。改变权重后仍可能衰减、增大或变号。' },
  { id: 'sigmoid-balanced', label: '补充 · Sigmoid 与权重', config: repeated('sigmoid', 0.5, 4, -2), explanation: '每层 z = 0，f′ = 0.25，w = 4，局部因子为 1；这是 Sigmoid 并非总会让梯度衰减的对照。' },
] as const;
