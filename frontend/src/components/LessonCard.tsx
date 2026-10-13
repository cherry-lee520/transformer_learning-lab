import { ArrowUpRight, Check, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Lesson } from '../lessons/types';
import { chapterById, lessonPath } from '../lessons';
export function LessonCard({ lesson, index, completed }: { lesson: Lesson; index: number; completed: boolean }) {
  return <Link className="lesson-card" to={lessonPath(lesson.id)}><div className="flex items-center justify-between"><span className={`module-icon tone-${index % 3}`}>{String(index + 1).padStart(2, '0')}</span><span className={`small-tag ${completed ? 'success' : ''}`}>{completed ? <><Check size={12} /> 已完成</> : chapterById.get(lesson.chapterId)?.title}</span></div><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="card-foot"><span><Clock3 size={14} /> 预计 {lesson.estimatedMinutes} 分钟</span><ArrowUpRight size={18} /></div></Link>;
}
