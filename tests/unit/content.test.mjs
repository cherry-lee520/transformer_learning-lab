import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../../frontend/src/lessons/index.ts';
import { lessonContents } from '../../frontend/src/lessons/content.ts';
import { neuronLesson } from '../../frontend/src/lessons/contents/neuron.ts';
import { isContentBlock, validateLessonContent, validateContentLinks, prepareContent, contentHeadings, safeImageSource } from '../../frontend/src/lessons/contentValidation.ts';

test('16 个课时正文关联完整，结构化教材的八种内容块均有效', () => {
  assert.deepEqual(validateContentLinks(lessons, lessonContents), []);
  assert.deepEqual(validateLessonContent(neuronLesson), []);
  assert.deepEqual(new Set(neuronLesson.blocks.map(block => block.type)), new Set(['heading', 'text', 'formula', 'code', 'callout', 'image', 'quiz', 'interactive']));
  assert.ok(neuronLesson.blocks.every(isContentBlock));
  assert.equal(new Set(neuronLesson.blocks.map(block => block.id)).size, neuronLesson.blocks.length);
});
test('重复 ID、未知块、版本及无效正文格式会报告', () => {
  const content = structuredClone(neuronLesson);
  content.blocks.push(content.blocks[0]);
  assert.match(validateLessonContent(content).join(), /重复/);
  for (const bad of [null, {}, { ...neuronLesson, version: 2 }, { ...neuronLesson, blocks: null }, { ...neuronLesson, blocks: [{ id: 'unknown', type: 'future' }] }]) assert.ok(validateLessonContent(bad).length);
});
test('逐块检查字段和答案引用，拒绝非有限默认参数', () => {
  const quiz = structuredClone(neuronLesson.blocks.find(block => block.type === 'quiz'));
  quiz.question.correctOptionId = 'missing';
  assert.equal(isContentBlock(quiz), false);
  quiz.question.correctOptionId = 'influence';
  quiz.question.options[1].id = quiz.question.options[0].id;
  assert.equal(isContentBlock(quiz), false);
  const interactive = structuredClone(neuronLesson.blocks.find(block => block.type === 'interactive'));
  for (const value of [NaN, Infinity, 11, -11, '2']) {
    interactive.defaults.x = value; assert.equal(isContentBlock(interactive), false);
  }
  assert.equal(isContentBlock({ id: 'formula', type: 'formula', latex: 'x', label: 'x', symbols: [{}] }), false);
  assert.equal(isContentBlock({ id: 'numeric', type: 'quiz', question: { kind: 'numeric', prompt: 'x', explanation: 'x', answer: 1, tolerance: -1 } }), false);
  assert.equal(isContentBlock({ id: 'code', type: 'code', title: 'x', examples: [{ language: 'javascript', code: 'x' }] }), false);
});
test('正文缺失、课时 ID 不匹配和跨正文重复 ID 均可发现', () => {
  assert.match(validateContentLinks([{ id: 'unknown', contentKey: 'missing' }], {}).join(), /缺失/);
  assert.match(validateContentLinks([{ id: 'other', contentKey: 'neuron-forward' }], lessonContents).join(), /不匹配/);
  const other = { ...neuronLesson, lessonId: 'other' };
  assert.match(validateContentLinks([{ id: 'neuron-forward', contentKey: 'one' }, { id: 'other', contentKey: 'two' }], { one: neuronLesson, two: other }).join(), /跨正文/);
});
test('安全降级只替换坏块，保留有效块顺序及标题导航', () => {
  const content = { ...neuronLesson, blocks: [neuronLesson.blocks[0], { type: 'future', id: 'future' }, null, neuronLesson.blocks[1], neuronLesson.blocks[0]] };
  const entries = prepareContent(content, 'neuron-forward');
  assert.deepEqual(entries.map(item => item.block?.type ?? null), ['heading', null, null, 'text', null]);
  assert.equal(new Set(entries.map(item => item.key)).size, entries.length);
  assert.equal(contentHeadings(content, 'neuron-forward').length, 1);
  assert.equal(prepareContent(content, 'wrong-id')[0].block, null);
  assert.equal(prepareContent(undefined, 'missing')[0].block, null);
});
test('旧占位教材转换为标准内容块；图像源禁止脚本及协议相对地址', () => {
  const entries = prepareContent(lessonContents[lessons[0].contentKey], 'start');
  assert.deepEqual(entries.map(item => item.block.type), ['callout', 'heading', 'text']);
  for (const src of ['/images/neuron-flow.svg', 'https://example.com/image.png']) assert.equal(safeImageSource(src), true);
  for (const src of ['javascript:alert(1)', '//example.com/image', 'data:text/html,hi', 'http://example.com/a', '/\\evil', '']) assert.equal(safeImageSource(src), false);
});
test('论文关联字段可选，有值时校验页码及相关实验 ID', () => {
  const block = { ...neuronLesson.blocks[0], paperSection: '3.2.1', paperPage: 4, paperEquation: '1', relatedExperimentId: 'attention' };
  assert.equal(isContentBlock(block), true);
  assert.equal(isContentBlock({ ...block, paperPage: 0 }), false);
  assert.equal(isContentBlock({ ...block, relatedExperimentId: 'bad id' }), false);
});
