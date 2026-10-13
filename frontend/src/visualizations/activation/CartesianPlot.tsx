import { useId } from 'react';
import { curvePath } from '../../services/plotSampling';
import type { CurvePoint } from '../../services/plotSampling';
import { formatMathNumber } from '../../services/mathDisplay';
export interface PlotSeries { id: string; label: string; color: string; points: CurvePoint[]; dashed?: boolean }
export interface PlotMarker { id: string; x: number; y: number; color: string; open?: boolean }
export function CartesianPlot({ label, series, markers = [], xDomain = [-6, 6], yDomain = [-6.5, 6.5] }: { label: string; series: PlotSeries[]; markers?: PlotMarker[]; xDomain?: readonly [number, number]; yDomain?: readonly [number, number] }) {
  const clipId = useId();
  const x = (value: number) => 62 + (value - xDomain[0]) / (xDomain[1] - xDomain[0]) * 474;
  const y = (value: number) => 294 - (value - yDomain[0]) / (yDomain[1] - yDomain[0]) * 258;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return <div className="ag-plot" tabIndex={0} aria-label={label + '，窄屏可横向滚动'}><svg viewBox="0 0 570 344" role="img" aria-label={label}>
    <defs><clipPath id={clipId}><rect x="62" y="36" width="474" height="258" /></clipPath></defs>
    <rect x="62" y="36" width="474" height="258" rx="8" className="ag-plot-background" />
    {ticks.map(fraction => {
      const tx = xDomain[0] + fraction * (xDomain[1] - xDomain[0]), ty = yDomain[0] + fraction * (yDomain[1] - yDomain[0]);
      return <g key={fraction}><line x1={x(tx)} x2={x(tx)} y1="36" y2="294" className="ag-grid-line" /><line x1="62" x2="536" y1={y(ty)} y2={y(ty)} className="ag-grid-line" /><text x={x(tx)} y="315" className="ag-axis-label">{formatMathNumber(tx)}</text><text x="51" y={y(ty) + 4} textAnchor="end" className="ag-axis-label">{formatMathNumber(ty)}</text></g>;
    })}
    <line x1={x(0)} x2={x(0)} y1="36" y2="294" className="ag-axis-line" /><line x1="62" x2="536" y1={y(0)} y2={y(0)} className="ag-axis-line" /><text x="548" y="334" className="ag-axis-label">x</text><text x="48" y="21" className="ag-axis-label">y</text>
    <g clipPath={'url(#' + clipId + ')'}>{series.map(item => <path key={item.id} data-series={item.id} d={curvePath(item.points, x, y)} fill="none" stroke={item.color} strokeWidth={item.dashed ? 4 : 2.6} strokeDasharray={item.dashed ? '7 5' : undefined} />)}{markers.map(point => <circle key={point.id} className="ag-current-point" data-point={point.id} data-x={point.x} data-value={point.y} cx={x(point.x)} cy={y(point.y)} r="5.5" fill={point.open ? 'white' : point.color} stroke={point.open ? point.color : 'white'} strokeWidth="2" />)}</g>
  </svg><div className="ag-legend">{series.map(item => <span key={item.id}><i style={{ background: item.color, opacity: item.dashed ? 0.65 : 1 }} />{item.label}{item.dashed ? ' · 虚线' : ''}</span>)}</div></div>;
}
