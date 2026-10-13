import { useMemo, useState } from 'react';
import { useMLPTraining } from './useMLPTraining';
import { NetworkControls } from './NetworkControls';
import { ModelExplorer } from './ModelExplorer';
import { BackpropInspector } from './BackpropInspector';
import { GradientCheckPanel } from './GradientCheckPanel';
import { LossExplorer } from './LossExplorer';
import { LossCurve } from '../../visualizations/neural-network/LossCurve';
import { DecisionBoundary } from '../../visualizations/neural-network/DecisionBoundary';
import { XOR_DATA, forwardNetwork } from '../../services/mlp/network';
import { backwardSample } from '../../services/mlp/backprop';
import { formatMathNumber as number } from '../../services/mathDisplay';
const statuses={idle:'已初始化',running:'训练中',paused:'已暂停',stopped:'已停止',finished:'达到更新上限',error:'训练已中止'};
export function NeuralNetworkWorkbench(){
  const engine=useMLPTraining(),[sampleIndex,setSampleIndex]=useState(0);
  const {session,settings,status}=engine;
  const trace=useMemo(()=>backwardSample(session.model,XOR_DATA[sampleIndex],settings.loss),[session.model,sampleIndex,settings.loss]);
  const predictions=useMemo(()=>XOR_DATA.map(sample=>({sample,prediction:forwardNetwork(session.model,sample.input).prediction})),[session.model]);
  const probabilistic=session.model.layers.at(-1)!.activation==='sigmoid';
  const correct=probabilistic?predictions.filter(item=>(item.prediction>=0.5?1:0)===item.sample.target).length:null;
  const atLimit=session.step>=settings.maxSteps;
  return <div className="nn-laboratory"><section className="panel nn-console"><div className="nn-section-head"><div><span className="eyebrow">TRAIN WITH REAL NUMBERS</span><h2>训练控制台</h2></div><span className={'nn-status '+status} role="status" aria-label="训练状态" data-status={status}>{statuses[status]}</span></div><div className="nn-metrics"><div><span>参数更新 Step</span><strong><output aria-label="训练更新次数">{session.step}</output></strong></div><div><span>完整数据遍历 Epoch</span><strong><output aria-label="训练 Epoch">{session.epoch}</output></strong></div><div><span>全 XOR 平均 Loss</span><strong><output aria-label="当前训练损失">{number(session.loss)}</output></strong></div><div><span>学习率 η</span><strong>{settings.learningRate}</strong></div><div><span>最近批量梯度 L₂</span><strong>{session.snapshots.length?number(session.snapshots.at(-1)!.backward.norm):'尚未更新'}</strong></div></div><div className="nn-training-buttons"><button className="button secondary" disabled={status==='running'||atLimit} onClick={engine.step}>单步训练</button><button className="button primary" disabled={status==='running'||atLimit} onClick={engine.start}>{status==='paused'?'继续训练':'连续训练'}</button><button className="button secondary" disabled={status!=='running'} onClick={engine.pause}>暂停训练</button><button className="button secondary" disabled={status==='stopped'} onClick={engine.stop}>停止训练</button><button className="button secondary" onClick={engine.reinitialize}>重置模型</button></div><p className="nn-operation-note" role="status" aria-label="训练操作反馈">{engine.message}</p><p className="nn-caption">默认网络 2→4→1，隐藏 Tanh / 输出 Sigmoid，Xavier 随机初始化、种子 42、BCE、学习率 0.5、批量 4、2000 次更新。单步 = 一次批量 SGD；Epoch = 已处理样本数 ÷ 4 的完整次数。其他设置不保证收敛。</p></section>
    <div className="nn-workspace"><NetworkControls engine={engine}/><div className="nn-main-column"><section className="panel nn-data-picker"><label>观察哪个 XOR 输入？<select aria-label="当前前向样本" value={sampleIndex} onChange={event=>setSampleIndex(Number(event.target.value))}>{XOR_DATA.map((sample,index)=><option value={index} key={sample.id}>{'['+sample.input.join(', ')+'] → '+sample.target}</option>)}</select></label><p>这里只切换图和前向/单样本梯度的观察对象，不改变训练数据集。</p></section><ModelExplorer key={'explorer'+engine.revision} session={session} trace={trace}/><BackpropInspector key={'backprop'+engine.revision} session={session} live={trace}/></div></div>
    <div className="nn-bottom-grid"><LossCurve key={'curve'+engine.revision} history={session.history} onClear={engine.clearCurve}/><DecisionBoundary model={session.model} step={session.step}/></div>
    <section className="panel nn-xor-results"><div className="nn-section-head"><div><span className="eyebrow">FOUR SAMPLES, NO SHORTCUTS</span><h2>XOR 的当前预测</h2></div><output className={'nn-accuracy '+(correct===4?'success':'')} aria-label="XOR 分类正确数">{correct===null?'当前输出不是概率':correct+'/4 正确'}</output></div><div className="nn-table-scroll" tabIndex={0} aria-label="XOR 预测结果"><table><thead><tr><th>输入 x₁</th><th>输入 x₂</th><th>标签 y</th><th>{probabilistic?'预测概率 ŷ':'模型输出 ŷ'}</th><th>预测类别</th><th>结果</th></tr></thead><tbody>{predictions.map(({sample,prediction})=><tr key={sample.id} data-xor-sample={sample.id} data-probability={prediction} data-correct={probabilistic?(prediction>=0.5?1:0)===sample.target:'not-applicable'}><td>{sample.input[0]}</td><td>{sample.input[1]}</td><td>{sample.target}</td><td>{number(prediction)}</td><td>{probabilistic?(prediction>=0.5?1:0):'不作概率分类'}</td><td>{probabilistic?((prediction>=0.5?1:0)===sample.target?'正确':'待学习'):'—'}</td></tr>)}</tbody></table></div><p className="nn-caption">单个仿射分类器只能给出一条直线，无法将 XOR 的对角类别分开。带非线性的隐藏层可以组合特征；是否学会仍由真实训练结果决定。此实验没有验证集，不代表泛化性能。</p></section>
    <LossExplorer trace={trace} loss={settings.loss}/><GradientCheckPanel key={'check'+engine.revision} engine={engine}/>
    <p className="nn-footer-note">模型、曲线和快照只保留在当前实验页面；刷新或离开后重置。课程学习进度独立保存。训练始终在浏览器 CPU 上进行，没有远程服务、GPU 或自动微分框架。</p>
  </div>;
}

