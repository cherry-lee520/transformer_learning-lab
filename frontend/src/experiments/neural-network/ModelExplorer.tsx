import { useState } from 'react';
import { NetworkGraph } from '../../visualizations/neural-network/NetworkGraph';
import type { NetworkSelection } from '../../visualizations/neural-network/NetworkGraph';
import type { SampleBackward, TrainingSession } from '../../services/mlp/types';
import { formatMathNumber as number } from '../../services/mathDisplay';
import { TensorView } from './TensorView';
import { ForwardInspector } from './ForwardInspector';
export function ModelExplorer({ session, trace }: { session: TrainingSession; trace: SampleBackward }) {
  const [selected,setSelected]=useState<NetworkSelection>({kind:'node',layer:0,row:0});
  const [view,setView]=useState({step:session.step,layers:0});
  const visible=view.step===session.step?view.layers:0;
  const setVisible=(layers:number)=>setView({step:session.step,layers});
  const model=session.model;
  const node=selected.kind==='node'&&selected.layer>0?trace.forward.layers[selected.layer-1]:null;
  const parameters=selected.kind==='node'&&selected.layer>0?model.layers[selected.layer-1]:null;
  return <><section className="panel nn-network"><span className="eyebrow">THE CURRENT MODEL</span><h2>看见每一条真实连接</h2><p className="nn-caption">{'当前模型 Step '+session.step+' · 样本 '+trace.sample.id+'。图中的梯度是这个样本在当前模型上的梯度；下方训练快照展示实际训练批的平均梯度。参数更新后，前向步骤回到输入层。'}</p><div className="nn-network-layout"><div><NetworkGraph model={model} forward={trace.forward} backward={trace} activeLayer={visible} selected={selected} onSelect={setSelected}/><div className="nn-graph-legend"><span className="positive">正权重</span><span className="negative">负权重</span><span>线越粗，|w| 越大；零权重为虚线</span></div></div><aside className="nn-selection" aria-live="polite"><h3>选中对象</h3>{selected.kind==='edge'?<><p>{'第 '+(selected.layer+1)+' 层 W['+(selected.row+1)+','+(selected.column+1)+']'}</p><dl><dt>当前权重</dt><dd><output aria-label="选中连接权重">{number(model.layers[selected.layer].weights[selected.row][selected.column])}</output></dd><dt>当前单样本 dL/dW</dt><dd><output aria-label="选中连接梯度">{number(trace.layers[selected.layer].weights[selected.row][selected.column])}</output></dd></dl></>:node&&parameters?<><p>{'第 '+selected.layer+' 层神经元 '+(selected.row+1)}</p><TensorView name="输入列向量" values={node.input} vector/><dl><dt>z</dt><dd>{number(node.z[selected.row])}</dd><dt>a</dt><dd>{number(node.a[selected.row])}</dd><dt>b</dt><dd>{number(parameters.biases[selected.row])}</dd><dt>当前单样本 delta</dt><dd>{number(trace.layers[selected.layer-1].delta[selected.row])}</dd></dl></>:<><p>{'输入 x'+(selected.row+1)}</p><strong>{number(trace.forward.input[selected.row])}</strong><p>输入节点没有可训练偏置，也不执行激活。</p></>}<p className="nn-caption">点击节点/连线，或 Tab 聚焦后按 Enter/空格查看。窄屏可在图内滚动。</p></aside></div></section><ForwardInspector model={model} trace={trace.forward} visibleLayers={visible} setVisibleLayers={setVisible}/></>;
}

