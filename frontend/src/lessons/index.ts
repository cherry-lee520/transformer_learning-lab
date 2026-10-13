import { courses as catalog } from './catalog.ts';
import { assertValidCourses } from './validation.ts';
assertValidCourses(catalog);
export const courses = [...catalog].sort((a, b) => a.order - b.order).map(course => ({
  ...course,
  chapters: [...course.chapters].sort((a, b) => a.order - b.order).map(chapter => ({
    ...chapter, lessons: [...chapter.lessons].sort((a, b) => a.order - b.order),
  })),
}));
export const chapters = courses.flatMap(course => course.chapters);
export const lessons = chapters.flatMap(chapter => chapter.lessons);
export const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]));
export const chapterById = new Map(chapters.map(chapter => [chapter.id, chapter]));
export const courseById = new Map(courses.map(course => [course.id, course]));
export const lessonPath = (id: string) => `/lessons/${encodeURIComponent(id)}`;
