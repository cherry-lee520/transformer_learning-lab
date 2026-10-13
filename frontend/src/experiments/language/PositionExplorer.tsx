import { useState } from 'react';
import { positionalEncoding, positionalCurves } from '../../services/language/representation';
import type { PipelineResult } from '../../services/language/pipeline';
import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
import { PositionHeatmap } from '../../visualizations/language/PositionHeatmap';
import { MathFormula } from '../../components/lesson/MathFormula';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import { MatrixView } from './MatrixView';
import { NumberField } from './Controls';
export function PositionExplorer({ dim, result }: { dim: number; result: PipelineResult | null }) {
  const [length, setLength] = useState(8), [position, setPosition] = useState(0), [otherPosition, setOtherPosition] = useState(1), [column, setColumn] = useState(0);
  const pos = Math.min(position, length - 1), other = Math.min(otherPosition, length - 1), col = Math.min(column, dim - 1);
  const values = positionalEncoding(length, dim), curves = positionalCurves(length, col, dim);
  return <section><h2>F · 把位置加入表示</h2><p className="lr-lead">同一个词在不同位置查到相同的 Embedding。位置编码另外提供顺序信息；pos 从 0 开始，是位置索引，不是词表 ID。</p>
    <MathFormula latex="PE(pos,2i)=\sin\left(\frac{pos}{10000^{2i/d_{\mathrm{model}}}}\right)" display label="偶数维度使用正弦位置编码" /><MathFormula latex="PE(pos,2i+1)=\cos\left(\frac{pos}{10000^{2i/d_{\mathrm{model}}}}\right)" display label="奇数维度使用余弦位置编码" />
    <div className="lr-controls"><NumberField label="位置编码预览长度" value={length} min={1} max={32} onChange={setLength} /><NumberField label="当前位置 pos" value={pos} min={0} max={length - 1} onChange={setPosition} /><NumberField label="比较位置" value={other} min={0} max={length - 1} onChange={setOtherPosition} /><NumberField label="位置编码维度索引" value={col} min={0} max={dim - 1} onChange={setColumn} /></div>
    <label className="lr-field">移动位置<input type="range" aria-label="移动位置" min={0} max={length - 1} value={pos} onChange={event => setPosition(Number(event.target.value))} /></label>
    <div className="lr-two-columns"><div><CartesianPlot label="位置编码正弦余弦曲线" xDomain={[0, Math.max(1, length - 1)]} yDomain={[-1.2, 1.2]} series={curves.map((item, i) => ({ id: 'pe-' + item.column, label: '维度 ' + item.column + (i === 0 ? ' · sin' : ' · cos'), color: i === 0 ? '#7864d8' : '#3996b0', points: item.points }))} markers={curves.map((item, i) => ({ id: 'pe-point-' + i, x: pos, y: values[pos][item.column], color: i === 0 ? '#7864d8' : '#3996b0' }))} /><p className="lr-note">横轴表示连续位置参数，整数点对应 Token 的实际位置；纵轴为 PE 值。曲线来自同一公式采样。</p></div>
    <div><PositionHeatmap values={values} selected={pos} onSelect={setPosition} /><p data-testid="position-value" data-value={values[pos][col]}>PE({pos}, {col}) = {fmt(values[pos][col])}；频率分母 = {fmt(Math.pow(10000, 2 * Math.floor(col / 2) / dim))}</p></div></div>
    <MatrixView title="比较两个位置" values={[values[pos], values[other]]} columns={dim} rowLabels={['pos ' + pos, 'pos ' + other]} /><MatrixView title="位置编码预览矩阵" values={values} columns={dim} />
    <h3>当前句子的逐元素相加</h3><p className="lr-note">上方长度是独立的 PE 观察窗口。下面严格使用当前句子的 {result?.tokens.length ?? 0} 个位置，确保两矩阵形状一致。修改预览长度不会填充或截断句子。</p>
    <MathFormula latex="X_{\mathrm{input}}=X_{\mathrm{embedding}}+PE" display label="输入矩阵等于句子 Embedding 加位置编码" />
    {result && <><MatrixView title="相加左项 · 当前句子 Embedding" values={result.vectors} columns={dim} /><MatrixView title="相加右项 · 当前句子 PE" values={result.pe} columns={dim} /><MatrixView title="Embedding + PE" values={result.input} columns={dim} /></>}
    <p className="lr-note">公式依据 <a className="text-link" href="https://arxiv.org/html/1706.03762v7#S3.SS5" target="_blank" rel="noreferrer">原论文第 3.5 节</a>。原论文第 3.4 节另对 Embedding 乘 √d_model；本实验为直接观察编辑值，相加前不额外缩放 E，也不实现 Attention。</p></section>;
}
