import { useState } from 'react';
import { ArrowLeft, BookOpen, FlaskConical } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
import { ACTIVATIONS, computeNeuron } from '../services/neuronMath';
import type { NeuronConfig } from '../services/neuronMath';
import { formatNumber } from '../services/neuron';
import { lessonById, lessonPath } from '../lessons';
import { NEURON_EXAMPLES, cloneConfig } from '../experiments/neuron/examples';
import { useForwardPlayer } from '../experiments/neuron/useForwardPlayer';
import { NeuronControls } from '../experiments/neuron/NeuronControls';
import { ForwardStepper } from '../experiments/neuron/ForwardStepper';
import { NeuronGraph } from '../visualizations/neuron/NeuronGraph';
import { ActivationPlot } from '../visualizations/neuron/ActivationPlot';
import { NeuronChallenges } from '../experiments/neuron/NeuronChallenges';
import '../styles/lesson.css';
import '../styles/neuron-lab.css';
import 'katex/dist/katex.min.css';

function NeuronWorkbench() {
  const [params] = useSearchParams();
  const from = params.get('from');
  const returnId = from && lessonById.has(from) ? from : 'neuron-forward';
  const [config, setConfig] = useState<NeuronConfig>(() => cloneConfig(NEURON_EXAMPLES[0].config));
  const [revision, setRevision] = useState(0);
  const player = useForwardPlayer();
  const result = computeNeuron(config);
  function changeConfig(next: NeuronConfig, replace = false) {
    if (!computeNeuron(next)) return;
    player.reset(); setConfig(next);
    if (replace) setRevision(value => value + 1);
  }
  if (!result) return <PageContainer eyebrow="NEURON LAB" title="参数暂不可用" description="请恢复默认参数后重新观察计算。"><button className="button primary" onClick={() => changeConfig(cloneConfig(NEURON_EXAMPLES[0].config), true)}>恢复默认参数</button></PageContainer>;
  return <PageContainer eyebrow="VISUAL NEURON LABORATORY" title="一个神经元，怎样计算？" description="从输入出发，亲手调整参数，沿着信息流理解一次真实的前向传播。">
    <div className="lab-return-links"><Link className="text-link" to="/laboratory"><ArrowLeft size={15} />返回实验列表</Link><Link className="text-link" to={lessonPath(returnId)}><BookOpen size={15} />返回原课时</Link></div>
    <div className="neuron-lab-intro"><div><span className="hero-label"><FlaskConical size={14} /> T04 · 可以亲手验证的数学</span><h2>改变一个数，观察整条计算路径。</h2><p>z = 输入与权重的乘积之和 + 偏置，y = 激活函数(z)。当前为 {result.inputs.length} 个输入 · {ACTIVATIONS[result.activationType].label}。</p></div><div className="lab-live-result"><span>激活前 z <strong aria-label="实验激活前值">{formatNumber(result.preActivation)}</strong></span><span className="live-arrow" aria-hidden="true">→</span><span>最终输出 y <output aria-label="实验输出" aria-live="polite">{formatNumber(result.output)}</output></span></div></div>
    <nav className="lab-jump-links" aria-label="实验区域导航"><a href="#neuron-parameters">参数控制</a><a href="#neuron-structure">神经元结构</a><a href="#neuron-steps">计算步骤</a><a href="#neuron-activation">激活函数</a><a href="#neuron-challenges">教学挑战</a></nav>
    <div className="neuron-workbench"><NeuronControls config={config} revision={revision} onChange={changeConfig} onEdit={player.reset} /><NeuronGraph result={result} step={player.step} /><ForwardStepper result={result} player={player} /><ActivationPlot result={result} onActivation={activationType => changeConfig({ ...config, activationType })} /></div><NeuronChallenges />
    <p className="lab-scope-note">这是单个神经元的前向传播实验。实验参数和挑战保留在当前页面会话中；课程学习进度仍由你在教材中手动标记。</p>
  </PageContainer>;
}
export function NeuronLaboratory() {
  const { experimentId } = useParams<{ experimentId: string }>();
  if (experimentId !== 'neuron') return <PageContainer eyebrow="EXPERIMENT NOT FOUND" title="找不到这个实验" description="实验地址无效，或者对应实验仍在规划中。"><Link className="button primary" to="/laboratory"><ArrowLeft size={16} />返回实验列表</Link></PageContainer>;
  return <NeuronWorkbench />;
}
