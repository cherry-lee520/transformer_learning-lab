import { Menu, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navigation } from './Navigation';
export function Header({ onMenu, open }: { onMenu: () => void; open: boolean }) {
  const { pathname } = useLocation();
  const current = navigation.find(item => item.to === pathname || (item.to !== '/' && pathname.startsWith(item.to + '/')));
  return <header className="header"><div className="header-left"><button className="icon-button menu-button" onClick={onMenu} aria-label="打开导航" aria-expanded={open} aria-controls="main-sidebar"><Menu /></button><span className="header-path">学习空间 <span>/</span> <strong>{current?.label ?? '页面未找到'}</strong></span></div><div className="header-right"><span className="demo-tag"><Sparkles size={14} /> T09 · Transformer 架构</span><span className="avatar" aria-label="本地学习者">学</span></div></header>;
}
