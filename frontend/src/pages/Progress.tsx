import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { ProgressBar } from '../components/ProgressBar';
import { CourseIcon } from '../components/CourseIcon';
import { LessonStatus } from '../components/LessonStatus';
import { courses, lessons, lessonById, lessonPath } from '../lessons';
import { courseProgress } from '../services/learningProgress';
import { useLearning } from '../store/LearningProvider';

function formatDate(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '尚未记录'; }
export function Progress() {
  const { state, summary, recent, statusOf } = useLearning();
  const complete = lessons.filter(item => statusOf(item.id) === 'completed');
  const pending = lessons.filter(item => statusOf(item.id) !== 'completed');
  return <PageContainer eyebrow="SMALL STEPS, REAL PROGRESS" title="我的学习进度" description="回望已经走过的路，也为下一步留一点期待。">
    <section className="panel progress-summary"><div><span className="eyebrow">OVERALL PROGRESS</span><h2>你已完成 {summary.completed} 个课时</h2><p>共 {summary.total} 个课时 · 记录保存在当前浏览器</p><ProgressBar value={summary.percent} /></div><strong className="big-percent">{summary.percent}<span>%</span></strong></section>
    <section className="panel mb-6"><div className="section-heading"><h2>各课程完成率</h2><span className="small-tag">按课时数计算</span></div><div className="course-rates">{courses.map(course => {
      const progress = courseProgress(course, state.records);
      return <div className="course-rate" key={course.id}><CourseIcon name={course.icon} /><div><Link to={lessonPath(course.chapters[0].lessons[0].id)}>{course.title}</Link><ProgressBar value={progress.percent} label={`${course.title}完成率`} /></div><span>{progress.completed}/{progress.total} · {progress.percent}%</span></div>;
    })}</div></section>
    <div className="paper-layout">{[{ title: '已完成课时', items: complete, completed: true }, { title: '待学习课时', items: pending, completed: false }].map(group => <section className="panel" key={group.title}><h2>{group.title} <span className="small-tag">{group.items.length}</span></h2><div className="progress-list">{group.items.map(item => <Link key={item.id} to={lessonPath(item.id)}>{group.completed ? <CheckCircle2 className="green" size={19} /> : <Circle size={19} />}<span>{item.title}</span><LessonStatus status={statusOf(item.id)} /></Link>)}{group.items.length === 0 && <p className="muted py-5">{group.completed ? '还没有完成的课时，从第一步开始吧。' : '全部课时已完成，可以回顾已学内容。'}</p>}</div></section>)}</div>
    <section className="panel mt-6"><div className="section-heading"><div><h2>最近学习课时</h2><p>按最近访问时间排列；访问与完成独立记录。</p></div><Clock3 size={18} className="muted" /></div>{recent.length ? <ol className="recent-list">{recent.map(record => <li key={record.lessonId}><Link to={lessonPath(record.lessonId)}><strong>{lessonById.get(record.lessonId)?.title}</strong><LessonStatus status={record.status} /></Link><span>最近访问：{formatDate(record.lastVisitedAt)}</span>{record.completedAt && <span>完成时间：{formatDate(record.completedAt)}</span>}</li>)}</ol> : <p className="muted py-5">还没有学习记录。打开一个课时，即可从这里继续。</p>}</section>
  </PageContainer>;
}
