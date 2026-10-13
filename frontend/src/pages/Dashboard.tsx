import { ArrowRight, BookOpen, CheckCircle2, FlaskConical, Route, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { ProgressBar } from '../components/ProgressBar';
import { LessonCard } from '../components/LessonCard';
import { lessons, lessonById, lessonPath, chapterById } from '../lessons';
import { useLearning } from '../store/LearningProvider';
import { NetworkIllustration } from '../visualizations/NetworkIllustration';
export function Dashboard() {
  const { summary, statusOf, continueId, state } = useLearning();
  const next = lessonById.get(continueId)!;
  const recent = state.recentLessonId ? lessonById.get(state.recentLessonId) : undefined;
  return <PageContainer eyebrow="YOUR LEARNING JOURNEY" title="你好，未来的探索者。" description="不必急着理解一切。让我们从一个直觉开始，慢慢看清 Transformer。">
    <section className="welcome-banner"><div className="welcome-copy"><span className="hero-label"><Sparkles size={14} /> 从零基础，到亲手实现</span><h2>让机器理解语言的秘密，<br /><span>从这里开始探索。</span></h2><p>用可视化建立直觉，用动手实验连接知识。<br />一步步走进《Attention Is All You Need》的世界。</p><Link className="button primary" to={lessonPath(continueId)}>继续学习 <ArrowRight size={17} /></Link><span className="hero-note">{recent ? '最近学习' : '推荐起点'}：{next.title}</span></div><NetworkIllustration /></section>
    <div className="stats-grid"><div className="stat-card"><span className="stat-icon violet"><Route size={21} /></span><div><span>总学习进度</span><strong>{summary.percent}<small>%</small></strong></div><div className="stat-progress"><ProgressBar value={summary.percent} /></div></div><div className="stat-card"><span className="stat-icon blue"><CheckCircle2 size={21} /></span><div><span>已完成课时</span><strong>{summary.completed}<small> / {summary.total}</small></strong></div><span className="stat-note">本地保存</span></div><div className="stat-card"><span className="stat-icon peach"><BookOpen size={21} /></span><div><span>总课时数</span><strong>{lessons.length}<small> 个课时</small></strong></div><Link className="text-link" to="/laboratory"><FlaskConical size={14} />探索实验规划</Link></div></div>
    <section className="panel recent-learning"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>最近学习章节</h2><p>{recent ? `${chapterById.get(recent.chapterId)?.title} · ${recent.title}` : '还没有学习记录。从第一课开始吧。'}</p></div><Link className="text-link" to={lessonPath(continueId)}>{recent ? '回到课时' : '开始学习'}<ArrowRight size={16} /></Link></section>
    <section><div className="section-heading"><div><h2>你的学习路径 <span className="small-tag">循序渐进</span></h2><p>从基础直觉出发，把零散知识连接成完整的图景。</p></div><Link to="/lessons" className="text-link">查看全部课程 <ArrowRight size={16} /></Link></div><div className="lesson-grid">{lessons.slice(0, 3).map((lesson, index) => <LessonCard key={lesson.id} lesson={lesson} index={index} completed={statusOf(lesson.id) === 'completed'} />)}</div></section>
    <section className="bottom-grid"><div className="invitation-card"><span className="stat-icon violet"><BookOpen /></span><div><h3>从理解概念，到读懂论文</h3><p>沿着清晰的学习路径，逐步走近 Transformer 的原始设计。</p></div><Link to="/paper" className="icon-link" aria-label="进入论文页面"><ArrowRight size={20} /></Link></div><div className="tip-card"><span className="eyebrow">A LITTLE REMINDER</span><p>“理解不是一次顿悟，<br />而是许多个小小的连接。”</p><span>保持好奇，按照自己的节奏前进。</span></div></section>
  </PageContainer>;
}
