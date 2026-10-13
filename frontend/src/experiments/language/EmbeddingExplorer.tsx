import { useState } from 'react';
import type { Vocabulary } from '../../services/language/vocabulary';
import type { PipelineResult } from '../../services/language/pipeline';
import { lookupEquivalence } from '../../services/language/representation';
import { MathFormula } from '../../components/lesson/MathFormula';
import { TokenSelect, NumberField } from './Controls';
import { MatrixView } from './MatrixView';
export function EmbeddingExplorer({ vocabulary, embedding, result, selected, onSelect, onCell, onInitialize }: { vocabulary: Vocabulary; embedding: number[][]; result: PipelineResult | null; selected: number; onSelect: (id: number) => void; onCell: (row: number, column: number, value: number) => void; onInitialize: (seed: number | null) => void }) {
  const [column, setColumn] = useState(0), [seed, setSeed] = useState(42);
  const dim = embedding[0].length, col = Math.min(column, dim - 1), proof = lookupEquivalence(embedding, selected);
  return <section><h2>D · Embedding 是一张可学习的查找表</h2><p className="lr-lead">每行对应一个词表 ID，每列是一个向量维度。修改一个元素，再观察所有引用这一行的 Token。</p><MathFormula latex="E\in\mathbb{R}^{V\times d_{\mathrm{model}}}" display label="Embedding 矩阵形状为词表大小乘向量维度" />
    <div className="lr-controls"><TokenSelect label="Embedding Token ID" vocabulary={vocabulary} value={selected} onChange={onSelect} /><label className="lr-field">编辑维度<select aria-label="编辑维度" value={col} onChange={event => setColumn(Number(event.target.value))}>{Array.from({ length: dim }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
      <NumberField key={selected + '-' + col} label="Embedding 元素" value={embedding[selected][col]} min={-10} max={10} integer={false} onChange={value => onCell(selected, col, value)} /><NumberField label="Embedding 随机种子" value={seed} min={0} max={0xffffffff} onChange={setSeed} /></div>
    <div className="lr-actions"><button className="button secondary" onClick={() => onInitialize(seed)}>按种子随机初始化</button><button className="button secondary" onClick={() => onInitialize(null)}>恢复教学矩阵</button><button className="button secondary" onClick={() => { for (let j = 0; j < dim; j++) onCell(selected, j, 0); }}>将选中向量置零</button></div>
    <MatrixView title="Embedding Matrix E" values={embedding} columns={dim} rowLabels={vocabulary.tokens.map((token, id) => id + ' · ' + token)} selectedRow={selected} />
    <MathFormula latex="\operatorname{OneHot}(ID)\,E=E[ID]" display label="One-Hot 乘 Embedding 矩阵等于直接查表" /><p className="lr-proof" data-testid="lookup-proof">{proof.equal ? '数值一致' : '数值不一致'} · (1 × {vocabulary.tokens.length}) × ({vocabulary.tokens.length} × {dim}) = (1 × {dim})</p>
    <MatrixView title="One-Hot × E" values={[proof.product]} columns={dim} /><MatrixView title="查表 E[ID]" values={[proof.lookup]} columns={dim} />
    {result && <MatrixView title="整句 Embedding" values={result.vectors} columns={dim} rowLabels={result.tokens.map((token, i) => i + ' · ' + token.text)} />}
    <p className="lr-note">教学矩阵由明确的数值规则生成；随机矩阵由固定种子生成。两者均未训练，没有已学到的语义。维度或词表改变会重建教学矩阵并清除不兼容的编辑。</p></section>;
}
