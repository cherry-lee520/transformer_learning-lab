import { FlaskConical, X } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { ExperimentCard } from '../components/ExperimentCard';
import { experiments, experimentPath } from '../experiments/catalog';
export function Laboratory() {
  const [params] = useSearchParams();
  const experiment = experiments.find(item => item.id === params.get('experiment'));
  if (experiment?.path) return <Navigate replace to={experimentPath(experiment.id, params.get('from') ?? undefined)} />;
  return <PageContainer eyebrow="IDEAS COME TO LIFE" title="探索实验室" description="当抽象概念变得可以操作，理解就有了新的入口。">
    <div className="info-banner"><FlaskConical size={21} /><div><strong>为好奇心，留一块实验田。</strong><p>从神经元、梯度与网络训练，到文本、词向量与位置编码，逐步把抽象计算变得可以操作。其余实验仍为规划预览。</p></div><span className="small-tag success">{experiments.filter(item => item.path).length} 项可操作</span></div>
    <div className="lesson-grid experiment-grid">{experiments.map((item, index) => <ExperimentCard key={item.id} experiment={item} index={index} />)}</div>
    {params.has('experiment') && !experiment && <div className="panel experiment-preview" role="alert"><h2>找不到这个实验</h2><p className="muted">请从有效的实验入口继续。</p><Link className="text-link" to="/laboratory">返回实验列表</Link></div>}
    {experiment && <section id="experiment-preview" className="panel experiment-preview" aria-live="polite"><div className="flex items-center justify-between"><span className="eyebrow">EXPERIMENT PREVIEW</span><Link className="icon-button" to="/laboratory" aria-label="关闭实验预览"><X size={18} /></Link></div><h2>{experiment.title}</h2><p>{experiment.description}</p><div className="empty-region"><FlaskConical size={30} /><strong>实验交互将在后续任务中开放</strong><span>当前为实验入口与说明区域。</span></div></section>}
  </PageContainer>;
}
