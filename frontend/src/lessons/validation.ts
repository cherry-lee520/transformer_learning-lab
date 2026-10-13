import type { Course } from './types.ts';
export interface ValidationIssue { code: string; path: string; message: string }
/** Validate typed metadata before building indexes or shipping a new catalog. */
export function validateCourses(courses: readonly Course[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const courseIds = new Set(courses.map(course => course.id));
  const chapters = courses.flatMap(course => course.chapters);
  const chapterIds = new Set(chapters.map(chapter => chapter.id));
  const lessons = chapters.flatMap(chapter => chapter.lessons);
  const lessonIds = new Set(lessons.map(lesson => lesson.id));
  function report(code: string, path: string, message: string) { issues.push({ code, path, message }); }
  function id(value: string, path: string) {
    if (!/^[a-z][a-z0-9-]*$/.test(value)) report('invalid_id', path, 'ID 必须为稳定的小写字母、数字或连字符');
    if (ids.has(value)) report('duplicate_id', path, `重复 ID：${value}`);
    ids.add(value);
  }
  function ordering(items: readonly { order: number }[], path: string) {
    const seen = new Set<number>();
    items.forEach((item, index) => {
      if (!Number.isSafeInteger(item.order) || item.order < 1) report('invalid_order', `${path}[${index}]`, 'order 必须为正安全整数');
      if (seen.has(item.order)) report('duplicate_order', `${path}[${index}]`, '同级 order 不得重复');
      seen.add(item.order);
    });
  }
  ordering(courses, 'courses');
  courses.forEach(course => {
    id(course.id, course.id);
    ordering(course.chapters, course.id);
    course.chapters.forEach(chapter => {
      id(chapter.id, chapter.id);
      if (!courseIds.has(chapter.courseId) || chapter.courseId !== course.id) report('invalid_course', chapter.id, '章节必须关联所在课程');
      ordering(chapter.lessons, chapter.id);
      chapter.lessons.forEach(lesson => {
        id(lesson.id, lesson.id);
        if (!chapterIds.has(lesson.chapterId) || lesson.chapterId !== chapter.id) report('invalid_chapter', lesson.id, '课时必须关联所在章节');
        if (!lesson.contentKey.trim()) report('invalid_content_key', lesson.id, 'contentKey 不可为空');
        if (!Number.isFinite(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0) report('invalid_minutes', lesson.id, '预计时长必须为正数');
        for (const dependency of lesson.prerequisites ?? []) if (!lessonIds.has(dependency)) report('invalid_prerequisite', lesson.id, `先修课时不存在：${dependency}`);
      });
    });
  });
  const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(lessonId: string) {
    if (visiting.has(lessonId)) { report('prerequisite_cycle', lessonId, '先修依赖存在循环'); return; }
    if (visited.has(lessonId)) return;
    visiting.add(lessonId);
    for (const dependency of byId.get(lessonId)?.prerequisites ?? []) if (byId.has(dependency)) visit(dependency);
    visiting.delete(lessonId);
    visited.add(lessonId);
  }
  lessons.forEach(lesson => visit(lesson.id));
  return issues;
}
export function assertValidCourses(courses: readonly Course[]): void {
  const issues = validateCourses(courses);
  if (issues.length) throw new Error(issues.map(issue => `${issue.code}: ${issue.path} ${issue.message}`).join('\n'));
}
