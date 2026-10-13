import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useLearning } from '../store/LearningProvider';
export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { warning } = useLearning();
  const { pathname } = useLocation();
  const drawerRegion = useRef<HTMLDivElement>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRegion.current?.querySelector<HTMLElement>('a')?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const items = drawerRegion.current?.querySelectorAll<HTMLElement>('a, button');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [open]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">跳到主要内容</a>{open && <button tabIndex={-1} className="nav-backdrop" onClick={() => setOpen(false)} aria-label="关闭导航遮罩" />}<div ref={drawerRegion}><Sidebar open={open} onClose={() => setOpen(false)} /></div><div className="main-shell" inert={open ? true : undefined}><Header open={open} onMenu={() => setOpen(true)} />{warning && <div role="status" className="storage-notice">{warning}</div>}<main id="main-content"><Outlet /></main><footer className="page-footer"><span>Transformer Learning Lab</span><span>让复杂的概念，变得可以理解。</span></footer></div></div>;
}
