import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { activate, ACTIVATIONS, computeNeuron, sampleActivation } from '../../frontend/src/services/neuronMath.ts';
import { calculateNeuron } from '../../frontend/src/services/neuron.ts';
import { withinTolerance } from '../../frontend/src/services/numbers.ts';
import { NEURON_EXAMPLES, cloneConfig, randomConfig, resizeInputs } from '../../frontend/src/experiments/neuron/examples.ts';
import { NEURON_CHALLENGES, judgeChallenge } from '../../frontend/src/experiments/neuron/challenges.ts';
import { forwardSteps } from '../../frontend/src/experiments/neuron/steps.ts';
import { graphLayout } from '../../frontend/src/visualizations/neuron/layout.ts';
import { NeuronGraph } from '../../frontend/src/visualizations/neuron/NeuronGraph.tsx';
import { ActivationPlot } from '../../frontend/src/visualizations/neuron/ActivationPlot.tsx';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { createElement: h } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const katex = require('katex');
const linear = { inputs: [2], weights: [3], bias: 1, activationType: 'linear' };

test('单输入结构化计算真实执行，T03 包装与共同核心结果一致', () => {
  const result = computeNeuron(linear);
  assert.deepEqual(result, { inputs: [2], weights: [3], weightedTerms: [6], weightedSum: 6, bias: 1, preActivation: 7, activationType: 'linear', output: 7 });
  assert.deepEqual(calculateNeuron({ x: 2, w: 3, b: 1 }), { weighted: result.weightedSum, y: result.output });
});
test('多输入加权求和、正负零权重和只加一次偏置', () => {
  const result = computeNeuron({ inputs: [2, -1, 5, 0], weights: [3, -4, 0, 9], bias: -2, activationType: 'linear' });
  assert.deepEqual(result.weightedTerms, [6, 4, 0, 0]);
  assert.equal(result.weightedSum, 10);
  assert.equal(result.preActivation, 8);
  assert.equal(result.output, 8);
});
test('ReLU 的负数、零与正数', () => {
  assert.equal(activate(-5, 'relu'), 0); assert.equal(activate(0, 'relu'), 0); assert.equal(activate(5, 'relu'), 5);
  assert.equal(computeNeuron({ ...linear, weights: [-3], activationType: 'relu' }).output, 0);
});
test('Sigmoid 的数值精度、单调性、对称性与极端值稳定性', () => {
  assert.equal(activate(0, 'sigmoid'), 0.5);
  assert.ok(withinTolerance(activate(1, 'sigmoid'), 0.7310585786300049, 1e-14));
  assert.ok(withinTolerance(activate(-1, 'sigmoid') + activate(1, 'sigmoid'), 1, 1e-14));
  assert.equal(activate(1e308, 'sigmoid'), 1); assert.equal(activate(-1e308, 'sigmoid'), 0);
  assert.ok(activate(-2, 'sigmoid') < activate(2, 'sigmoid'));
});
test('Tanh 的精度、对称性与极端值', () => {
  assert.equal(activate(0, 'tanh'), 0);
  assert.ok(withinTolerance(activate(1, 'tanh'), 0.7615941559557649, 1e-14));
  assert.equal(activate(-1, 'tanh'), -activate(1, 'tanh'));
  assert.equal(activate(1e308, 'tanh'), 1); assert.equal(activate(-1e308, 'tanh'), -1);
});
test('1～5 个输入边界与数组长度关联，计算不修改输入', () => {
  for (let count = 1; count <= 5; count++) {
    const config = { ...linear, inputs: Array(count).fill(2), weights: Array(count).fill(3) };
    const before = structuredClone(config), result = computeNeuron(config);
    assert.equal(result.output, count * 6 + 1);
    assert.deepEqual(config, before);
    result.inputs[0] = 99; assert.equal(config.inputs[0], 2);
  }
  for (const count of [0, 6]) assert.equal(computeNeuron({ ...linear, inputs: Array(count).fill(1), weights: Array(count).fill(1) }), null);
  assert.equal(computeNeuron({ ...linear, weights: [] }), null);
});
test('非法输入、NaN、Infinity、乘积/累加/加偏置溢出被拒绝', () => {
  for (const bad of [NaN, Infinity, -Infinity, '2', undefined]) {
    assert.equal(computeNeuron({ ...linear, inputs: [bad] }), null);
    assert.equal(computeNeuron({ ...linear, weights: [bad] }), null);
    assert.equal(computeNeuron({ ...linear, bias: bad }), null);
  }
  assert.equal(computeNeuron(null), null);
  assert.equal(computeNeuron({ ...linear, activationType: 'unknown' }), null);
  assert.equal(activate(Infinity, 'relu'), null); assert.equal(activate(1, 'unknown'), null);
  for (const config of [
    { ...linear, inputs: [1e308], weights: [2] },
    { ...linear, inputs: [1e308, 1e308], weights: [1, 1], bias: 0 },
    { ...linear, inputs: [1e308], weights: [1], bias: 1e308 },
  ]) assert.equal(computeNeuron(config), null);
});
test('四种曲线采样使用同一激活函数，函数值精度与当前点一致', () => {
  for (const type of Object.keys(ACTIVATIONS)) {
    const points = sampleActivation(type, -10, 10, 101);
    assert.equal(points.length, 101);
    assert.deepEqual(points[0], { z: -10, y: activate(-10, type) });
    assert.deepEqual(points.at(-1), { z: 10, y: activate(10, type) });
    for (const point of points) assert.equal(point.y, activate(point.z, type));
    const result = computeNeuron({ ...linear, activationType: type });
    const markup = renderToStaticMarkup(h(ActivationPlot, { result, onActivation() {} }));
    assert.match(markup, new RegExp(`data-z="${result.preActivation}"`));
    assert.ok(markup.includes(`data-y="${result.output}"`));
  }
  const extreme = sampleActivation('linear', 0, Number.MAX_VALUE, 5);
  assert.ok(extreme.every(point => Number.isFinite(point.z) && Number.isFinite(point.y)));
  assert.equal(extreme.at(-1).z, Number.MAX_VALUE);
  for (const args of [['unknown', -1, 1], ['linear', 1, 1], ['linear', -Infinity, 1], ['linear', -1, 1, 1], ['linear', -1, 1, 9999]]) assert.equal(sampleActivation(...args), null);
});
test('结构图真实节点值、连线正负零分类和步骤数据一致', () => {
  const result = computeNeuron({ inputs: [2, -1, 3], weights: [3, -2, 0], bias: 1, activationType: 'linear' });
  const markup = renderToStaticMarkup(h(NeuronGraph, { result, step: 3 }));
  assert.match(markup, /data-node="sum" data-value="9"/);
  assert.match(markup, /data-node="output" data-value="9"/);
  for (const sign of ['positive', 'negative', 'zero']) assert.match(markup, new RegExp(`weight-${sign}`));
  assert.equal((markup.match(/data-node=/g) ?? []).length, 10);
  const steps = forwardSteps(result);
  assert.equal(steps.length, 6); assert.ok(steps[2].latex.includes('= 8')); assert.ok(steps[3].latex.includes('=9'));
  assert.deepEqual(steps[3].nodes, ['sum', 'bias']);
  for (const step of steps) assert.doesNotThrow(() => katex.renderToString(step.latex, { throwOnError: true }));
});
test('每种输入数量的桌面与手机布局均在视图边界内', () => {
  for (let count = 1; count <= 5; count++) for (const compact of [false, true]) {
    const layout = graphLayout(count, compact);
    assert.equal(layout.inputs.length, count); assert.equal(layout.weights.length, count);
    for (const point of [...layout.inputs, ...layout.weights, layout.sum, layout.bias, layout.activation, layout.output]) assert.ok(point.x > 0 && point.x < layout.width && point.y > 0 && point.y < layout.height);
  }
  assert.throws(() => graphLayout(0, false), RangeError);
});
test('教学示例和可重复随机参数均可计算，改变输入数量保留已有值', () => {
  for (const example of NEURON_EXAMPLES) assert.ok(computeNeuron(example.config));
  const copy = cloneConfig(NEURON_EXAMPLES[0].config); copy.inputs[0] = 8;
  assert.equal(NEURON_EXAMPLES[0].config.inputs[0], 2);
  assert.deepEqual(randomConfig(42, 5), randomConfig(42, 5));
  assert.notDeepEqual(randomConfig(43, 5), randomConfig(42, 5));
  for (let count = 1; count <= 5; count++) {
    const config = randomConfig(42, count);
    assert.ok(computeNeuron(config)); assert.equal(config.inputs.length, count);
    assert.ok([...config.inputs, ...config.weights, config.bias].every(value => Math.abs(value) <= 10));
  }
  for (const seed of [-1, 0.1, NaN, Infinity, 0x100000000]) assert.equal(randomConfig(seed, 2), null);
  assert.equal(randomConfig(42, 0), null); assert.equal(resizeInputs(linear, 6), null);
  const three = resizeInputs(linear, 3);
  assert.deepEqual(three.inputs, [2, 1, 1]); assert.deepEqual(three.weights, [3, 1, 1]);
  assert.deepEqual(resizeInputs(three, 1), linear);
});
test('两个预测挑战按真实计算判定，错误/空值不会完成', () => {
  assert.equal(NEURON_CHALLENGES.length, 3);
  assert.equal(judgeChallenge('predict-linear', { kind: 'prediction', answer: '7' }).success, true);
  assert.equal(judgeChallenge('predict-relu', { kind: 'prediction', answer: '0' }).success, true);
  assert.equal(judgeChallenge('predict-relu', { kind: 'prediction', answer: '-5' }).success, false);
  for (const answer of ['', ' ', 'NaN', 'Infinity', '1e309']) assert.equal(judgeChallenge('predict-linear', { kind: 'prediction', answer }).valid, false);
  assert.equal(judgeChallenge('unknown', { kind: 'prediction', answer: '7' }).valid, false);
});
test('调参挑战固定输入/目标/激活，提交值不能覆盖它们', () => {
  const submission = { kind: 'tuning', weights: [3, 0], bias: 0 };
  assert.equal(judgeChallenge('tune-target', submission).success, true);
  assert.equal(judgeChallenge('tune-target', { ...submission, weights: [1, 1], target: 1, inputs: [100], activationType: 'relu' }).success, false);
  assert.equal(judgeChallenge('tune-target', { ...submission, weights: [3, NaN] }).valid, false);
  assert.equal(judgeChallenge('tune-target', { ...submission, bias: 11 }).valid, false);
  assert.equal(judgeChallenge('tune-target', { ...submission, weights: [3] }).valid, false);
  assert.equal(judgeChallenge('tune-target', { kind: 'prediction', answer: '6' }).valid, false);
});
test('挑战与教材共用浮点容限，容限边界及非法容限', () => {
  assert.equal(withinTolerance(0.1 + 0.2, 0.3, 0), true);
  assert.equal(judgeChallenge('tune-target', { kind: 'tuning', weights: [3, 0], bias: 0.05 }).success, true);
  assert.equal(judgeChallenge('tune-target', { kind: 'tuning', weights: [3, 0], bias: 0.051 }).success, false);
  for (const values of [[NaN, 1, 1], [1, Infinity, 1], [1, 1, -1], [1, 1, Infinity]]) assert.equal(withinTolerance(...values), false);
});
