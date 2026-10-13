import { ArrowLeft, BookOpen, Activity } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { lessonById, lessonPath } from '../lessons';
import { AffineExplorer } from '../experiments/activation/AffineExplorer';
import { DerivativeExplorer } from '../experiments/activation/DerivativeExplorer';
import { GradientExplorer } from '../experiments/activation/GradientExplorer';
import { ActivationComparison } from '../experiments/activation/ActivationComparison';
import { ActivationChallenges } from '../experiments/activation/ActivationChallenges';
import '../styles/lesson.css';
import '../styles/activation-lab.css';
import 'katex/dist/katex.min.css';
export function ActivationLaboratory() {
  const [params] = useSearchParams();
  const from = params.get('from'), returnId = from && lessonById.has(from) ? from : 'gradients-backprop';
  return <PageContainer eyebrow="ACTIVATION & GRADIENT LABORATORY" title="看见非线性，理解梯度" description="用函数、切线与真实连乘计算，把变化率从一个点连接到一条路径。">
    <div className="ag-return-links"><Link className="text-link" to="/laboratory"><ArrowLeft size={15} />返回实验列表</Link><Link className="text-link" to={lessonPath(returnId)}><BookOpen size={15} />返回原课时</Link></div>
    <div className="ag-hero"><div><span className="hero-label"><Activity size={14} /> T05 · 从形状到变化率</span><h2>函数决定输出，导数描述局部变化。</h2><p>先探索非线性，再观察切线，最后把各层的局部变化相乘。所有曲线和数值都来自共用数学核心。</p></div><div className="ag-hero-formula">f(x)<span>→</span>f′(x)<span>→</span>∏ wᵢ f′(zᵢ)</div></div>
    <nav className="ag-jump-links" aria-label="激活实验区域导航"><a href="#activation-affine">A · 非线性</a><a href="#activation-derivative">B · 导数与切线</a><a href="#activation-chain">C · 梯度传播</a><a href="#activation-comparison">D · 同步比较</a><a href="#activation-challenges">E · 随堂挑战</a></nav>
    <div className="ag-laboratory"><AffineExplorer /><DerivativeExplorer /><GradientExplorer /><ActivationComparison /><ActivationChallenges /></div>
    <p className="ag-scope-note">本实验只解释标量复合函数的链式法则。没有损失函数求导、参数梯度、自动微分、优化器或训练；课程完成状态仍由你在教材中手动标记。</p>
  </PageContainer>;
}
