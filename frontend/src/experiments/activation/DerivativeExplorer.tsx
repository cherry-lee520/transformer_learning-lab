import { useMemo, useState } from 'react';
import { ParameterInput } from '../../components/ParameterInput';
import { MathFormula } from '../../components/lesson/MathFormula';
import { ACTIVATIONS, isActivationType } from '../../services/neuronMath';
import type { ActivationType } from '../../services/neuronMath';
import { evaluateActivation, sampleActivationDetails, tangentValue } from '../../services/activationMath';
import { formatMathNumber as number, latexNumber } from '../../services/mathDisplay';
import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
import type { PlotSeries, PlotMarker } from '../../visualizations/activation/CartesianPlot';
import { ACTIVATION_DETAILS } from './definitions';
import { useInputSweep } from './useInputSweep';
export function DerivativeExplorer() {
  const [type, setType] = useState<ActivationType>('sigmoid'), [input, setInput] = useState(0), [mode, setMode] = useState('value'), [showTangent, setShowTangent] = useState(true);
  const player = useInputSweep(setInput), point = evaluateActivation(input, type)!;
  const samples = useMemo(() => sampleActivationDetails(type, -6, 6, 481)!, [type]);
  const series: PlotSeries[] = [{ id: 'activation-main', label: mode === 'value' ? ACTIVATIONS[type].label : ACTIVATIONS[type].label + ' 导数', color: '#7a66ce', points: samples.map(sample => ({ x: sample.x, y: mode === 'value' ? sample.value : sample.derivative.status === 'defined' ? sample.derivative.value : null })) }];
  const tangent = mode === 'value' && showTangent && point.derivative.status === 'defined';
  if (tangent) series.push({ id: 'tangent', label: '当前位置切线', color: '#d08a56', dashed: true, points: [-6, 6].map(x => ({ x, y: tangentValue(point, x) })) });
  const derivative = point.derivative;
  const currentValue = mode === 'value' ? point.value : derivative.status === 'defined' ? derivative.value : null;
  const markers: PlotMarker[] = currentValue === null ? [] : [{ id: 'derivative-current', x: input, y: currentValue, color: '#7a66ce' }];
  if (mode === 'derivative' && type === 'relu') markers.push({ id: 'relu-left-open', x: 0, y: 0, color: '#7a66ce', open: true });
  const yDomain: [number, number] = mode === 'derivative' ? [-0.15, 1.2] : type === 'sigmoid' ? [-0.15, 1.15] : type === 'tanh' ? [-1.2, 1.2] : [-6.5, 6.5];
  return <section className="panel ag-module ag-derivative-module" id="activation-derivative" aria-labelledby="derivative-heading"><span className="eyebrow">05-B · A LOCAL RATE OF CHANGE</span><h2 id="derivative-heading">移动一点，看见导数与切线</h2><p className="ag-intro">导数描述当前位置附近的变化率；切线是局部近似，不是整个函数的替代。</p>
    <div className="ag-module-grid"><div className="ag-controls"><label>选择激活函数<select aria-label="切线实验激活函数" value={type} onChange={event => { if (isActivationType(event.target.value)) { player.pause(); setType(event.target.value); } }}>{Object.entries(ACTIVATIONS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label><ParameterInput scope="切线" name="x" label="输入" value={input} min={-6} max={6} step={0.1} onEdit={player.pause} onChange={setInput} /><label>曲线内容<select aria-label="切线实验曲线内容" value={mode} onChange={event => setMode(event.target.value)}><option value="value">函数值 f(x)</option><option value="derivative">导数 f′(x)</option></select></label><label className="ag-check"><input type="checkbox" checked={showTangent} disabled={mode !== 'value'} onChange={event => setShowTangent(event.target.checked)} />显示切线</label><button className="button primary" disabled={player.reduced} onClick={player.playing ? player.pause : player.play}>{player.playing ? '暂停输入移动' : '播放输入变化'}</button><p className="ag-caption">{player.reduced ? '已按系统设置减少动态效果，请手动调整输入。' : '自动在 -6～6 扫描；修改输入或函数会暂停。'}</p></div>
      <div className="ag-canvas"><CartesianPlot label={ACTIVATIONS[type].label + (mode === 'value' ? ' 函数与切线' : ' 导数曲线')} series={series} markers={mode === 'derivative' && type === 'relu' ? [...markers, { id: 'relu-right-open', x: 0, y: 1, color: '#7a66ce', open: true }] : markers} yDomain={yDomain} /><p className="ag-caption">{type === 'relu' ? 'ReLU 导数图在零点使用空心端点；断开的线表示该点没有定义。' : mode === 'value' ? '紫色点对应当前输入，橙色虚线使用真实导数计算；图外部分已裁切。' : '这条曲线表示每个输入处的局部导数，而不是原函数的输出。'} 窄屏可在图内横向滚动查看坐标。</p></div>
      <aside className="ag-computation"><MathFormula latex={ACTIVATIONS[type].latex} display label="当前激活函数定义" /><MathFormula latex={ACTIVATION_DETAILS[type].derivativeLatex} display label="当前导数定义" /><dl className="ag-values"><div><dt>当前输入 x</dt><dd>{number(input)}</dd></div><div><dt>函数值 f(x)</dt><dd><output aria-label="当前函数值">{number(point.value)}</output></dd></div><div><dt>局部导数 f′(x)</dt><dd><output aria-label="当前局部导数">{derivative.status === 'defined' ? number(derivative.value) : '未定义'}</output></dd></div></dl>
        {derivative.status === 'undefined' ? <div className="ag-note warning" role="status" aria-label="不可导提示">ReLU 在 x = 0 处不可导：左斜率为 0，右斜率为 1。这里不绘制唯一切线，也不采用优化器中的次梯度约定。</div> : <><p className="ag-caption">输入增加一个很小的量 Δx，输出变化约为 f′(x) × Δx。</p>{tangent && <MathFormula latex={'t(u)=' + latexNumber(point.value) + '+(' + latexNumber(derivative.value) + ')(u-(' + latexNumber(input) + '))'} display label="当前真实切线公式" />}{derivative.underflow && <p className="ag-caption">导数极小，浮点表示下溢为 0，不能当作数学上的精确零。</p>}</>}
      </aside></div>
  </section>;
}
