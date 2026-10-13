import { useState } from 'react';
import { graphemes } from '../../services/language/tokenization';
import type { PipelineResult } from '../../services/language/pipeline';
export function TokenExplorer({ result }: { result: PipelineResult }) {
  const [selected, setSelected] = useState(0), active = result.tokens[selected];
  return <section><h2>A · 文本分词</h2><p className="lr-lead">Token 可以是单词、子词、字或标点。点击一个 Token，看看它来自原文的哪一段。</p>
    <div className="lr-source" aria-label="原文字符与 Token 对应">{graphemes(result.text).map(part => <span key={part.start} className={active && part.start >= active.start && part.end <= active.end ? 'lr-source-active' : undefined}>{part.text}</span>) || null}</div>
    <div className="lr-tokens" aria-label="Token 列表">{result.tokens.map((token, i) => <button key={token.start} aria-pressed={selected === i} onClick={() => setSelected(i)} onFocus={() => setSelected(i)}><small>pos {i}</small>{token.text}</button>)}</div>
    <p data-testid="token-count">Token 数量：{result.tokens.length}</p>
    {!result.tokens.length && <p className="lr-note">空文本或纯空白产生空序列，后续矩阵保留 0 行。</p>}
    <div className="lr-note"><strong>三种规则，三种视角</strong><ul><li>空格分词：连续非空白作为一个 Token，合并多个空白；标点保留在原词上。中文无空格短句往往只得到一个 Token。</li><li>字符分词：按 Unicode 字素簇切分，emoji 组合与组合附加符号保持完整；跳过空白，保留标点。不把 UTF-16 半个代理对当字符。</li><li>简化子词：固定词片最长匹配，区分大小写；未匹配部分回退一个字素簇。空白跳过、标点保留。它没有学习合并规则，不能视作 BPE、WordPiece 或 SentencePiece。</li></ul></div>
  </section>;
}
