import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { activate, sampleActivation, ACTIVATIONS } from '../../frontend/src/services/neuronMath.ts';
import { activationDerivative, evaluateActivation, evaluateActivationVector, sampleActivationDetails, tangentValue } from '../../frontend/src/services/activationMath.ts';
import { computeAffinePair, sampleAffinePair } from '../../frontend/src/services/affineMath.ts';
import { computeGradientChain } from '../../frontend/src/services/gradientChain.ts';
import { sampleDomain, curvePath } from '../../frontend/src/services/plotSampling.ts';
import { formatMathNumber, latexNumber } from '../../frontend/src/services/mathDisplay.ts';
import { CHAIN_PRESETS, ACTIVATION_DETAILS } from '../../frontend/src/experiments/activation/definitions.ts';
import { ACTIVATION_CHALLENGES } from '../../frontend/src/experiments/activation/challenges.ts';
import { judgeAnswer } from '../../frontend/src/services/quiz.ts';
import { GradientPlot } from '../../frontend/src/visualizations/activation/GradientPlot.tsx';
import { CartesianPlot } from '../../frontend/src/visualizations/activation/CartesianPlot.tsx';
import { lessonContents } from '../../frontend/src/lessons/content.ts';
import { courses } from '../../frontend/src/lessons/catalog.ts';
import { validateContentLinks } from '../../frontend/src/lessons/contentValidation.ts';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { createElement: h } = require('react'), { renderToStaticMarkup } = require('react-dom/server'), katex = require('katex');
const slope = (x, type) => { const derivative = activationDerivative(x, type); assert.equal(derivative.status, 'defined'); return derivative.value; };
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);

test('Linear 值与导数，ReLU 正负半轴和零点独立未定义状态', () => {
  for (const x of [-10, 0, 10]) { assert.equal(activate(x, 'linear'), x); assert.equal(slope(x, 'linear'), 1); }
  assert.equal(activate(-2, 'relu'), 0); assert.equal(slope(-2, 'relu'), 0);
  assert.equal(activate(2, 'relu'), 2); assert.equal(slope(2, 'relu'), 1);
  assert.deepEqual(activationDerivative(0, 'relu'), { status: 'undefined', reason: 'relu-zero', leftSlope: 0, rightSlope: 1 });
  assert.equal(activationDerivative(-0, 'relu').status, 'undefined');
});
test('Sigmoid/Tanh 的函数与导数精度、对称性和饱和点', () => {
  close(activate(1, 'sigmoid'), 0.7310585786300049, 1e-14); close(slope(1, 'sigmoid'), 0.19661193324148185, 1e-14);
  assert.equal(slope(0, 'sigmoid'), 0.25);
  close(activate(1, 'tanh'), 0.7615941559557649, 1e-14); close(slope(1, 'tanh'), 0.41997434161402614, 1e-14);
  assert.equal(slope(0, 'tanh'), 1);
  for (const type of ['sigmoid', 'tanh']) close(slope(-3, type), slope(3, type), 1e-14);
});
test('光滑点的解析导数通过中心差分验证，明确不以此证明 ReLU 零点可导', () => {
  const epsilon = 1e-5;
  for (const type of Object.keys(ACTIVATIONS)) for (const x of [-3, -0.5, 0.4, 2]) {
    const numeric = (activate(x + epsilon, type) - activate(x - epsilon, type)) / (2 * epsilon);
    close(slope(x, type), numeric, 1e-8);
  }
  assert.equal(activationDerivative(0, 'relu').status, 'undefined');
});
test('极端输入数值稳定，舍入饱和值不提前抹掉小导数；下溢有明确标识', () => {
  for (const type of ['sigmoid', 'tanh']) for (const x of [-Number.MAX_VALUE, -1000, 1000, Number.MAX_VALUE]) {
    const result = evaluateActivation(x, type);
    assert.ok(Number.isFinite(result.value)); assert.ok(Number.isFinite(result.derivative.value)); assert.ok(Number.isFinite(result.derivative.logMagnitude));
    assert.equal(result.derivative.underflow, true);
  }
  assert.equal(activate(40, 'sigmoid'), 1); assert.ok(slope(40, 'sigmoid') > 0);
  assert.equal(activate(20, 'tanh'), 1); assert.ok(slope(20, 'tanh') > 0);
  assert.equal(slope(-1000, 'sigmoid'), 0);
  assert.ok(slope(373, 'tanh') > 0); // The numerator remains representable even if exp(-746) alone is not.
});
test('非法输入、类型、向量边界与数据不变性', () => {
  for (const bad of [NaN, Infinity, -Infinity, '2', undefined]) {
    assert.equal(activationDerivative(bad, 'sigmoid'), null); assert.equal(evaluateActivation(bad, 'linear'), null);
  }
  assert.equal(evaluateActivation(1, 'unknown'), null);
  const values = [-2, 0, 2], before = [...values], evaluated = evaluateActivationVector(values, 'relu');
  assert.deepEqual(evaluated.map(item => item.value), [0, 0, 2]); assert.equal(evaluated[1].derivative.status, 'undefined'); assert.deepEqual(values, before);
  for (const bad of [null, [], [1, NaN], Array(2002).fill(0)]) assert.equal(evaluateActivationVector(bad, 'tanh'), null);
});
test('采样复用 T04 函数值，导数采样正确且不可导点不连线', () => {
  for (const type of Object.keys(ACTIVATIONS)) {
    const values = sampleActivation(type, -6, 6, 481), details = sampleActivationDetails(type, -6, 6, 481);
    assert.deepEqual(details.map(point => ({ z: point.x, y: point.value })), values);
    for (const point of details) assert.deepEqual(point.derivative, activationDerivative(point.x, type));
  }
  const samples = sampleActivationDetails('relu', -1, 1, 5);
  const path = curvePath(samples.map(point => ({ x: point.x, y: point.derivative.status === 'defined' ? point.derivative.value : null })), x => x, y => y);
  assert.equal((path.match(/M/g) ?? []).length, 2);
  assert.equal(sampleActivationDetails('unknown', -1, 1), null);
  assert.equal(sampleDomain(-Infinity, 1), null); assert.equal(sampleDomain(-1, 1, 1), null);
  assert.ok(sampleDomain(0, Number.MAX_VALUE, 5).every(Number.isFinite));
});
test('切线经过当前点，其斜率是实际导数；ReLU 零点不生成切线', () => {
  const point = evaluateActivation(1, 'sigmoid');
  close(tangentValue(point, 1), point.value);
  close(tangentValue(point, 1.1) - tangentValue(point, 0.9), 0.2 * slope(1, 'sigmoid'));
  assert.equal(tangentValue(evaluateActivation(0, 'relu'), 1), null);
  assert.equal(tangentValue(point, Infinity), null);
});
test('仿射层合并等价性覆盖正负零权重、偏置及样本区间', () => {
  for (const w1 of [-2, 0, 3]) for (const w2 of [-1, 0, 2]) for (const x of [-3, 0.1, 2]) {
    const result = computeAffinePair(x, { w1, b1: 1.2, w2, b2: -0.4 });
    close(result.linearOutput, result.equivalentOutput);
  }
  const points = sampleAffinePair({ w1: 2, b1: 1, w2: 1, b2: 0 });
  assert.equal(points.length, 401); assert.equal(points[0].x, -6); assert.equal(points.at(-1).x, 6);
});
test('加入 ReLU 的真实非线性计算，以及退化参数下可能仍等价', () => {
  const parameters = { w1: 2, b1: 1, w2: 1, b2: 0 };
  assert.equal(computeAffinePair(-2, parameters).linearOutput, -3);
  assert.equal(computeAffinePair(-2, parameters).reluOutput, 0);
  assert.equal(computeAffinePair(2, parameters).reluOutput, 5);
  const degenerate = computeAffinePair(-2, { ...parameters, w2: 0 });
  assert.equal(degenerate.linearOutput, degenerate.reluOutput);
  assert.equal(computeAffinePair(Infinity, parameters), null); assert.equal(computeAffinePair(2, { ...parameters, w1: 1e308 }), null);
});
test('标量多层链式法则结果与数值导数一致，正负符号与幅度分离', () => {
  const linear = computeGradientChain({ input: 2, activationType: 'linear', layers: [{ weight: -2, bias: 1 }, { weight: 3, bias: -2 }] });
  assert.equal(linear.output, -11); assert.equal(linear.gradient.value, -6); assert.equal(linear.gradient.magnitude, 6); assert.equal(linear.gradient.sign, -1); close(linear.gradient.logMagnitude, Math.log10(6));
  const config = { input: 0.2, activationType: 'tanh', layers: Array.from({ length: 3 }, () => ({ weight: 1.2, bias: -0.1 })) };
  const result = computeGradientChain(config), epsilon = 1e-5;
  const numeric = (computeGradientChain({ ...config, input: config.input + epsilon }).output - computeGradientChain({ ...config, input: config.input - epsilon }).output) / (2 * epsilon);
  close(result.gradient.value, numeric, 1e-8);
  assert.equal(result.steps.length, 3); close(result.steps[0].z, 0.14);
});
test('1～8 层边界、非法参数和溢出安全处理，不修改配置', () => {
  for (let count = 1; count <= 8; count++) {
    const config = { input: 2, activationType: 'linear', layers: Array.from({ length: count }, () => ({ weight: 2, bias: 0 })) }, before = structuredClone(config);
    assert.equal(computeGradientChain(config).gradient.value, 2 ** count); assert.deepEqual(config, before);
  }
  for (const config of [null, { input: 0, activationType: 'linear', layers: [] }, { input: 0, activationType: 'linear', layers: Array(9).fill({ weight: 1, bias: 0 }) }, { input: NaN, activationType: 'relu', layers: [{ weight: 1, bias: 0 }] }, { input: 1, activationType: 'linear', layers: [{ weight: Infinity, bias: 0 }] }, { input: 2, activationType: 'linear', layers: [{ weight: 1e308, bias: 0 }] }]) assert.equal(computeGradientChain(config), null);
});
test('精确零梯度不取 log(0)，ReLU 零点只报告链式条件不足', () => {
  const zero = computeGradientChain(CHAIN_PRESETS[2].config).gradient;
  assert.equal(zero.value, 0); assert.equal(zero.sign, 0); assert.equal(zero.logMagnitude, null); assert.equal(zero.underflow, false);
  // A constant composite can be differentiable although the local ReLU derivative is undefined.
  const unavailable = computeGradientChain({ input: 0, activationType: 'relu', layers: [{ weight: 0, bias: 0 }] });
  assert.equal(unavailable.output, 0); assert.equal(unavailable.gradient.status, 'undefined'); assert.equal(unavailable.gradient.reason, 'local-derivative-undefined');
});
test('连乘下溢保留符号和对数幅度，区分非零极小量与精确零', () => {
  const result = computeGradientChain({ input: 1, activationType: 'sigmoid', layers: Array.from({ length: 8 }, () => ({ weight: 1, bias: 100 })) });
  assert.equal(result.gradient.value, 0); assert.equal(result.gradient.underflow, true); assert.equal(result.gradient.sign, 1); assert.ok(result.gradient.logMagnitude < -300);
  const weightZero = computeGradientChain({ input: 1, activationType: 'sigmoid', layers: [{ weight: 0, bias: 1000 }] });
  assert.equal(weightZero.gradient.underflow, false); assert.equal(weightZero.gradient.logMagnitude, null);
  const recovered = computeGradientChain({ input: 0, activationType: 'linear', layers: [{ weight: 1e-200, bias: 0 }, { weight: 1e-200, bias: 0 }, { weight: -1e200, bias: 0 }] });
  assert.equal(recovered.steps[1].gradient.underflow, true);
  assert.equal(recovered.gradient.underflow, false); assert.equal(recovered.gradient.value, -1e-200);
  const amplified = computeGradientChain({ input: 0, activationType: 'sigmoid', layers: [{ weight: 1e300, bias: -800 }] });
  assert.equal(amplified.steps[0].derivative.underflow, true);
  assert.equal(amplified.gradient.underflow, false); assert.ok(amplified.gradient.value > 0);
});
test('五个预设可复现，饱和与权重补偿对照的梯度来自真实计算', () => {
  for (const preset of CHAIN_PRESETS) assert.ok(computeGradientChain(preset.config));
  const a = computeGradientChain(CHAIN_PRESETS[0].config), b = computeGradientChain(CHAIN_PRESETS[4].config);
  assert.ok(a.gradient.magnitude < 1e-10); close(b.gradient.value, 1); assert.ok(b.steps.every(step => step.z === 0 && step.derivative.value === 0.25 && step.factor.value === 1));
});
test('绘图使用实际梯度数值、绝对值、符号、对数和未定义状态', () => {
  const result = computeGradientChain({ input: 1, activationType: 'linear', layers: [{ weight: -2, bias: 0 }] });
  const markup = renderToStaticMarkup(h(GradientPlot, { result, logarithmic: true, active: 1, onSelect() {} }));
  assert.match(markup, /data-sign="negative" data-gradient="-2" data-magnitude="2"/);
  assert.ok(!markup.includes('NaN') && !markup.includes('Infinity'));
  const zero = renderToStaticMarkup(h(GradientPlot, { result: computeGradientChain(CHAIN_PRESETS[2].config), logarithmic: true, active: 1, onSelect() {} }));
  assert.match(zero, /data-sign="zero" data-gradient="0" data-magnitude="0" data-log="none"/);
  const plot = renderToStaticMarkup(h(CartesianPlot, { label: 'test', series: [{ id: 'test', label: 'f', color: '#000', points: [{ x: -1, y: 0 }, { x: 0, y: null }, { x: 1, y: 1 }] }] }));
  assert.match(plot, /data-series="test"/);
});
test('四道挑战答案使用共用判定、浮点误差与真实数学结果', () => {
  assert.equal(ACTIVATION_CHALLENGES.length, 4); assert.equal(new Set(ACTIVATION_CHALLENGES.map(item => item.id)).size, 4);
  const [output, derivative, saturation, chain] = ACTIVATION_CHALLENGES.map(block => block.question);
  assert.equal(judgeAnswer(output, '0').correct, true); assert.equal(judgeAnswer(output, '-2').correct, false);
  assert.equal(judgeAnswer(derivative, '0.2500001').correct, true); assert.equal(judgeAnswer(derivative, '0.5').correct, false); assert.equal(judgeAnswer(derivative, 'Infinity').valid, false);
  assert.equal(judgeAnswer(saturation, ['x-8', 'x--8']).correct, true); assert.equal(judgeAnswer(saturation, ['x-0']).correct, false);
  assert.equal(judgeAnswer(chain, 'a').correct, true); assert.equal(judgeAnswer(chain, 'b').correct, false);
});
test('小梯度使用科学记数显示且所有公式可由 KaTeX 排版', () => {
  assert.notEqual(formatMathNumber(1e-12), '0'); assert.equal(formatMathNumber(Infinity), '—'); assert.equal(formatMathNumber(0), '0');
  assert.equal(latexNumber(1e-12), '1.0000\\times10^{-12}');
  for (const type of Object.keys(ACTIVATION_DETAILS)) assert.doesNotThrow(() => katex.renderToString(ACTIVATION_DETAILS[type].derivativeLatex, { throwOnError: true }));
});
test('课程引导保留稳定 ID，正文/目录关联继续完整', () => {
  const lessons = courses.flatMap(course => course.chapters.flatMap(chapter => chapter.lessons));
  assert.deepEqual(validateContentLinks(lessons, lessonContents), []);
  assert.equal(lessonContents['gradients-backprop'].lessonId, 'gradients-backprop');
  assert.equal(lessons.length, 16); assert.equal(lessons.find(lesson => lesson.id === 'gradients-backprop').relatedExperimentId, 'activation');
  assert.equal(lessons.find(lesson => lesson.id === 'neuron-forward').relatedExperimentId, 'neuron');
});
