import { curvePath } from '../../services/plotSampling';
import { unitGradient } from '../../services/gradientChain';
import type { ChainResult } from '../../services/gradientChain';
import { formatMathNumber } from '../../services/mathDisplay';
import { gradientText } from '../../experiments/activation/display';
export function GradientPlot({ result, logarithmic, active, onSelect }: { result: ChainResult; logarithmic: boolean; active: number; onSelect: (layer: number) => void }) {
  const states = [unitGradient(), ...result.steps.map(step => step.gradient)];
  const logs = states.flatMap(state => state.status === 'defined' && state.logMagnitude !== null ? [state.logMagnitude] : []);
  const low = Math.floor(Math.min(-1, ...logs)) - 0.5, high = Math.ceil(Math.max(0, ...logs)) + 0.5;
  const maximum = Math.max(1, ...states.map(state => state.status === 'defined' ? state.magnitude : 0)) * 1.1;
  const x = (index: number) => 76 + index / result.steps.length * 464;
  const position = (index: number) => {
    const state = states[index];
    if (state.status === 'undefined') return null;
    if (logarithmic) return state.logMagnitude === null ? null : 272 - (state.logMagnitude - low) / (high - low) * 226;
    return 272 - state.magnitude / maximum * 226;
  };
  const points = states.map((_, index) => ({ x: index, y: position(index) }));
  return <div className="ag-chart-scroll" tabIndex={0} aria-label="梯度幅度图滚动区域"><svg viewBox="0 0 580 380" className="ag-gradient-svg" role="group" aria-label="逐层梯度幅度，颜色区分正负">
    <rect x="76" y="36" width="464" height="246" rx="8" className="ag-plot-background" />
    {[0, 0.5, 1].map(fraction => { const py = 272 - fraction * 226; return <g key={fraction}><line x1="76" x2="540" y1={py} y2={py} className="ag-grid-line" /><text x="65" y={py + 4} textAnchor="end" className="ag-axis-label">{logarithmic ? '10^' + formatMathNumber(low + fraction * (high - low)) : formatMathNumber(fraction * maximum)}</text></g>; })}
    <text x="76" y="21" className="ag-axis-label">{logarithmic ? '|dhᵢ/dx| · 对数幅度' : '|dhᵢ/dx| · 线性幅度'}</text>
    <path d={curvePath(points, x, value => value)} fill="none" stroke="#b6a6d9" strokeWidth="2" />
    {logarithmic && <><line x1="76" x2="540" y1="316" y2="316" stroke="#c9c3d5" strokeDasharray="4 4" /><text x="65" y="320" textAnchor="end" className="ag-axis-label">精确零</text></>}
    {states.map((state, index) => {
      const zero = state.status === 'defined' && state.sign === 0;
      const cy = state.status === 'undefined' ? 342 : logarithmic && zero ? 316 : position(index)!;
      const sign = state.status === 'undefined' ? 'undefined' : state.sign < 0 ? 'negative' : state.sign > 0 ? 'positive' : 'zero';
      const color = sign === 'negative' ? '#c47c4e' : sign === 'positive' ? '#7765c6' : '#8993a4';
      return <g key={index} role="button" tabIndex={0} aria-label={'查看第 ' + index + ' 层梯度：' + gradientText(state)} aria-pressed={active === index} onClick={() => onSelect(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(index); } }} className="ag-gradient-point" data-layer={index} data-sign={sign} data-gradient={state.status === 'defined' ? state.value : 'undefined'} data-magnitude={state.status === 'defined' ? state.magnitude : 'undefined'} data-log={state.status === 'defined' && state.logMagnitude !== null ? state.logMagnitude : 'none'}><title>{'h' + index + ' 对原始输入的导数：' + gradientText(state)}</title><circle cx={x(index)} cy={cy} r={active === index ? 8 : 6} fill={color} stroke="white" strokeWidth="2" />{(zero || state.status === 'undefined') && <text x={x(index)} y={cy + 4} textAnchor="middle" fill="white" fontSize="10">{zero ? '0' : '?'}</text>}<text x={x(index)} y="365" textAnchor="middle" className="ag-axis-label">{'h' + index}</text></g>;
    })}
  </svg></div>;
}
