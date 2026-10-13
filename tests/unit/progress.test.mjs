import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, chapters, lessons, lessonById } from '../../frontend/src/lessons/index.ts';
import { calculateProgress, chapterProgress, courseProgress, emptyProgress, getLessonProgress, recentLessons, updateLessonProgress } from '../../frontend/src/services/learningProgress.ts';
const ids = new Set(lessonById.keys());
const first = '2026-10-11T01:00:00.000Z', second = '2026-10-11T02:00:00.000Z';
const update = (state, id, action, time = first) => updateLessonProgress(state, id, action, ids, time);

test('初始进度从零开始，访问不计为完成', () => {
  const empty = emptyProgress();
  assert.equal(getLessonProgress(empty, 'start').status, 'not_started');
  const visited = update(empty, 'start', 'visit');
  assert.equal(getLessonProgress(visited, 'start').status, 'in_progress');
  assert.equal(getLessonProgress(visited, 'start').lastVisitedAt, first);
  assert.equal(visited.recentLessonId, 'start');
  assert.deepEqual(calculateProgress(lessons, visited.records), { total: 16, completed: 0, percent: 0 });
  assert.deepEqual(empty.records, []);
});
test('完成、重复完成、再次访问和撤销的状态与时间', () => {
  let state = update(emptyProgress(), 'start', 'complete');
  assert.equal(getLessonProgress(state, 'start').status, 'completed');
  assert.equal(getLessonProgress(state, 'start').completedAt, first);
  state = update(state, 'start', 'complete', second);
  state = update(state, 'start', 'visit', second);
  assert.equal(getLessonProgress(state, 'start').completedAt, first);
  assert.equal(state.records.length, 1);
  state = update(state, 'start', 'undo', second);
  assert.equal(getLessonProgress(state, 'start').status, 'in_progress');
  assert.equal(getLessonProgress(state, 'start').completedAt, null);
  assert.equal(calculateProgress(lessons, state.records).completed, 0);
});
test('章节、课程和整体按实际课时计算，不平均章节百分比', () => {
  let state = update(emptyProgress(), 'start', 'complete');
  state = update(state, 'vectors', 'complete');
  state = update(state, 'embedding', 'visit');
  assert.deepEqual(chapterProgress(chapters[0], state.records), { total: 3, completed: 2, percent: 67 });
  assert.deepEqual(courseProgress(courses[0], state.records), { total: 5, completed: 2, percent: 40 });
  assert.deepEqual(calculateProgress(lessons, state.records), { total: 16, completed: 2, percent: 13 });
});
test('空课程和全部完成的边界', () => {
  assert.deepEqual(calculateProgress([], []), { total: 0, completed: 0, percent: 0 });
  const state = lessons.reduce((state, lesson) => update(state, lesson.id, 'complete'), emptyProgress());
  assert.deepEqual(calculateProgress(lessons, state.records), { total: 16, completed: 16, percent: 100 });
});
test('无效课时不修改状态，不污染完成率', () => {
  const state = emptyProgress();
  assert.equal(update(state, 'missing', 'complete'), state);
  const bogus = { lessonId: 'missing', status: 'completed', lastVisitedAt: first, completedAt: first };
  assert.equal(calculateProgress(lessons, [bogus]).percent, 0);
});
test('最近访问按时间排序，重复完成和重复记录不会重复计数', () => {
  let state = update(emptyProgress(), 'start', 'visit');
  state = update(state, 'vectors', 'visit', second);
  assert.deepEqual(recentLessons(state).map(record => record.lessonId), ['vectors', 'start']);
  state = update(state, 'start', 'complete');
  assert.equal(calculateProgress(lessons, [...state.records, ...state.records]).completed, 1);
});
