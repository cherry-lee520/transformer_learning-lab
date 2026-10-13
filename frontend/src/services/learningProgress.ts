import { COURSE_VERSION } from '../lessons/catalog.ts';
import type { Chapter, Course, LearningProgress, Lesson, ProgressSnapshot } from '../lessons/types.ts';
export const emptyProgress = (): ProgressSnapshot => ({ schemaVersion: 1, courseVersion: COURSE_VERSION, records: [], recentLessonId: null });
export function getLessonProgress(state: ProgressSnapshot, lessonId: string): LearningProgress {
  return state.records.find(record => record.lessonId === lessonId) ?? { lessonId, status: 'not_started', lastVisitedAt: null, completedAt: null };
}
export function updateLessonProgress(state: ProgressSnapshot, lessonId: string, action: 'visit' | 'complete' | 'undo', validIds: ReadonlySet<string>, at = new Date().toISOString()): ProgressSnapshot {
  if (!validIds.has(lessonId)) return state;
  const previous = getLessonProgress(state, lessonId);
  const record: LearningProgress = {
    lessonId,
    status: action === 'complete' ? 'completed' : action === 'undo' ? 'in_progress' : previous.status === 'completed' ? 'completed' : 'in_progress',
    lastVisitedAt: at,
    completedAt: action === 'complete' ? previous.completedAt ?? at : action === 'undo' ? null : previous.completedAt,
    courseVersion: COURSE_VERSION,
  };
  return { ...state, courseVersion: COURSE_VERSION, recentLessonId: lessonId, records: [...state.records.filter(item => item.lessonId !== lessonId), record] };
}
/** Rates are weighted by lesson count; a visit contributes zero completions. */
export function calculateProgress(lessons: readonly Pick<Lesson, 'id'>[], records: readonly LearningProgress[]) {
  const completedIds = new Set(records.filter(record => record.status === 'completed').map(record => record.lessonId));
  const ids = [...new Set(lessons.map(lesson => lesson.id))];
  const total = ids.length;
  const completed = ids.filter(id => completedIds.has(id)).length;
  return { total, completed, percent: total ? Math.round(completed / total * 100) : 0 };
}
export const chapterProgress = (chapter: Chapter, records: readonly LearningProgress[]) => calculateProgress(chapter.lessons, records);
export const courseProgress = (course: Course, records: readonly LearningProgress[]) => calculateProgress(course.chapters.flatMap(chapter => chapter.lessons), records);
export function recentLessons(state: ProgressSnapshot): LearningProgress[] {
  return state.records.filter(record => record.lastVisitedAt !== null).sort((a, b) => Date.parse(b.lastVisitedAt!) - Date.parse(a.lastVisitedAt!));
}
