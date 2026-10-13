import { useState } from 'react';
import { ParameterInput } from '../../components/ParameterInput';
import { MathFormula } from '../../components/lesson/MathFormula';
import { PARAMETER_RANGE } from '../../services/neuron';
import { computeAffinePair, sampleAffinePair } from '../../services/affineMath';
import type { AffineParameters } from '../../services/affineMath';
import { formatMathNumber as number, latexNumber } from '../../services/mathDisplay';
import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
const defaults: AffineParameters = { w1: 2, b1: 1, w2: 1, b2: 0 };
export function AffineExplorer() {
  const [parameters, setParameters] = useState(defaults), [input, setInput] = useState(2), [revision, setRevision] = useState(0);
  const [includeRelu, setIncludeRelu] = useState(true);
  const result = computeAffinePair(input, parameters)!;
  const samples = sampleAffinePair(parameters)!;
  const extent = Math.max(2, ...samples.flatMap(sample => [Math.abs(sample.result.linearOutput), includeRelu ? Math.abs(sample.result.reluOutput) : 0])) * 1.1;
  return <section className="panel ag-module ag-affine" id="activation-affine" aria-labelledby="affine-heading"><span className="eyebrow">05-A · WHY NONLINEARITY</span><h2 id="affine-heading">两次线性变换，能合并吗？</h2><p className="ag-intro">这里包含偏置，严格地说是仿射变换。先比较两层和等效一层，再在中间加入 ReLU。</p>
    <div className="ag-module-grid"><div className="ag-controls">{(['w1', 'b1', 'w2', 'b2'] as const).map(key => <ParameterInput key={key + revision} scope="仿射" name={key} label={key[0] === 'w' ? '权重' : '偏置'} value={parameters[key]} {...PARAMETER_RANGE} onChange={value => setParameters(current => ({ ...current, [key]: value }))} />)}<ParameterInput key={'x' + revision} scope="仿射" name="x" label="验证输入" value={input} min={-6} max={6} step={0.1} onChange={setInput} /><button className="button secondary" onClick={() => { setParameters(defaults); setInput(2); setRevision(value => value + 1); }}>恢复仿射默认值</button></div>
      <div className="ag-canvas"><label className="ag-check"><input type="checkbox" checked={includeRelu} onChange={event => setIncludeRelu(event.target.checked)} />加入 ReLU 对照曲线</label><CartesianPlot label="两层仿射、等效仿射与 ReLU 对照曲线" yDomain={[-extent, extent]} series={[
        { id: 'affine-two', label: '两层仿射', color: '#7a66ce', points: samples.map(sample => ({ x: sample.x, y: sample.result.linearOutput })) },
        { id: 'affine-merged', label: '合并为一层', color: '#58a1bd', dashed: true, points: samples.map(sample => ({ x: sample.x, y: sample.result.equivalentOutput })) },
        ...(includeRelu ? [{ id: 'affine-relu', label: '中间加入 ReLU', color: '#d08a56', points: samples.map(sample => ({ x: sample.x, y: sample.result.reluOutput })) }] : []),
      ]} markers={[{ id: 'affine-current', x: input, y: result.linearOutput, color: '#7a66ce' }, ...(includeRelu ? [{ id: 'affine-relu-current', x: input, y: result.reluOutput, color: '#d08a56' }] : [])]} /><p className="ag-caption">蓝色虚线与紫色实线重合；橙线在部分区间可能改变形状。参数退化时，加入 ReLU 也可能得到同样的输出。</p></div>
      <aside className="ag-computation"><MathFormula latex="h=w_1x+b_1,\quad y=w_2h+b_2" display label="两次仿射变换" /><MathFormula latex="y=(w_2w_1)x+(w_2b_1+b_2)" display label="合并后的仿射变换" /><MathFormula latex={'y=(' + latexNumber(result.equivalentWeight) + ')x+(' + latexNumber(result.equivalentBias) + ')'} display label="当前等效仿射公式" /><dl className="ag-values"><div><dt>中间 h</dt><dd>{number(result.hidden)}</dd></div><div><dt>两层输出</dt><dd><output aria-label="两层仿射输出">{number(result.linearOutput)}</output></dd></div><div><dt>等效输出</dt><dd><output aria-label="等效仿射输出">{number(result.equivalentOutput)}</output></dd></div><div><dt>两者绝对差</dt><dd>{number(Math.abs(result.linearOutput - result.equivalentOutput))}</dd></div>{includeRelu && <div><dt>ReLU 对照</dt><dd><output aria-label="非线性对照输出">{number(result.reluOutput)}</output></dd></div>}</dl><MathFormula latex="y=w_2\operatorname{ReLU}(w_1x+b_1)+b_2" display label="加入非线性的计算" /></aside>
    </div><div className="ag-note" role="note">没有非线性时，多次仿射变换仍可合并为一次。非线性扩展了可表示的函数形状；是否更适合某个任务，还取决于数据与目标。</div>
  </section>;
}
