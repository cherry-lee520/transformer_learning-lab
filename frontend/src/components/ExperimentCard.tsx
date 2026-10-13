import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { experiments, experimentPath } from '../experiments/catalog';
export function ExperimentCard({ experiment, index }: { experiment: typeof experiments[number]; index: number }) {
  return <article className="experiment-card"><div className={`experiment-art tone-${index % 3}`} aria-hidden="true">{experiment.symbol}<span className="art-grid" /></div><div className="experiment-body"><span className="eyebrow">{experiment.tag}</span><h3>{experiment.title}</h3><p>{experiment.description}</p><Link className="text-link" to={experimentPath(experiment.id)}>{experiment.path ? experiment.entryLabel ?? '进入实验' : '进入实验预览'} <ArrowUpRight size={16} /></Link></div></article>;
}
