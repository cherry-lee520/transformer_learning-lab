import { oneHot } from '../../services/language/vocabulary';
import type { Vocabulary } from '../../services/language/vocabulary';
import { TokenSelect } from './Controls';
import { MatrixView } from './MatrixView';
export function OneHotExplorer({ vocabulary, selected, onSelect }: { vocabulary: Vocabulary; selected: number; onSelect: (id: number) => void }) {
  const vector = oneHot(selected, vocabulary.tokens.length);
  return <section><h2>C · 一个地址，一处亮起</h2><p className="lr-lead">One-Hot 把 ID 转成可做矩阵运算的指示向量。只有对应地址为 1，其余为 0。</p><TokenSelect label="One-Hot Token ID" vocabulary={vocabulary} value={selected} onChange={onSelect} /><p data-testid="one-hot-summary">长度 {vector.length} · 非零索引 {selected} · Token {vocabulary.tokens[selected]}</p><MatrixView title="One-Hot 行向量" values={[vector]} columns={vector.length} />
    <div className="lr-scroll" tabIndex={0} aria-label="One-Hot 条形图"><svg className="lr-hot-svg" viewBox={'0 0 ' + Math.max(420, vector.length * 24) + ' 105'} role="img" aria-label="One-Hot 条形图">{vector.map((value, i) => <g key={i}><rect data-id={i} data-value={value} x={i * 24 + 4} y={70 - value * 50} width="16" height={value * 50 + 2} rx="3" fill={value ? '#7864d8' : '#e5e2f1'} /><text x={i * 24 + 12} y="93" textAnchor="middle">{i}</text></g>)}</svg></div>
    <p className="lr-note">不同 ID 的 One-Hot 点积为 0；它只区分身份，没有表达“两个词意思相近”。词表增大时向量也变长且稀疏。</p></section>;
}
