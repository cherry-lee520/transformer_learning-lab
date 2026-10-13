import { emptyProgress, recentLessons } from './learningProgress.ts';
import type { LearningProgress, ProgressSnapshot } from '../lessons/types.ts';
export const PROGRESS_STORAGE_KEY = 'transformer-learning-lab.progress';
export interface ProgressStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface LoadResult { state: ProgressSnapshot; warning: string | null; writable: boolean }
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
/** Version dispatch is the migration boundary. Unsupported schemas are never overwritten. */
export function decodeProgress(raw: string | null, validIds: ReadonlySet<string>): LoadResult {
  const clean = emptyProgress();
  if (raw === null) return { state: clean, warning: null, writable: true };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { state: clean, warning: '本地记录无法读取，已恢复为空白进度。', writable: true }; }
  if (!isObject(data)) return { state: clean, warning: '本地记录格式不正确，已恢复为空白进度。', writable: true };
  if (data.schemaVersion !== 1) return { state: clean, warning: '本地记录版本暂不支持。本次更改仅保留在当前页面，原记录不会被覆盖。', writable: false };
  if (!Array.isArray(data.records)) return { state: clean, warning: '本地记录格式不正确，已恢复为空白进度。', writable: true };
  let repaired = false;
  const records = new Map<string, LearningProgress>();
  for (const value of data.records) {
    if (!isObject(value) || typeof value.lessonId !== 'string' || !validIds.has(value.lessonId)
      || typeof value.status !== 'string' || !['not_started', 'in_progress', 'completed'].includes(value.status)
      || !(value.lastVisitedAt === null || isDate(value.lastVisitedAt))
      || (value.status === 'completed' ? !isDate(value.completedAt) : value.completedAt !== null)) { repaired = true; continue; }
    const record: LearningProgress = { lessonId: value.lessonId, status: value.status as LearningProgress['status'], lastVisitedAt: value.lastVisitedAt, completedAt: value.completedAt as string | null, courseVersion: typeof value.courseVersion === 'string' ? value.courseVersion : clean.courseVersion };
    const prior = records.get(record.lessonId);
    if (prior) repaired = true;
    if (!prior || Date.parse(record.lastVisitedAt ?? '1970-01-01') >= Date.parse(prior.lastVisitedAt ?? '1970-01-01')) records.set(record.lessonId, record);
  }
  const state: ProgressSnapshot = { ...clean, records: [...records.values()] };
  state.recentLessonId = recentLessons(state)[0]?.lessonId ?? null;
  if (data.recentLessonId !== state.recentLessonId) repaired = true;
  return { state, warning: repaired ? '已跳过无效或过期的学习记录，其余进度已保留。' : null, writable: true };
}
export function loadProgress(storage: ProgressStorage, validIds: ReadonlySet<string>): LoadResult {
  try { return decodeProgress(storage.getItem(PROGRESS_STORAGE_KEY), validIds); }
  catch { return { state: emptyProgress(), warning: '浏览器不允许读取本地存储。本次学习记录仅保留在当前页面。', writable: false }; }
}
export function saveProgress(storage: ProgressStorage, state: ProgressSnapshot): string | null {
  try { storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state)); return null; }
  catch { return '学习记录暂时无法保存，请检查浏览器存储权限或可用空间。当前页面仍可使用。'; }
}
