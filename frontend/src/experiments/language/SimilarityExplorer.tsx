import { useState } from 'react';
import type { Vocabulary } from '../../services/language/vocabulary';
import { compareVectors } from '../../services/language/similarity';
import { MathFormula } from '../../components/lesson/MathFormula';
import { CartesianPlot } from '../../visualizations/activation/CartesianPlot';
import { formatMathNumber as fmt } from '../../services/mathDisplay';
import { TokenSelect } from './Controls';
import { MatrixView } from './MatrixView';
const metrics = { dot: { label: 'Dot Product', latex: 'a\\cdot b=\\sum_j a_jb_j' }, cosine: { label: 'Cosine Similarity', latex: '\\cos(a,b)=\\frac{a\\cdot b}{\\lVert a\\rVert\\lVert b\\rVert}' }, distance: { label: 'Euclidean Distance', latex: 'd(a,b)=\\sqrt{\\sum_j(a_j-b_j)^2}' } } as const;
export function SimilarityExplorer({ vocabulary, embedding }: { vocabulary: Vocabulary; embedding: number[][] }) {
  const [first, setFirst] = useState(4), [second, setSecond] = useState(5), [metric, setMetric] = useState<keyof typeof metrics>('cosine');
  const left = Math.min(first, vocabulary.tokens.length - 1), right = Math.min(second, vocabulary.tokens.length - 1);
  const a = embedding[left], b = embedding[right], result = compareVectors(a, b), value = result[metric];
  const extent = Math.max(1, Math.abs(a[0]), Math.abs(a[1]), Math.abs(b[0]), Math.abs(b[1])) * 1.3;
  return <section><h2>E · 比较两个向量</h2><p className="lr-lead">点积同时受到方向和长度影响；余弦比较方向；欧氏距离衡量坐标距离。计算使用全部维度。</p>
    <div className="lr-controls"><TokenSelect label="向量 A" vocabulary={vocabulary} value={left} onChange={setFirst} /><TokenSelect label="向量 B" vocabulary={vocabulary} value={right} onChange={setSecond} /><label className="lr-field">相似度指标<select aria-label="相似度指标" value={metric} onChange={event => setMetric(event.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label></div>
    <div className="lr-two-columns"><div><CartesianPlot label="两个向量的前两维投影" xDomain={[-extent, extent]} yDomain={[-extent, extent]} series={[{ id: 'vector-a', label: 'A · ' + vocabulary.tokens[left], color: '#7963d8', points: [{ x: 0, y: 0 }, { x: a[0], y: a[1] }] }, { id: 'vector-b', label: 'B · ' + vocabulary.tokens[right], color: '#3996b0', points: [{ x: 0, y: 0 }, { x: b[0], y: b[1] }] }]} markers={[{ id: 'a', x: a[0], y: a[1], color: '#7963d8' }, { id: 'b', x: b[0], y: b[1], color: '#3996b0' }]} /><p className="lr-note">图中只投影前两个维度（横轴维度 0，纵轴维度 1），不代表完整语义空间；指标使用全部 {a.length} 维。随机或教学向量的相似度不能当作词义关系。</p></div><div><MatrixView title="向量 A 与 B" values={[a, b]} columns={a.length} rowLabels={['A', 'B']} /><MathFormula latex={metrics[metric].latex} display /><p className="lr-result" data-testid="similarity-result" data-value={value ?? 'undefined'}>{metrics[metric].label}：{value === null ? '未定义（零向量没有方向）' : fmt(value)}</p><p>‖A‖={fmt(result.normA)}；‖B‖={fmt(result.normB)}</p></div></div>
    <div className="lr-scroll" tabIndex={0} aria-label="向量逐项计算"><table aria-label="向量逐项计算"><thead><tr><th>维度</th><th>A</th><th>B</th><th>A × B</th><th>(A − B)²</th></tr></thead><tbody>{a.map((value, i) => <tr key={i}><td>{i}</td><td>{fmt(value)}</td><td>{fmt(b[i])}</td><td>{fmt(result.products[i])}</td><td>{fmt(result.squaredDifferences[i])}</td></tr>)}</tbody></table></div><p>Σ AⱼBⱼ = {fmt(result.dot)}；Σ (Aⱼ−Bⱼ)² = {fmt(result.squaredDifferences.reduce((sum, n) => sum + n, 0))}；距离 = {fmt(result.distance)}</p>
  </section>;
}
