import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculateNeuron, DEFAULT_NEURON, parseParameter } from '../../frontend/src/services/neuron.ts';
import { parseBoundedNumber } from '../../frontend/src/services/parameters.ts';
import { judgeAnswer } from '../../frontend/src/services/quiz.ts';
import { neuronLesson } from '../../frontend/src/lessons/contents/neuron.ts';
import { LessonRenderer } from '../../frontend/src/components/lesson/LessonRenderer.tsx';
import { QuizProvider } from '../../frontend/src/store/QuizProvider.tsx';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { createElement: h } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const katex = require('katex');
const render = content => renderToStaticMarkup(h(MemoryRouter, {}, h(QuizProvider, {}, h(LessonRenderer, { content, lessonId: 'neuron-forward' }))));
const quiz = kind => neuronLesson.blocks.find(block => block.type === 'quiz' && block.question.kind === kind).question;

test('神经元默认值与正、负、零权重使用真实公式', () => {
  assert.deepEqual(calculateNeuron(DEFAULT_NEURON), { weighted: 6, y: 7 });
  assert.deepEqual(calculateNeuron({ x: 2, w: -3, b: 1 }), { weighted: -6, y: -5 });
  assert.deepEqual(calculateNeuron({ x: 10, w: 0, b: -2 }), { weighted: 0, y: -2 });
  assert.deepEqual(calculateNeuron({ x: -10, w: 10, b: -10 }), { weighted: -100, y: -110 });
});
test('参数边界有效；空值、非有限数字与越界不会进入计算', () => {
  for (const value of [-10, 10, 0, ' 2.5 ']) assert.notEqual(parseParameter(value), null);
  for (const value of ['', ' ', 'oops', NaN, Infinity, -Infinity, '1e309', 10.01, -10.01]) assert.equal(parseParameter(value), null);
  for (const x of [NaN, Infinity, 11, '2']) assert.equal(calculateNeuron({ x, w: 3, b: 1 }), null);
  assert.equal(parseBoundedNumber('3', 0, 5), 3);
  assert.equal(parseBoundedNumber('3', 5, 0), null);
  assert.equal(parseBoundedNumber('3', 0, Infinity), null);
});
test('单选判定、空答案与不存在的选项', () => {
  assert.deepEqual(judgeAnswer(quiz('single'), 'influence'), { valid: true, correct: true });
  assert.deepEqual(judgeAnswer(quiz('single'), 'fixed-output'), { valid: true, correct: false });
  assert.equal(judgeAnswer(quiz('single'), '').valid, false);
  assert.equal(judgeAnswer(quiz('single'), 'missing').valid, false);
});
test('多选按集合比较：顺序无关、漏选、多选与无效选项', () => {
  assert.deepEqual(judgeAnswer(quiz('multiple'), ['layers', 'parallel']), { valid: true, correct: true });
  for (const answer of [['parallel'], ['layers', 'parallel', 'linear-only']]) assert.deepEqual(judgeAnswer(quiz('multiple'), answer), { valid: true, correct: false });
  assert.equal(judgeAnswer(quiz('multiple'), []).valid, false);
  assert.equal(judgeAnswer(quiz('multiple'), ['missing']).valid, false);
});
test('数值题使用绝对误差容限，处理浮点边界与非法输入', () => {
  for (const answer of ['5', '5.0000005', '4.999999', '5.000001']) assert.deepEqual(judgeAnswer(quiz('numeric'), answer), { valid: true, correct: true });
  assert.deepEqual(judgeAnswer(quiz('numeric'), '5.0001'), { valid: true, correct: false });
  for (const answer of ['', ' ', 'NaN', 'Infinity', '1e309', 'text']) assert.equal(judgeAnswer(quiz('numeric'), answer).valid, false);
  assert.equal(judgeAnswer({ ...quiz('numeric'), answer: 0.3, tolerance: 0 }, String(0.1 + 0.2)).correct, true);
});
test('实际渲染器按照顺序输出标题、图像、代码、交互和三道测验', () => {
  const markup = render(neuronLesson);
  assert.ok(markup.indexOf('这一节，你将学会什么') < markup.indexOf('先从一个生活类比开始'));
  assert.match(markup, /神经元输出/);
  assert.match(markup, /language-python/);
  assert.match(markup, /token keyword/);
  assert.match(markup, /neuron-flow.svg/);
  assert.equal((markup.match(/class="quiz-card"/g) ?? []).length, 3);
});
test('实际渲染器对未知、损坏或重复块安全降级，正文字符串被转义', () => {
  const content = { ...neuronLesson, blocks: [{ id: 'heading', type: 'heading', level: 2, title: '继续阅读' }, { id: 'unknown', type: 'future' }, { id: 'bad', type: 'quiz', question: null }, { id: 'escaped', type: 'text', paragraphs: [['<img src=x onerror=alert(1)>']] }] };
  const markup = render(content);
  assert.match(markup, /继续阅读/);
  assert.equal((markup.match(/此内容块暂不可用/g) ?? []).length, 2);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(markup, /<img src=x/);
});
test('KaTeX 实际排版覆盖矩阵、分数、上下标、希腊字母与多行公式', () => {
  const formulae = neuronLesson.blocks.filter(block => block.type === 'formula').map(block => block.latex);
  formulae.push(String.raw`\operatorname{Attention}(Q,K,V)=\operatorname{softmax}\!\left(\frac{QK^\mathsf{T}}{\sqrt{d_k}}\right)V`, String.raw`\alpha_i^{2}+\frac{1}{2}`);
  for (const latex of formulae) {
    const markup = katex.renderToString(latex, { throwOnError: true, trust: false, displayMode: true });
    assert.match(markup, /class="katex"/);
    assert.match(markup, /<math/);
  }
});
