import { ArrowUpRight, FileText, Layers3 } from 'lucide-react';
import { PageContainer } from '../components/PageContainer';
const sections = ['Introduction', 'Background', 'Model Architecture', 'Why Self-Attention', 'Training', 'Results', 'Conclusion'];
export function Paper() {
  return <PageContainer eyebrow="BACK TO THE ORIGINAL IDEA" title="走进原始论文" description="带着逐渐积累的直觉，回到 Transformer 的起点。">
    <section className="paper-hero panel"><span className="paper-icon"><FileText size={36} /></span><div><span className="eyebrow">2017 · ORIGINAL PAPER</span><h2>Attention Is All You Need</h2><p>这篇论文提出了 Transformer 架构，是本项目后续学习内容的主线。我们将逐步把概念、图示与实现连接起来。</p><a className="button secondary" href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">查看 arXiv 原文 <ArrowUpRight size={16} /></a></div></section>
    <div className="paper-layout"><section className="panel"><div className="section-heading"><h2>论文目录</h2><span className="small-tag">结构预览</span></div><ol className="paper-toc">{sections.map((title, i) => <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><strong>{title}</strong><span className="muted">待解读</span></li>)}</ol></section><section className="panel"><h2>从阅读，到理解</h2><p className="muted mt-3">后续将在这里提供分段解读、知识点关联与交互图示。</p><div className="empty-region"><Layers3 size={36} /><strong>交互式论文导读预留区域</strong><span>T01 仅搭建基础界面</span></div><p className="muted text-sm">原文在新标签页打开。本阶段不包含 PDF 阅读器。</p></section></div>
  </PageContainer>;
}
