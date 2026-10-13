import test from 'node:test';
import assert from 'node:assert/strict';
import { courses as rawCourses } from '../../frontend/src/lessons/catalog.ts';
import { courses, chapters, lessons, lessonById } from '../../frontend/src/lessons/index.ts';
import { lessonContents } from '../../frontend/src/lessons/content.ts';
import { assertValidCourses, validateCourses } from '../../frontend/src/lessons/validation.ts';

test('课程加载、层级排序、正文占位与 T01 ID 兼容', () => {
  assert.equal(courses.length, 5);
  assert.equal(chapters.length, 9);
  assert.equal(lessons.length, 16);
  assert.equal(lessons[0].id, 'start');
  assert.equal(lessons.at(-1).id, 'implementation');
  for (const id of ['start', 'vectors', 'embedding', 'attention', 'transformer', 'implementation']) assert.ok(lessonById.has(id));
  for (const lesson of lessons) assert.ok(lessonContents[lesson.contentKey]?.intro);
  assert.deepEqual(validateCourses(rawCourses), []);
});

for (const [entity, mutate] of [
  ['Course', data => { data[1].id = data[0].id; }],
  ['Chapter', data => { data[0].chapters[1].id = data[0].chapters[0].id; }],
  ['Lesson', data => { data[0].chapters[0].lessons[1].id = 'start'; }],
  ['跨类型', data => { data[0].chapters[0].id = data[0].id; }],
]) test(`${entity} ID 不允许重复`, () => {
  const data = structuredClone(rawCourses); mutate(data);
  assert.ok(validateCourses(data).some(issue => issue.code === 'duplicate_id'));
  assert.throws(() => assertValidCourses(data));
});

test('错误父级关联会报告，包含有效但不属于当前父级的 ID', () => {
  const data = structuredClone(rawCourses);
  data[0].chapters[0].courseId = 'missing';
  data[0].chapters[1].lessons[0].chapterId = 'chapter-first-steps';
  const codes = validateCourses(data).map(issue => issue.code);
  assert.ok(codes.includes('invalid_course'));
  assert.ok(codes.includes('invalid_chapter'));
});
test('先修引用必须有效', () => {
  const data = structuredClone(rawCourses);
  data[0].chapters[0].lessons[0].prerequisites = ['removed-lesson'];
  assert.ok(validateCourses(data).some(issue => issue.code === 'invalid_prerequisite'));
});
test('检测跨课时循环先修依赖', () => {
  const data = structuredClone(rawCourses);
  data[0].chapters[0].lessons[0].prerequisites = ['implementation'];
  assert.ok(validateCourses(data).some(issue => issue.code === 'prerequisite_cycle'));
});
test('检测自我依赖', () => {
  const data = structuredClone(rawCourses);
  data[0].chapters[0].lessons[0].prerequisites = ['start'];
  assert.ok(validateCourses(data).some(issue => issue.code === 'prerequisite_cycle'));
});
test('三层 order 必须是正整数，同级不能重复', () => {
  const data = structuredClone(rawCourses);
  data[0].order = NaN;
  data[1].chapters[0].order = -1;
  data[0].chapters[0].lessons[0].order = 1.5;
  data[0].chapters[1].order = data[0].chapters[0].order;
  const codes = validateCourses(data).map(issue => issue.code);
  assert.equal(codes.filter(code => code === 'invalid_order').length, 3);
  assert.ok(codes.includes('duplicate_order'));
});
test('课时预计时长与 contentKey 必须可用', () => {
  const data = structuredClone(rawCourses);
  data[0].chapters[0].lessons[0].estimatedMinutes = 0;
  data[0].chapters[0].lessons[0].contentKey = ' ';
  assert.ok(validateCourses(data).some(issue => issue.code === 'invalid_minutes'));
  assert.ok(validateCourses(data).some(issue => issue.code === 'invalid_content_key'));
});
