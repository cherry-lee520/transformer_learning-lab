import { ArrowLeft, BookOpen, Network } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { lessonById, lessonPath } from '../lessons';
import { NeuralNetworkWorkbench } from '../experiments/neural-network/NeuralNetworkWorkbench';
import '../styles/lesson.css';
import '../styles/activation-lab.css';
import '../styles/neural-network-lab.css';
import 'katex/dist/katex.min.css';
export function NeuralNetworkLaboratory(){
  const [params]=useSearchParams(),from=params.get('from'),returnId=from&&lessonById.has(from)?from:'loss-training';
  return <PageContainer eyebrow="NEURAL NETWORK TRAINING LABORATORY" title="让一个小网络，真正学会 XOR" description="搭建结构、追踪矩阵、检查梯度，再用真实训练看见参数如何改变预测。"><div className="nn-return-links"><Link className="text-link" to="/laboratory"><ArrowLeft size={15}/>返回实验列表</Link><Link className="text-link" to={lessonPath(returnId)}><BookOpen size={15}/>返回原课时</Link></div><div className="nn-hero"><Network size={30}/><div><span className="hero-label">T06 · 从一个预测，到一次学习</span><h2>前向传播给出答案，反向传播告诉参数怎样调整。</h2><p>每条连接、每次损失和每个预测都来自当前模型。你可以暂停、检查任意最近步骤，或换一种结构重新开始。</p></div></div><NeuralNetworkWorkbench/></PageContainer>;
}

