import { ACTIVATIONS, sampleActivation } from '../../services/neuronMath';
import type { ActivationType, NeuronComputation } from '../../services/neuronMath';
import { formatNumber } from '../../services/neuron';
import { MathFormula } from '../../components/lesson/MathFormula';
export function ActivationPlot({ result, onActivation }: { result: NeuronComputation; onActivation: (type: ActivationType) => void }) {
  const extent = Math.max(6, Math.ceil(Math.abs(result.preActivation) * 1.15));
  const samples = sampleActivation(result.activationType, -extent, extent)!;
  const yMin = result.activationType === 'sigmoid' ? -0.1 : result.activationType === 'tanh' ? -1.2 : -extent;
  const yMax = result.activationType === 'sigmoid' ? 1.1 : result.activationType === 'tanh' ? 1.2 : extent;
  const x = (value: number) => 46 + (value + extent) / (2 * extent) * 408;
  const y = (value: number) => 268 - (value - yMin) / (yMax - yMin) * 232;
  const path = samples.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.z)},${y(point.y)}`).join(' ');
  return <section className="panel activation-panel" id="neuron-activation" aria-labelledby="activation-heading"><span className="eyebrow">BEFORE & AFTER</span><h2 id="activation-heading">激活函数，让结果发生什么变化？</h2><div className="activation-tabs" role="group" aria-label="切换激活函数曲线">{Object.entries(ACTIVATIONS).map(([type, item]) => <button type="button" aria-pressed={type === result.activationType} key={type} onClick={() => onActivation(type as ActivationType)}>{item.label}</button>)}</div><MathFormula latex={ACTIVATIONS[result.activationType].latex} display label={`${ACTIVATIONS[result.activationType].label} 函数定义`} />
    <svg viewBox="0 0 480 310" className="activation-svg" role="img" aria-label={`${ACTIVATIONS[result.activationType].label} 曲线，当前 z 为 ${formatNumber(result.preActivation)}，y 为 ${formatNumber(result.output)}`}>
      <rect x="46" y="36" width="408" height="232" rx="8" className="plot-background" />
      {[-1, -0.5, 0, 0.5, 1].map(fraction => <g key={fraction}><line x1={x(fraction * extent)} x2={x(fraction * extent)} y1="36" y2="268" className="plot-grid" /><text x={x(fraction * extent)} y="288" className="plot-label">{formatNumber(fraction * extent)}</text></g>)}
      <line x1="46" x2="454" y1={y(0)} y2={y(0)} className="plot-axis" /><line x1={x(0)} x2={x(0)} y1="36" y2="268" className="plot-axis" /><text x="466" y="303" className="plot-label">z</text><text x="24" y="26" className="plot-label">f(z)</text><text x="24" y="44" className="plot-label">{formatNumber(yMax)}</text><text x="24" y="268" className="plot-label">{formatNumber(yMin)}</text>
      <path d={path} className="activation-curve" data-activation={result.activationType} /><line x1={x(result.preActivation)} x2={x(result.preActivation)} y1={y(0)} y2={y(result.output)} className="plot-guide" /><circle cx={x(result.preActivation)} cy={y(result.output)} r="6" className="activation-point" data-z={result.preActivation} data-y={result.output} />
    </svg><div className="activation-values"><span>激活前 z <strong>{formatNumber(result.preActivation)}</strong></span><span aria-hidden="true">→</span><span>激活后 y <strong>{formatNumber(result.output)}</strong></span></div><p className="lab-muted">{ACTIVATIONS[result.activationType].description} 曲线由真实函数采样；横轴自动扩展以包含当前 z。显示值最多保留 6 位小数，计算使用原始精度。</p>
  </section>;
}
