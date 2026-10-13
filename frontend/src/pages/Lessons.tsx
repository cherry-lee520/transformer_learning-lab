import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { CourseTree } from '../components/CourseTree';
import { CourseIcon } from '../components/CourseIcon';
import { LessonStatus } from '../components/LessonStatus';
import { ProgressBar } from '../components/ProgressBar';
import { chapters, courses, lessonById, lessons, lessonPath, chapterById, courseById } from '../lessons';
import { lessonContents } from '../lessons/content';
import type { Lesson } from '../lessons/types';
import { courseProgress } from '../services/learningProgress';
import { useLearning } from '../store/LearningProvider';
import { LessonRenderer } from '../components/lesson/LessonRenderer';
import { blockAnchor, contentHeadings } from '../lessons/contentValidation';
import { experimentPath } from '../experiments/catalog';
import '../styles/lesson.css';
import 'katex/dist/katex.min.css';

function LessonReader({ lesson }: { lesson: Lesson }) {
  const { statusOf, visitLesson, completeLesson, undoComplete } = useLearning();
  useEffect(() => { visitLesson(lesson.id); }, [lesson.id, visitLesson]);
  const status = statusOf(lesson.id);
  const content = lessonContents[lesson.contentKey];
  const chapter = chapterById.get(lesson.chapterId)!;
  const course = courseById.get(chapter.courseId)!;
  const index = lessons.findIndex(item => item.id === lesson.id);
  return <article className="panel textbook" key={lesson.id}>
    <p className="lesson-breadcrumb">{course.title} / {chapter.title}</p>
    <div className="lesson-meta"><span className="small-tag">第 {index + 1} / {lessons.length} 课时</span><LessonStatus status={status} /><span><Clock3 size={13} />预计 {lesson.estimatedMinutes} 分钟</span></div>
    <h2>{lesson.title}</h2><p className="textbook-intro">{lesson.description}</p>
    <LessonRenderer content={content} lessonId={lesson.id} />
    <section id={blockAnchor(lesson.id, 'learning-links')}><h3>学习关联</h3>
      {lesson.prerequisites?.length ? <div className="prerequisite-list"><p>建议先了解以下课时，仍可自由选择学习顺序：</p>{lesson.prerequisites.map(id => <Link key={id} to={lessonPath(id)}>{lessonById.get(id)?.title}<LessonStatus status={statusOf(id)} /></Link>)}</div> : <p>这一节是学习路线的起点，无先修课时。</p>}
      <div className="related-links">{lesson.relatedPaperSection && <Link className="text-link" to="/paper">论文关联：第 {lesson.relatedPaperSection} 节 <ArrowRight size={14} /></Link>}{lesson.relatedExperimentId && <Link className={['neuron', 'activation', 'neural-network', 'language-representation', 'attention', 'transformer'].includes(lesson.relatedExperimentId) ? 'button primary' : 'text-link'} to={experimentPath(lesson.relatedExperimentId, lesson.id)}>{lesson.relatedExperimentId === 'neuron' ? '进入完整神经元实验室' : lesson.relatedExperimentId === 'activation' ? '进入激活与梯度实验室' : lesson.relatedExperimentId === 'neural-network' ? '进入神经网络训练实验室' : lesson.relatedExperimentId === 'language-representation' ? '进入语言表示实验室' : lesson.relatedExperimentId === 'attention' ? '进入 Attention 实验室' : lesson.relatedExperimentId === 'transformer' ? '进入 Transformer 架构实验室' : '查看关联实验规划'} <ArrowRight size={14} /></Link>}</div>
    </section>
    <section id={blockAnchor(lesson.id, 'learning-record')}><h3>学习记录</h3><p>打开课时会记录为“学习中”。完成状态由你手动标记，并保存在当前浏览器，刷新后仍然保留。随堂练习的作答状态与课时完成状态相互独立。</p>
      <button className={`button ${status === 'completed' ? 'secondary' : 'primary'}`} onClick={() => status === 'completed' ? undoComplete(lesson.id) : completeLesson(lesson.id)}><CheckCircle2 size={17} />{status === 'completed' ? '撤销完成' : '标记课时完成'}</button>
    </section>
    <div className="lesson-pagination">{index > 0 ? <Link className="button secondary" to={lessonPath(lessons[index - 1].id)}><ArrowLeft size={16} />上一节</Link> : <button className="button secondary" disabled><ArrowLeft size={16} />上一节</button>}{index < lessons.length - 1 ? <Link className="button secondary" to={lessonPath(lessons[index + 1].id)}>下一节<ArrowRight size={16} /></Link> : <button className="button secondary" disabled>已到最后一节</button>}</div>
  </article>;
}

function CourseOverview() {
  const { state, continueId } = useLearning();
  return <section className="panel course-overview"><span className="eyebrow">YOUR CONTENT MAP</span><h2>选择一个知识节点，开始学习</h2><p className="muted">{courses.length} 门课程 · {chapters.length} 个章节 · {lessons.length} 个课时。介绍与正文独立组织，完整教材将在后续逐步补充。</p><Link className="button primary" to={lessonPath(continueId)}>{state.recentLessonId ? '继续最近课时' : '开始第一课'}<ArrowRight size={16} /></Link>
    <div className="course-overview-list">{courses.map(course => {
      const progress = courseProgress(course, state.records);
      return <Link key={course.id} className="course-overview-card" to={lessonPath(course.chapters[0].lessons[0].id)}><span className="stat-icon violet"><CourseIcon name={course.icon} /></span><div><h3>{course.order}. {course.title}</h3><p>{course.description}</p><ProgressBar value={progress.percent} label={`${course.title}完成率`} /><small>{progress.completed}/{progress.total} 个课时 · {progress.percent}%</small></div><ArrowRight size={16} /></Link>;
    })}</div>
  </section>;
}

export function Lessons() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [params] = useSearchParams();
  const legacyId = params.get('lesson');
  if (!lessonId && legacyId !== null) return <Navigate replace to={lessonPath(legacyId || 'unknown')} />;
  const lesson = lessonId ? lessonById.get(lessonId) : undefined;
  if (lessonId && !lesson) return <PageContainer eyebrow="LESSON NOT FOUND" title="找不到这个课时" description="课时地址无效或内容已调整，你的学习记录不会因此改变。"><Link className="button primary" to="/lessons"><ArrowLeft size={16} />返回课程目录</Link></PageContainer>;
  return <PageContainer eyebrow="LEARN STEP BY STEP" title="互动课程" description="从熟悉的直觉开始，为每一个新概念找到落脚点。">
    <div className="course-layout"><CourseTree activeId={lesson?.id} />{lesson ? <LessonReader key={lesson.id} lesson={lesson} /> : <CourseOverview />}
      <aside className="knowledge-nav" aria-label="本节目录"><span className="eyebrow">{lesson ? '本节知识导航' : '学习路线'}</span>{lesson ? <>{contentHeadings(lessonContents[lesson.contentKey], lesson.id).map(heading => <a key={heading.id} href={`#${blockAnchor(lesson.id, heading.id)}`}>{heading.title}</a>)}<a href={`#${blockAnchor(lesson.id, 'learning-links')}`}>学习关联</a><a href={`#${blockAnchor(lesson.id, 'learning-record')}`}>学习记录</a></> : <p>从目录中选择课时。<br />按照自己的节奏前进。</p>}</aside>
    </div>
  </PageContainer>;
}
