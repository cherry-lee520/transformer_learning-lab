import type { StructuredLessonContent } from '../contentTypes';
export const activationGuide: StructuredLessonContent = {
  kind: 'structured', version: 1, lessonId: 'gradients-backprop',
  intro: '先从一个输入附近的变化率开始，再把各段的局部变化连接起来。这部分提供激活函数与标量链式法则实验引导。',
  objectives: ['区分函数值与局部导数', '认识 ReLU 零点不可导与 Sigmoid/Tanh 饱和区', '用权重和局部导数的连乘观察输入梯度'],
  blocks: [
    { id: 'ag-guide-heading', type: 'heading', level: 2, title: '从曲线的斜率开始' },
    { id: 'ag-guide-text', type: 'text', paragraphs: [['函数值回答“输出是多少”，导数回答“输入变化一点，输出在附近怎样变化”。激活函数的形状与斜率会影响复合函数的变化率。']] },
    { id: 'ag-guide-formula', type: 'formula', latex: '\\frac{dy}{dx}=\\prod_{i=1}^{L}[w_i f\\prime(z_i)]', label: '在各层可导时，输入梯度等于权重与激活导数因子的连乘' },
    { id: 'ag-guide-boundary', type: 'callout', tone: 'warning', title: '先明确可导条件', text: 'ReLU 在零点的左右斜率不同，数学导数未定义。实验不会用优化器的次梯度约定代替数学导数；遇到未定义的局部导数时，连乘公式暂不能判定整体导数。' },
    { id: 'ag-guide-try-heading', type: 'heading', level: 2, title: '带着问题进入实验' },
    { id: 'ag-guide-try', type: 'text', paragraphs: [['先比较两次仿射变换与一个等效变换，再加入 ReLU。随后移动输入观察切线，并比较饱和、零梯度与 Linear 对照预设。']], bullets: [['为什么没有非线性时，两次仿射变换能够合并？'], ['Sigmoid 的局部导数较小，权重能否改变连乘结果？'], ['负梯度与小幅度梯度有什么区别？']] },
    { id: 'ag-guide-scope', type: 'callout', tone: 'info', title: '标量实验的边界', text: 'T05 激活与梯度实验只计算标量复合函数输出对输入的导数，不计算损失或参数梯度。下方“学习关联”保留该入口；本节后续内容再连接 T06 的网络训练。挑战结果不会自动完成课时。' },
  ],
};
