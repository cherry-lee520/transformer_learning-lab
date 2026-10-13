import { Atom, ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navigation } from './Navigation';
import { ProgressBar } from './ProgressBar';
import { useLearning } from '../store/LearningProvider';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { summary } = useLearning();
  return <aside id="main-sidebar" className={`sidebar ${open ? 'is-open' : ''}`}>
    <Link to="/" className="brand" onClick={onClose}><span className="brand-icon"><Atom size={26} /></span><span>Transformer<span className="brand-sub">LEARNING LAB</span></span></Link>
    <button className="icon-button close-nav" onClick={onClose} aria-label="关闭导航"><X /></button>
    <p className="nav-caption">学习空间</p><Navigation onNavigate={onClose} />
    <div className="sidebar-bottom"><div className="sidebar-progress"><span className="eyebrow">每一步，都算数</span><strong>从好奇心开始，走向理解。</strong><ProgressBar value={summary.percent} /><span>{summary.completed} / {summary.total} 个课时已完成</span><Link to="/progress">查看学习旅程 <ArrowUpRight size={16} /></Link></div><div className="sidebar-foot"><span className="status-dot" /> 本地学习空间 <span>v0.9</span></div></div>
  </aside>;
}
