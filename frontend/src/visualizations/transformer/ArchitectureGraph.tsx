import { useState } from 'react';
import type { TensorStep } from '../../services/transformer/flow';
export function ArchitectureGraph({ steps, selected, onSelect }: { steps: TensorStep[]; selected: string; onSelect: (index: number) => void }) {
  const [zoom, setZoom] = useState(1);
  const counts = { encoder: 0, decoder: 0 };
  const nodes = steps.map((step, index) => ({ step, index, x: step.lane === 'encoder' ? 35 : 440, y: 65 + counts[step.lane]++ * 90 }));
  const height = 110 + Math.max(counts.encoder, counts.decoder) * 90;
  const byId = new Map(nodes.map(node => [node.step.id, node]));
  return <section className="tr-graph-section"><div className="lr-controls"><label className="lr-field">结构图缩放<select aria-label="结构图缩放" value={zoom} onChange={e => setZoom(Number(e.target.value))}><option value={1}>100%</option><option value={1.25}>125%</option><option value={1.5}>150%</option></select></label></div><p className="lr-caption">实线：相邻步骤；紫色虚线：分支旁路，其中 Add & Norm 的输入跳连是残差；橙色虚线：最终 Encoder Memory → Cross-Attention。点击模块或 Tab + Enter 查看真实张量。</p>
    <div className="lr-scroll tr-graph-scroll" tabIndex={0} aria-label="Transformer 架构图，可在内部滚动"><svg viewBox={'0 0 805 ' + height} style={{ width: 805 * zoom, height: height * zoom }} role="group" aria-label="真实 Encoder–Decoder 结构">
      <defs><marker id="tr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="context-stroke"/></marker></defs>
      <text x={35} y={25} className="tr-lane-label">ENCODER · Source → Memory</text><text x={440} y={25} className="tr-lane-label">DECODER · Prefix + Memory → P</text>
      {nodes.flatMap(node => node.step.dependencies.map(id => {
        const source = byId.get(id)!; const cross = source.step.lane !== node.step.lane;
        const skip = !cross && node.y - source.y > 95, active = node.step.id === selected;
        const start = cross ? [source.x + 300, source.y + 30] : [source.x + 150, source.y + 60], end = cross ? [node.x, node.y + 30] : [node.x + 150, node.y];
        const path = cross ? 'M'+start+' H395 V'+end[1]+' H'+end[0] : skip ? 'M'+start+' V'+(start[1]+10)+' H'+(source.x-18)+' V'+(end[1]-10)+' H'+end[0]+' V'+end[1] : 'M'+start+' L'+end;
        return <path key={id+'-'+node.step.id} d={path} fill="none" stroke={cross?'#c98b48':skip?'#a38acb':'#b9b0cc'} strokeWidth={active?2.5:1.4} strokeDasharray={cross||skip?'5 4':undefined} markerEnd="url(#tr-arrow)" data-from={id} data-to={node.step.id}><title>{source.step.title+' → '+node.step.title}</title></path>;
      }))}
      {nodes.map(({step,index,x,y}) => <g key={step.id} role="button" tabIndex={0} aria-label={'查看模块 '+step.title} aria-pressed={step.id===selected} onClick={() => onSelect(index)} onKeyDown={e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(index);} }} data-module={step.id}><rect x={x} y={y} width={300} height={60} rx={10} fill={step.id===selected?'#ede5fc':step.lane==='encoder'?'#f3f7ff':'#faf6ff'} stroke={step.id===selected?'#8262ba':'#dfd8eb'} strokeWidth={step.id===selected?2:1}/><text x={x+13} y={y+24}>{step.title}</text><text className="tr-node-shape" x={x+13} y={y+45}>{step.shape.join(' × ')} · {index+1}/{steps.length}</text><title>{step.explanation}</title></g>)}
    </svg></div></section>;
}
