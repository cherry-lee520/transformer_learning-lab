import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonById } from '../../frontend/src/lessons/index.ts';
import { emptyProgress, updateLessonProgress } from '../../frontend/src/services/learningProgress.ts';
import { decodeProgress, loadProgress, saveProgress, PROGRESS_STORAGE_KEY } from '../../frontend/src/services/progressStorage.ts';
const ids = new Set(lessonById.keys());
const time = '2026-10-11T01:00:00.000Z';
const complete = () => updateLessonProgress(emptyProgress(), 'start', 'complete', ids, time);
class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}
test('无历史记录时使用空进度', () => {
  assert.deepEqual(loadProgress(new MemoryStorage(), ids).state, emptyProgress());
});
test('版本化保存与重载，完成和最近访问时间保留', () => {
  const storage = new MemoryStorage();
  const state = complete();
  assert.equal(saveProgress(storage, state), null);
  assert.equal(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)).schemaVersion, 1);
  assert.deepEqual(loadProgress(storage, ids).state, state);
});
test('损坏 JSON 与无效记录结构安全恢复', () => {
  for (const raw of ['{broken', 'null', '[]', JSON.stringify({ schemaVersion: 1, records: {} })]) {
    const result = decodeProgress(raw, ids);
    assert.deepEqual(result.state.records, []);
    assert.ok(result.warning);
    assert.equal(result.writable, true);
  }
});
test('过滤已删除 ID，保留有效历史记录并修复最近课时', () => {
  const data = complete();
  data.records.push({ ...data.records[0], lessonId: 'removed-lesson' });
  data.recentLessonId = 'removed-lesson';
  const result = decodeProgress(JSON.stringify(data), ids);
  assert.equal(result.state.records.length, 1);
  assert.equal(result.state.recentLessonId, 'start');
  assert.ok(result.warning);
});
test('拒绝错误状态、错误日期与缺少完成时间的记录', () => {
  for (const fields of [{ status: 'visited' }, { status: ['completed'], completedAt: null }, { lastVisitedAt: 'yesterday' }, { completedAt: null }, { completedAt: '2026-02-30T01:00:00.000Z' }]) {
    const data = complete();
    data.records[0] = { ...data.records[0], ...fields };
    assert.equal(decodeProgress(JSON.stringify(data), ids).state.records.length, 0);
  }
});
test('重复课时采用最近记录，不保留旧完成状态', () => {
  const data = complete();
  data.records.push({ ...data.records[0], status: 'in_progress', completedAt: null, lastVisitedAt: '2026-10-11T02:00:00.000Z' });
  const result = decodeProgress(JSON.stringify(data), ids);
  assert.equal(result.state.records.length, 1);
  assert.equal(result.state.records[0].status, 'in_progress');
});
test('课程版本变化保留稳定 ID 的有效学习记录', () => {
  const data = complete(); data.courseVersion = 'older-catalog'; data.records[0].courseVersion = 'older-catalog';
  const result = decodeProgress(JSON.stringify(data), ids);
  assert.equal(result.state.records[0].status, 'completed');
  assert.equal(result.state.records[0].courseVersion, 'older-catalog');
  assert.notEqual(result.state.courseVersion, 'older-catalog');
});
test('未知存储版本不允许覆盖原始数据', () => {
  const result = decodeProgress(JSON.stringify({ ...complete(), schemaVersion: 99 }), ids);
  assert.equal(result.writable, false);
  assert.equal(result.state.records.length, 0);
  assert.ok(result.warning.includes('不会被覆盖'));
});
test('读取受限或写入配额不足不会抛出异常', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(loadProgress(storage, ids).writable, false);
  assert.ok(saveProgress(storage, complete()));
});
