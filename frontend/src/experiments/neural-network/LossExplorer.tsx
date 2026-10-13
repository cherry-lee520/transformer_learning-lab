import { useMemo } from 'react';
import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
import { mseLoss, probabilityBCE } from '../../services/mlp/loss';
import { MathFormula } from '../../components/lesson/MathFormula';
import { formatMathNumber as number } from '../../services/mathDisplay';
import type { LossType, SampleBackward } from '../../services/mlp/types';
export function LossExplorer({ trace, loss }: { trace: SampleBackward; loss: LossType }) {
  const points = useMemo(() => Array.from({ length: 201 }, (_, index) => {
    const prediction = index / 200;
    return { x: prediction, y: loss === 'mse' ? mseLoss(prediction, trace.sample.target).value : probabilityBCE(prediction, trace.sample.target) };
  }), [loss, trace.sample.target]);
  const inside = trace.forward.prediction >= 0 && trace.forward.prediction <= 1;
  return <section className="panel nn-loss-explorer"><span className="eyebrow">MEASURE THE MISMATCH</span><h2>损失如何衡量预测？</h2><div className="nn-metrics compact"><div><span>真实标签 y</span><strong>{trace.sample.target}</strong></div><div><span>当前预测 ŷ</span><strong>{number(trace.forward.prediction)}</strong></div><div><span>单样本 Loss</span><strong><output aria-label="当前单样本损失">{number(trace.loss)}</output></strong></div></div><div className="nn-loss-grid"><CartesianPlot label="损失随预测变化的真实函数" xDomain={[0,1]} yDomain={[0,loss === 'mse' ? 1.1 : 6]} series={[{id:'prediction-loss',label:loss.toUpperCase()+' · y='+trace.sample.target,color:'#8b6ac4',points}]} markers={inside ? [{id:'loss-current',x:trace.forward.prediction,y:trace.loss,color:'#cf8a52'}] : []} /><div className="nn-note"><MathFormula latex={loss === 'mse' ? 'L=(\\hat y-y)^2' : 'L=\\operatorname{softplus}(z)-yz,\\quad \\hat y=\\sigma(z)'} display label="当前损失定义" /><p>曲线横轴是假设预测值 ŷ，范围 0～1；点来自当前模型。MSE 不含 1/2，训练对批内样本取均值。</p><p>BCE 的错误端点损失趋于无穷，曲线在端点断开；训练使用等价的稳定 logit 形式，不裁切概率。曲线超过纵轴部分已裁切。</p>{!inside && <p>当前 MSE 预测在 0～1 之外，数值仍正常计算，点不显示在此区间内。</p>}</div></div></section>;
}

