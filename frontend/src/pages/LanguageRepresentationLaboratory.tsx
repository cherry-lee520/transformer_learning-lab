import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { lessonById, lessonPath } from '../lessons';
import { LanguageWorkbench } from '../experiments/language/LanguageWorkbench';
import '../styles/lesson.css';
import '../styles/activation-lab.css';
import '../styles/language-lab.css';
import 'katex/dist/katex.min.css';
export function LanguageRepresentationLaboratory() {
  const [params] = useSearchParams(), from = params.get('from');
  const returnId = from && lessonById.has(from) ? from : 'embedding';
  return <PageContainer eyebrow="LANGUAGE REPRESENTATION LABORATORY" title="Token、Embedding 与位置编码" description="从一段文本出发，亲手构造 Transformer 的输入矩阵。">
    <div className="ag-return-links"><Link className="text-link" to="/laboratory"><ArrowLeft size={15} />返回实验列表</Link><Link className="text-link" to={lessonPath(returnId)}><BookOpen size={15} />返回原课时</Link></div><LanguageWorkbench />
  </PageContainer>;
}
