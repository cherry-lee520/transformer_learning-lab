import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { NeuronComputation } from '../../services/neuronMath';
import { ACTIVATIONS } from '../../services/neuronMath';
import { formatNumber } from '../../services/neuron';
import { forwardSteps } from '../../experiments/neuron/steps';
import { graphLayout } from './layout';
import type { Position } from './layout';
export function NeuronGraph({ result, step }: { result: NeuronComputation; step: number }) {
  const [compact, setCompact] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState('sum');
  useEffect(() => {
    const query = window.matchMedia('(max-width: 650px)');
    const update = () => setCompact(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const layout = graphLayout(result.inputs.length, compact);
  const active = forwardSteps(result)[step - 1];
  const descriptions: Record<string, { title: string; text: string }> = {
    sum: { title: '加权求和与偏置', text: `乘积之和为 ${formatNumber(result.weightedSum)}，加上一次偏置 ${formatNumber(result.bias)}，得到激活前 z = ${formatNumber(result.preActivation)}。` },
    bias: { title: '偏置 b', text: `当前为 ${formatNumber(result.bias)}。偏置加在所有乘积的总和上，不是每个输入各加一次。` },
    activation: { title: `激活函数 ${ACTIVATIONS[result.activationType].label}`, text: `接收 z = ${formatNumber(result.preActivation)}，输出 ${formatNumber(result.output)}。${ACTIVATIONS[result.activationType].description}` },
    output: { title: '最终输出 y', text: `当前 y = ${formatNumber(result.output)}。这是激活后的值，与激活前 z 要区分。` },
  };
  result.inputs.forEach((input, index) => {
    descriptions[`input-${index}`] = { title: `输入 x${index + 1}`, text: `当前值为 ${formatNumber(input)}；它将乘以对应权重 w${index + 1}。` };
    descriptions[`weight-${index}`] = { title: `权重 w${index + 1}`, text: `当前值为 ${formatNumber(result.weights[index])}，是${result.weights[index] > 0 ? '正' : result.weights[index] < 0 ? '负' : '零'}权重。这一路的贡献为 ${formatNumber(input)} × (${formatNumber(result.weights[index])}) = ${formatNumber(result.weightedTerms[index])}。` };
  });
  const explanation = descriptions[selected] ?? descriptions.sum;
  function node(id: string, position: Position, label: string, value: number, extra?: string, rectangle = false): ReactNode {
    return <g key={`node-${id}`} role="button" tabIndex={0} aria-label={`${descriptions[id].title}：${formatNumber(value)}`} data-node={id} data-value={value} className={`graph-node ${active.nodes.includes(id) ? 'is-active' : ''} ${selected === id ? 'is-selected' : ''}`} transform={`translate(${position.x},${position.y})`} onClick={() => setSelected(id)} onMouseEnter={() => setSelected(id)} onFocus={() => setSelected(id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(id); } }}><title>{descriptions[id].text}</title>{rectangle ? <rect className="node-shape" x={compact ? -32 : -48} y="-27" width={compact ? 64 : 96} height="54" rx="12" /> : <circle className="node-shape" r={id === 'sum' || id === 'activation' ? 40 : compact ? 28 : 34} />}<text y={extra ? -10 : -6} className="node-label">{label}</text><text y={extra ? 7 : 14} className="node-number">{formatNumber(value)}</text>{extra && <text y="21" className="node-detail">{extra}</text>}</g>;
  }
  function edge(id: string, path: string, sign = 'neutral') { return <path key={`edge-${id}`} d={path} data-edge={id} className={`graph-edge weight-${sign} ${active.edges.includes(id) ? 'is-active' : ''}`} />; }
  const sum = layout.sum, activation = layout.activation, output = layout.output, bias = layout.bias;
  return <section className="panel neuron-graph-panel" id="neuron-structure" aria-labelledby="graph-heading"><div className="lab-panel-heading"><div><span className="eyebrow">A SINGLE NEURON</span><h2 id="graph-heading">看见一次计算</h2></div><div className="graph-zoom"><button className="icon-button" aria-label="缩小结构图" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.25))}><Minus size={16} /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" aria-label="放大结构图" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + 0.25))}><Plus size={16} /></button></div></div>
    <p className="lab-muted">点击或聚焦节点查看解释。数字始终展示当前完整结果，高亮指示当前计算步骤。</p><div className="graph-scroll" tabIndex={0} aria-label="可缩放神经元结构图"><div style={{ width: `${zoom * 100}%` }}><svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="neuron-svg" role="group" aria-label="神经元计算结构">
      {result.inputs.map((_, index) => {
        const input = layout.inputs[index], weight = layout.weights[index];
        const path = compact ? `M ${input.x} ${input.y + 28} L ${weight.x} ${weight.y - 27} M ${weight.x} ${weight.y + 27} C ${weight.x} 235 ${sum.x} 230 ${sum.x} ${sum.y - 40}` : `M ${input.x + 34} ${input.y} L ${weight.x - 48} ${weight.y} M ${weight.x + 48} ${weight.y} C 290 ${weight.y} 280 ${sum.y} ${sum.x - 40} ${sum.y}`;
        return edge(`term-${index}`, path, result.weights[index] > 0 ? 'positive' : result.weights[index] < 0 ? 'negative' : 'zero');
      })}
      {edge('bias', compact ? `M ${bias.x - 28} ${bias.y} L ${sum.x + 40} ${sum.y}` : `M ${bias.x} ${bias.y + 34} L ${sum.x} ${sum.y - 40}`)}
      {edge('activation', compact ? `M ${sum.x} ${sum.y + 40} L ${activation.x} ${activation.y - 40}` : `M ${sum.x + 40} ${sum.y} L ${activation.x - 40} ${activation.y}`)}
      {edge('output', compact ? `M ${activation.x} ${activation.y + 40} L ${output.x} ${output.y - 28}` : `M ${activation.x + 40} ${activation.y} L ${output.x - 34} ${output.y}`)}
      {result.inputs.map((input, index) => node(`input-${index}`, layout.inputs[index], `x${index + 1}`, input))}
      {result.weights.map((weight, index) => node(`weight-${index}`, layout.weights[index], `w${index + 1}`, weight, `乘积 ${formatNumber(result.weightedTerms[index])}`, true))}
      {node('sum', sum, 'Σ + b → z', result.preActivation)}
      {node('bias', bias, 'b', result.bias)}
      {node('activation', activation, ACTIVATIONS[result.activationType].label, result.output)}
      {node('output', output, 'y', result.output)}
    </svg></div></div><div className="weight-legend"><span className="positive">正权重</span><span className="negative">负权重</span><span className="zero">零权重 · 虚线</span></div><div className="node-explanation" role="note"><strong>{explanation.title}</strong><p>{explanation.text}</p></div>
  </section>;
}
