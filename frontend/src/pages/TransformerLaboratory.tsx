import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PageContainer } from '../components/PageContainer';
import { lessonById, lessonPath } from '../lessons';
import { TransformerWorkbench } from '../experiments/transformer/TransformerWorkbench';
import '../styles/lesson.css';
import '../styles/language-lab.css';
import '../styles/attention-lab.css';
import '../styles/transformer-lab.css';
import 'katex/dist/katex.min.css';
export function TransformerLaboratory() {
  const [params]=useSearchParams(),from=params.get('from'),attention=from==='attention-laboratory';
  const id=from&&lessonById.has(from)?from:'transformer';
  return <PageContainer eyebrow="TRANSFORMER ARCHITECTURE LABORATORY" title="Transformer 完整架构实验室" description="组装原始 Post-LN Encoder–Decoder，逐步追踪真实张量、注意力和下一个 Token 的概率。"><div className="ag-return-links"><Link className="text-link" to="/laboratory"><ArrowLeft size={15}/>返回实验列表</Link>{attention?<Link className="text-link" to="/laboratory/attention"><ArrowLeft size={15}/>返回 Attention 实验室</Link>:<Link className="text-link" to={lessonPath(id)}><BookOpen size={15}/>返回原课时</Link>}</div><TransformerWorkbench/></PageContainer>;
}
