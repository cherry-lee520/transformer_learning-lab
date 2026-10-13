import { useMemo, useState } from 'react';
import { ACTIVATIONS } from '../../services/neuronMath';
import type { ActivationType } from '../../services/neuronMath';
import { evaluateActivation, evaluateActivationVector, sampleActivationDetails } from '../../services/activationMath';
import { ParameterInput } from '../../components/ParameterInput';
import { MathFormula } from '../../components/lesson/MathFormula';
import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
import type { PlotMarker } from '../../visualizations/activation/CartesianPlot';
import { formatMathNumber as number } from '../../services/mathDisplay';
import { ACTIVATION_DETAILS } from './definitions';
const colors: Record<ActivationType, string> = { linear: '#6e9db5', relu: '#cf8a52', sigmoid: '#8b6ac4', tanh: '#58a18b' };
const types = Object.keys(ACTIVATIONS) as ActivationType[];
export function ActivationComparison() {
  const [selected, setSelected] = useState<ActivationType[]>(types), [mode, setMode] = useState('value'), [input, setInput] = useState(1), [detail, setDetail] = useState<ActivationType>('sigmoid');
  const samples = useMemo(() => Object.fromEntries(types.map(type => [type, sampleActivationDetails(type, -6, 6, 481)!])), []);
  const markers: PlotMarker[] = selected.flatMap(type => {
    const point = evaluateActivation(input, type)!;
    if (mode === 'value') return [{ id: type, x: input, y: point.value, color: colors[type] }];
    const current: PlotMarker[] = point.derivative.status === 'defined' ? [{ id: type, x: input, y: point.derivative.value, color: colors[type] }] : [];
    return type === 'relu' ? [...current, { id: 'compare-relu-left', x: 0, y: 0, color: colors[type], open: true }, { id: 'compare-relu-right', x: 0, y: 1, color: colors[type], open: true }] : current;
  });
  const info = ACTIVATION_DETAILS[detail], vector = evaluateActivationVector([-2, 0, 2], detail)!;
  return <section className="panel ag-module ag-comparison-module" id="activation-comparison" aria-labelledby="comparison-heading"><span className="eyebrow">05-D · SAME AXES, DIFFERENT BEHAVIOR</span><h2 id="comparison-heading">放在同一坐标里比较</h2><p className="ag-intro">所有曲线使用相同输入区间和坐标尺度。观察特点与适用情境，不给函数做绝对优劣排名。</p><div className="ag-comparison-controls"><div className="ag-function-choices" role="group" aria-label="选择比较函数">{types.map(type => <label className="ag-check" key={type}><input type="checkbox" checked={selected.includes(type)} onChange={event => setSelected(current => event.target.checked ? [...current, type] : current.filter(item => item !== type))} />{'比较 ' + ACTIVATIONS[type].label}</label>)}</div><label>显示内容<select aria-label="比较曲线内容" value={mode} onChange={event => setMode(event.target.value)}><option value="value">函数值 f(x)</option><option value="derivative">导数 f′(x)</option></select></label></div>
    <div className="ag-comparison-grid"><div><ParameterInput scope="比较" name="x" label="同步输入" value={input} min={-6} max={6} step={0.1} onChange={setInput} />{selected.length === 0 && <p role="status" className="ag-note">请选择至少一个函数。</p>}<CartesianPlot label="四种激活函数同步比较" yDomain={mode === 'value' ? [-6.5, 6.5] : [-0.15, 1.2]} markers={markers} series={selected.map(type => ({ id: 'compare-' + type, label: ACTIVATIONS[type].label, color: colors[type], points: samples[type].map(sample => ({ x: sample.x, y: mode === 'value' ? sample.value : sample.derivative.status === 'defined' ? sample.derivative.value : null })) }))} /><p className="ag-caption">输入统一为 -6～6。函数值纵轴固定为 -6.5～6.5，导数纵轴固定为 -0.15～1.2，勾选变化不会单独缩放某条曲线。</p></div>
      <aside className="ag-computation"><div className="ag-detail-buttons" role="group" aria-label="查看函数解释">{types.map(type => <button key={type} aria-pressed={type === detail} onClick={() => setDetail(type)}>{'了解 ' + ACTIVATIONS[type].label}</button>)}</div><h3>{ACTIVATIONS[detail].label + ' 的特点'}</h3><MathFormula latex={ACTIVATIONS[detail].latex} display label="比较函数定义" /><MathFormula latex={info.derivativeLatex} display label="比较导数定义" /><dl className="ag-feature-list"><div><dt>是否非线性</dt><dd>{info.nonlinear}</dd></div><div><dt>数学输出范围</dt><dd>{info.range}</dd></div><div><dt>正负输入</dt><dd>{info.behavior}</dd></div><div><dt>饱和区域</dt><dd>{info.saturation}</dd></div><div><dt>不可导点</dt><dd>{info.kink}</dd></div><div><dt>梯度特点</dt><dd>{info.gradient}</dd></div></dl><p className="ag-caption">{'向量逐元素计算：[-2, 0, 2] → [' + vector.map(item => number(item.value)).join(', ') + ']。'}</p><p className="ag-caption">浮点计算中，极端 Sigmoid/Tanh 的显示值可能舍入到端点；数学范围仍为开区间。</p></aside>
    </div>
  </section>;
}
