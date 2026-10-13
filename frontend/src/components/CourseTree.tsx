import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { courses, lessonPath } from '../lessons';
import { chapterProgress, courseProgress } from '../services/learningProgress';
import { useLearning } from '../store/LearningProvider';
import { ProgressBar } from './ProgressBar';
import { LessonStatus } from './LessonStatus';

export function CourseTree({ activeId }: { activeId?: string }) {
  const { state, summary, statusOf } = useLearning();
  const tree = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = tree.current;
    const selected = container?.querySelector<HTMLElement>('.course-item.selected');
    if (!container || !selected) return;
    const bounds = container.getBoundingClientRect(), item = selected.getBoundingClientRect();
    if (item.bottom > bounds.bottom) container.scrollTop += item.bottom - bounds.bottom + 20;
    else if (item.top < bounds.top) container.scrollTop += item.top - bounds.top - 20;
  }, [activeId]);
  return <aside ref={tree} className="panel course-directory" aria-label="课程目录树">
    <h2>课程目录 <span>{summary.completed}/{summary.total}</span></h2>
    <ProgressBar value={summary.percent} />
    {courses.map(course => {
      const progress = courseProgress(course, state.records);
      const active = course.chapters.some(chapter => chapter.lessons.some(lesson => lesson.id === activeId));
      return <details key={course.id} className="course-tree-group" open={active || !activeId}>
        <summary><span>{course.order}. {course.title}</span><small>{progress.percent}%</small></summary>
        {course.chapters.map(chapter => {
          const progress = chapterProgress(chapter, state.records);
          return <div className="chapter-group" key={chapter.id}><h3>{chapter.title}</h3><div className="chapter-rate"><span>{progress.completed}/{progress.total} 课时</span><span>{progress.percent}%</span></div><ProgressBar value={progress.percent} label={`${chapter.title}完成率`} />
            {chapter.lessons.map(lesson => <Link key={lesson.id} to={lessonPath(lesson.id)} className={`course-item ${activeId === lesson.id ? 'selected' : ''}`} aria-current={activeId === lesson.id ? 'page' : undefined}><span><span>{lesson.title}</span><LessonStatus status={statusOf(lesson.id)} /></span></Link>)}
          </div>;
        })}
      </details>;
    })}
  </aside>;
}
