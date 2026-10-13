import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { lessonById, lessonPath } from '../lessons';
import { TrainingConsole } from '../experiments/transformer-training/TrainingConsole';
import '../styles/lesson.css';
import '../styles/language-lab.css';
import '../styles/attention-lab.css';
import '../styles/activation-lab.css';
import '../styles/transformer-training.css';
import 'katex/dist/katex.min.css';
export function TransformerTrainingLaboratory(){
  const [params]=useSearchParams(),from=params.get('from'),architecture=from==='transformer-laboratory';
  const id=from&&lessonById.has(from)?from:'implementation';
  return <PageContainer eyebrow="MINI TRANSFORMER TRAINING & INFERENCE" title="Mini Transformer 训练与推理" description="在本地训练 Copy / Reverse，检查真实指标、保存模型，并观察逐 Token 生成和注意力。"><div className="ag-return-links"><Link className="text-link" to="/laboratory">返回实验列表</Link>{architecture?<Link className="text-link" to="/laboratory/transformer">返回 Transformer 架构实验室</Link>:<Link className="text-link" to={lessonPath(id)}>返回原课时</Link>}</div><TrainingConsole/></PageContainer>;
}
