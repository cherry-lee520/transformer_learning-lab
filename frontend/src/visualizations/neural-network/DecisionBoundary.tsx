import { useEffect, useRef, useState } from 'react';
import { sampleDecisionBoundary } from '../../services/mlp/decisionBoundary';
import type { BoundaryGrid } from '../../services/mlp/decisionBoundary';
import { XOR_DATA } from '../../services/mlp/network';
import type { MLPModel } from '../../services/mlp/types';
export function DecisionBoundary({ model, step }: { model: MLPModel; step: number }) {
  const latest=useRef({model,step}), timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [sampled,setSampled]=useState<{grid:BoundaryGrid|null;step:number;error?:string}|null>(null);
  useEffect(()=>{ latest.current={model,step}; if(timer.current!==null)return; timer.current=setTimeout(()=>{
    timer.current=null;
    try { setSampled({grid:sampleDecisionBoundary(latest.current.model),step:latest.current.step}); }
    catch(error){setSampled({grid:null,step:latest.current.step,error:error instanceof Error ? error.message : '边界计算失败。'});}
  },150); },[model,step]);
  useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;},[]);
  const grid=sampled?.grid;
  const x=(value:number)=>65+(value+0.25)/1.5*350, y=(value:number)=>390-(value+0.25)/1.5*350;
  return <section className="panel nn-boundary"><span className="eyebrow">PREDICT ACROSS THE PLANE</span><h2>二维决策边界</h2><p className="nn-caption">紫色偏向类别 1，蓝色偏向类别 0。圆点是训练标签，底色是模型预测概率；用概率 ≥0.5 分类。25×25 网格最多每 150ms 重采样一次。</p>
    {!sampled ? <p role="status">正在采样当前模型…</p> : !grid ? <p role="status">{sampled.error ?? '此视图需要二维输入和单个 Sigmoid 概率输出，当前网络不适用。'}</p> : <><div className="nn-boundary-scroll" tabIndex={0} aria-label="二维决策边界滚动区域"><svg viewBox="0 0 460 440" role="img" aria-label="当前网络真实预测概率的二维决策边界" data-model-step={sampled.step} data-grid-size={grid.size}>
      <rect x="65" y="40" width="350" height="350" fill="#f7f5fc" />{grid.points.map((point,index)=>{
        const cell=350/grid.size, column=index%grid.size,row=Math.floor(index/grid.size), p=point.probability;
        const r=Math.round(223+(143-223)*p),g=Math.round(240+(110-240)*p),b=Math.round(248+(200-248)*p);
        return <rect key={index} x={65+column*cell} y={40+(grid.size-1-row)*cell} width={cell+0.2} height={cell+0.2} fill={'rgb('+r+','+g+','+b+')'} data-probability={p}><title>{'x=['+point.x.toFixed(3)+','+point.y.toFixed(3)+']，p='+p.toFixed(6)}</title></rect>;
      })}
      {[0,0.5,1].map(value=><g key={value}><line x1={x(value)} x2={x(value)} y1="40" y2="390" stroke="white" opacity=".45"/><line x1="65" x2="415" y1={y(value)} y2={y(value)} stroke="white" opacity=".45"/><text x={x(value)} y="414" textAnchor="middle" className="nn-axis-label">{value}</text><text x="49" y={y(value)+4} textAnchor="end" className="nn-axis-label">{value}</text></g>)}
      {XOR_DATA.map(sample=><g key={sample.id}><circle cx={x(sample.input[0])} cy={y(sample.input[1])} r="11" fill={sample.target===1?'#7450ac':'#dff0f8'} stroke="#fff" strokeWidth="3"/><text x={x(sample.input[0])} y={y(sample.input[1])+4} textAnchor="middle" fill={sample.target===1?'white':'#4a6378'} fontSize="11">{sample.target}</text></g>)}
      <text x="425" y="416" className="nn-axis-label">x₁</text><text x="48" y="26" className="nn-axis-label">x₂</text></svg></div><p className="nn-caption">{'边界取样 Step '+sampled.step+'；当前模型 Step '+step+'。取样可能略晚于训练。'}</p></>}
  </section>;
}

