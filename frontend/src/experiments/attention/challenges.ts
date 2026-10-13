import type { QuizBlock } from '../../lessons/contentTypes.ts';
import { causalMask, concatHeads, productElement, rowSoftmax } from '../../services/attention/math.ts';
import { matrixProduct } from '../../services/tensorMath.ts';
const weights = rowSoftmax([0, Math.log(3)]);
export const ATTENTION_CHALLENGES: QuizBlock[] = [
  { id: 'at-challenge-q', type: 'quiz', question: { kind: 'numeric', prompt: '挑战 1 · X 第 0 行=[1,2]，WQ=[[2,0],[1,1]]。Q[0,0] 是多少？（对应 A）', answer: productElement([[1,2]], [[2,0],[1,1]], 0, 0).value, tolerance: 1e-8, explanation: '取 X 第 0 行与 WQ 第 0 列点积：1×2+2×1=4。Q=XWQ，不是逐元素乘法。' } },
  { id: 'at-challenge-score', type: 'quiz', question: { kind: 'numeric', prompt: '挑战 2 · Query=[1,2]，Key=[3,4]。未缩放匹配分数是多少？（对应 B）', answer: productElement([[1,2]], [[3],[4]], 0, 0).value, tolerance: 1e-8, explanation: '未缩放分数是点积：1×3+2×4=11；除以 √dk 是后续独立步骤。' } },
  { id: 'at-challenge-softmax', type: 'quiz', question: { kind: 'numeric', prompt: '挑战 3 · 一行分数 [0, ln(3)]，第二项 Softmax 概率是多少？（对应 C）', answer: weights[1], tolerance: 1e-6, explanation: 'exp(0)=1、exp(ln3)=3，因此第二项为 3/(1+3)=0.75。实际实现先减行最大值，结果等价且稳定。' } },
  { id: 'at-challenge-mask', type: 'quiz', question: { kind: 'multiple', prompt: '挑战 4 · 3 个 Token，Query 索引为 1。Causal Mask 允许哪些 Key？（对应 F）', options: [0,1,2].map(j => ({ id: 'key-'+j, text: 'Key '+j })), correctOptionIds: causalMask(3)[1].flatMap((allowed,j) => allowed ? ['key-'+j] : []), explanation: '只允许 j≤i，所以 Key 0 和 Key 1 可见，Key 2 是未来位置。被屏蔽项在 Softmax 中严格得到 0。' } },
  { id: 'at-challenge-output', type: 'quiz', question: { kind: 'numeric', prompt: '挑战 5 · 权重=[0.25,0.75]，V=[[2,0],[6,4]]。输出第 0 个元素是多少？（对应 D）', answer: matrixProduct([[0.25,0.75]], [[2,0],[6,4]])[0][0], tolerance: 1e-8, explanation: '对 Value 第 0 列加权求和：0.25×2+0.75×6=5。输出向量是 [5,3]。' } },
  { id: 'at-challenge-concat', type: 'quiz', question: { kind: 'single', prompt: '挑战 6 · 两个 Head 各输出 3×2，按列 Concat 后是什么形状？（对应 E）', options: [{id:'shape-3x4',text:'3×4'},{id:'shape-6x2',text:'6×2'},{id:'shape-3x2',text:'3×2'}], correctOptionId: concatHeads([[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]]])[0].length === 4 ? 'shape-3x4' : 'shape-3x2', explanation: 'Token 行数仍为 3，每行连接两个 2 维输出，得到 4 列；之后再右乘 WO。' } },
];
