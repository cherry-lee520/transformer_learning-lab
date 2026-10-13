import { BookOpen, FlaskConical, House, ChartNoAxesCombined, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const navigation = [
  { to: '/', label: '学习概览', english: 'Dashboard', icon: House },
  { to: '/lessons', label: '互动课程', english: 'Lessons', icon: BookOpen },
  { to: '/laboratory', label: '探索实验室', english: 'Laboratory', icon: FlaskConical },
  { to: '/paper', label: '走进原始论文', english: 'Paper', icon: FileText },
  { to: '/progress', label: '我的学习进度', english: 'Progress', icon: ChartNoAxesCombined },
];
export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="主导航">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>;
}
