export type CourseIcon = 'brain' | 'languages' | 'focus' | 'layers' | 'code';
export interface Course {
  id: string;
  title: string;
  description: string;
  order: number;
  icon: CourseIcon;
  chapters: Chapter[];
}
export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}
export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  contentKey: string;
  relatedPaperSection?: string;
  relatedExperimentId?: string;
  prerequisites?: string[];
}
export type { LessonContent } from './contentTypes.ts';
export type LearningStatus = 'not_started' | 'in_progress' | 'completed';
export interface LearningProgress {
  lessonId: string;
  status: LearningStatus;
  lastVisitedAt: string | null;
  completedAt: string | null;
  courseVersion?: string;
}
export interface ProgressSnapshot {
  schemaVersion: 1;
  courseVersion: string;
  records: LearningProgress[];
  recentLessonId: string | null;
}
