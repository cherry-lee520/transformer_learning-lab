import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
import type { TrainingMetric } from '../../services/transformerTraining';
export function TrainingCharts({history}:{history:TrainingMetric[]}) {
  if(!history.length)return <div className="lesson-callout callout-info">尚无训练指标。开始训练后显示来自后端的真实记录，不预填损失曲线。</div>;
  const first=history[0].step,last=Math.max(first+1,history.at(-1)!.step),maximum=Math.max(.01,...history.flatMap(r=>[r.train_loss,r.validation_loss]))*1.1;
  return <div className="tt-charts" data-history-count={history.length}><section><h3>真实 Loss · 每 Epoch</h3><CartesianPlot label="训练与验证 Loss 曲线" xDomain={[first,last]} yDomain={[0,maximum]} series={[
    {id:'train-loss',label:'Training Loss',color:'#8163c5',points:history.map(r=>({x:r.step,y:r.train_loss}))},
    {id:'validation-loss',label:'Validation Loss',color:'#40a4aa',points:history.map(r=>({x:r.step,y:r.validation_loss}))},
  ]}/></section><section><h3>验证准确率 · 自回归生成</h3><CartesianPlot label="验证 Token 与 Sequence Accuracy 曲线" xDomain={[first,last]} yDomain={[0,1.05]} series={[
    {id:'token-accuracy',label:'Validation Token Accuracy',color:'#40a4aa',points:history.map(r=>({x:r.step,y:r.validation_token_accuracy}))},
    {id:'sequence-accuracy',label:'Validation Sequence Accuracy（含 EOS）',color:'#ce8b56',points:history.map(r=>({x:r.step,y:r.validation_sequence_accuracy}))},
  ]}/></section><p className="lr-caption">横轴为实际更新 Step。训练指标在 Teacher Forcing + Dropout 下累计，验证 Loss 使用真实历史，验证准确率使用 Greedy 自回归，排除 PAD 标签、包含 EOS。最多保留最近 300 点。</p></div>;
}
