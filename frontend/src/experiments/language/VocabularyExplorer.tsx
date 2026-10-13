import { useState } from 'react';
import { createVocabulary, DEFAULT_WORDS, idToToken, tokenToId } from '../../services/language/vocabulary';
import type { Vocabulary } from '../../services/language/vocabulary';
import type { PipelineResult } from '../../services/language/pipeline';
import { TokenSelect } from './Controls';
export function VocabularyExplorer({ vocabulary, result, onApply }: { vocabulary: Vocabulary; result: PipelineResult | null; onApply: (vocabulary: Vocabulary) => void }) {
  const [draft, setDraft] = useState(vocabulary.tokens.slice(4).join('\n')), [error, setError] = useState(''), [query, setQuery] = useState('I'), [id, setId] = useState(4 < vocabulary.tokens.length ? 4 : 0);
  const current = new Set(result?.ids ?? []), found = tokenToId(vocabulary, query);
  function apply(text: string) {
    try { const next = createVocabulary(text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)); onApply(next); setId(0); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '词表无效。'); }
  }
  return <section><h2>B · 词表与 Token ID</h2><p className="lr-lead">词表 ID 是条目的地址；pos 是 Token 在当前句子的位置。重复的词可以有不同 pos，却使用同一个 ID。</p><div className="lr-two-columns">
    <div><label className="lr-field">自定义词表（每行一个 Token）<textarea aria-label="自定义词表" rows={7} value={draft} onChange={event => setDraft(event.target.value)} /></label><div className="lr-actions"><button className="button primary" onClick={() => apply(draft)}>应用词表</button><button className="button secondary" onClick={() => { const text = DEFAULT_WORDS.join('\n'); setDraft(text); apply(text); }}>恢复默认词表</button></div>{error && <p role="alert">{error}</p>}
      <p className="lr-note">前四项固定：PAD=0（补齐占位）、UNK=1（未知词元）、BOS=2（序列开始）、EOS=3（序列结束）。本实验不自动插入它们。空自定义词表保留这四项，重复项拒绝应用。应用后 ID 按行顺序确定，Embedding 重建为教学预设。</p>
      <label className="lr-field">Token → ID<input aria-label="查询 Token" value={query} onChange={event => setQuery(event.target.value)} /></label><p data-testid="lookup-id">{query || '空查询'} → ID {found} → {idToToken(vocabulary, found)}{found === 1 && query !== '[UNK]' ? '（未知 Token，明确使用 UNK）' : ''}</p>
      <TokenSelect label="ID 反查" vocabulary={vocabulary} value={id} onChange={setId} /><p>ID {id} → {idToToken(vocabulary, id)}</p></div>
    <div className="lr-scroll" tabIndex={0} aria-label="词表映射，可滚动"><table aria-label="词表映射"><thead><tr><th>ID</th><th>Token</th><th>当前句子</th></tr></thead><tbody>{vocabulary.tokens.map((token, index) => <tr className={current.has(index) ? 'lr-selected' : undefined} key={index}><td>{index}</td><td>{token}</td><td>{current.has(index) ? '使用中' : '—'}</td></tr>)}</tbody></table></div>
    </div>{result && <div className="lr-scroll" tabIndex={0} aria-label="当前句子 ID"><table aria-label="当前句子 ID"><thead><tr><th>位置 pos</th><th>原 Token</th><th>词表 ID</th><th>反查</th></tr></thead><tbody>{result.mappings.map(item => <tr key={item.position}><td>{item.position}</td><td>{item.token}</td><td>{item.id}</td><td>{item.resolvedToken}{item.unknown ? ' · 未知' : ''}</td></tr>)}</tbody></table></div>}</section>;
}
