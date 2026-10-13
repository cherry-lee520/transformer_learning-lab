import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { lessonById, lessonPath } from '../lessons';
import { AttentionWorkbench } from '../experiments/attention/AttentionWorkbench';
import '../styles/lesson.css';
import '../styles/language-lab.css';
import '../styles/attention-lab.css';
import 'katex/dist/katex.min.css';
const transformerEntry = <Link className="text-link" to="/laboratory/transformer?from=attention-laboratory">进入 Transformer 架构实验室 →</Link>;
export function AttentionLaboratory() {
  const [params]=useSearchParams(), from=params.get('from'), language=from==='language-representation';
  const returnId=from&&lessonById.has(from)?from:'attention';
  return <PageContainer eyebrow="ATTENTION MECHANISM LABORATORY" title="Attention 核心机制实验室" description="从输入矩阵到信息混合，亲手完成缩放点积注意力。"><div className="ag-return-links"><Link className="text-link" to="/laboratory"><ArrowLeft size={15}/>返回实验列表</Link>{language?<Link className="text-link" to="/laboratory/language-representation"><ArrowLeft size={15}/>返回语言表示实验室</Link>:<Link className="text-link" to={lessonPath(returnId)}><BookOpen size={15}/>返回原课时</Link>}{transformerEntry}</div><AttentionWorkbench/></PageContainer>;
}
