import { useState } from 'react';
import { curvePath } from '../../services/plotSampling';
import { formatMathNumber as number } from '../../services/mathDisplay';
import type { LossRecord } from '../../services/mlp/types';
export function LossCurve({ history, onClear }: { history: LossRecord[]; onClear: () => void }) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const selected = history.find(record => record.step === hoveredStep) ?? history.at(-1)!;
  const first = history[0].step, last = Math.max(first+1,history.at(-1)!.step), maximum = Math.max(0.001,...history.map(record=>record.loss))*1.1;
  const x=(value:number)=>58+(value-first)/(last-first)*444, y=(value:number)=>250-value/maximum*208;
  return <section className="panel nn-loss-curve"><div className="nn-section-head"><div><span className="eyebrow">REAL TRAINING HISTORY</span><h2>Loss 曲线</h2></div><button className="button secondary" onClick={onClear}>清空损失曲线</button></div><p className="nn-caption">记录每次更新后的全 XOR 数据平均 Loss，最多保留最近 300 点；单步并不保证损失下降。鼠标移动或下方滑块查看历史。</p><div className="nn-chart-scroll" tabIndex={0} aria-label="训练损失曲线滚动区域"><svg viewBox="0 0 550 302" role="img" aria-label="来自真实训练记录的 Loss 曲线" data-history-count={history.length} data-last-step={history.at(-1)!.step}>
    <rect x="58" y="32" width="444" height="218" rx="8" fill="#faf8fe" />{[0,0.5,1].map(f=> <g key={f}><line x1="58" x2="502" y1={y(f*maximum)} y2={y(f*maximum)} stroke="#e8e2f2" /><text x="49" y={y(f*maximum)+4} textAnchor="end" className="nn-axis-label">{number(f*maximum)}</text></g>)}<path data-loss-path="true" d={curvePath(history.map(record=>({x:record.step,y:record.loss})),x,y)} fill="none" stroke="#8a6bc5" strokeWidth="2.5" /><circle cx={x(selected.step)} cy={y(selected.loss)} r="5" fill="#ce8b56" data-selected-loss={selected.loss} /><text x="58" y="280" className="nn-axis-label">{first}</text><text x="502" y="280" textAnchor="end" className="nn-axis-label">{last + ' Step'}</text><text x="58" y="20" className="nn-axis-label">平均 Loss</text><rect x="58" y="32" width="444" height="218" fill="transparent" onPointerMove={event=>{const box=event.currentTarget.getBoundingClientRect();const fraction=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)); const index=Math.round(fraction*(history.length-1));setHoveredStep(history[index].step);}} />
    </svg></div><label className="nn-loss-history">查看历史点<input type="range" aria-label="查看损失历史点" min="0" max={Math.max(0,history.length-1)} step="1" value={history.indexOf(selected)} onChange={event=>setHoveredStep(history[Number(event.target.value)].step)} /></label><output aria-label="所选损失记录">{'Step '+selected.step+' · Epoch '+selected.epoch+' · Loss '+number(selected.loss)}</output></section>;
}

