import type { NeuronParameters } from '../../lessons/contentTypes';
import { calculateNeuron, DEFAULT_NEURON, formatNumber, PARAMETER_RANGE } from '../../services/neuron';
import { MathFormula } from './MathFormula';
import { ParameterPanel } from './ParameterPanel';
export function NeuronDemo({ defaults = DEFAULT_NEURON }: { defaults?: NeuronParameters }) {
  const definitions = [{ key: 'x', label: '输入值' }, { key: 'w', label: '权重' }, { key: 'b', label: '偏置' }].map(item => ({ ...item, defaultValue: defaults[item.key as keyof NeuronParameters], ...PARAMETER_RANGE }));
  return <ParameterPanel definitions={definitions}>{values => {
    const result = calculateNeuron({ x: values.x, w: values.w, b: values.b });
    if (!result) return <p role="status">参数暂不可用，请恢复默认值。</p>;
    return <div className="neuron-result"><span className="eyebrow">LINEAR OUTPUT</span><div>y = <output aria-label="神经元输出" aria-live="polite">{formatNumber(result.y)}</output></div><MathFormula display latex={`y = (${formatNumber(values.w)}) \\times (${formatNumber(values.x)}) + (${formatNumber(values.b)}) = ${formatNumber(result.y)}`} label="当前参数代入计算" /><p>先乘权重：{formatNumber(values.w)} × ({formatNumber(values.x)}) = {formatNumber(result.weighted)}<br />再加偏置：{formatNumber(result.weighted)} + ({formatNumber(values.b)}) = {formatNumber(result.y)}</p></div>;
  }}</ParameterPanel>;
}
