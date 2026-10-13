import { useMemo, useState } from 'react';
import { TOKENIZERS } from '../../services/language/tokenization';
import type { Tokenizer } from '../../services/language/tokenization';
import { createVocabulary, DEFAULT_WORDS } from '../../services/language/vocabulary';
import { createEmbedding } from '../../services/language/representation';
import { runPipeline } from '../../services/language/pipeline';
import { TokenExplorer } from './TokenExplorer';
import { VocabularyExplorer } from './VocabularyExplorer';
import { OneHotExplorer } from './OneHotExplorer';
import { EmbeddingExplorer } from './EmbeddingExplorer';
import { SimilarityExplorer } from './SimilarityExplorer';
import { PositionExplorer } from './PositionExplorer';
import { PipelineExplorer } from './PipelineExplorer';
const TABS = ['文本分词', '词表与 ID', 'One-Hot', 'Embedding', '向量相似度', '位置编码', '完整流水线'] as const;
const LABELS: Record<Tokenizer, string> = { whitespace: '空格 Whitespace', character: '字符 Character', subword: '简化子词 Subword' };
export function LanguageWorkbench() {
  const [text, setText] = useState('I love learning'), [tokenizer, setTokenizer] = useState<Tokenizer>('whitespace');
  const [vocabulary, setVocabulary] = useState(() => createVocabulary(DEFAULT_WORDS)), [dim, setDim] = useState(8);
  const [embedding, setEmbedding] = useState(() => createEmbedding(DEFAULT_WORDS.length + 4, 8));
  const [tab, setTab] = useState(0), [step, setStep] = useState(0), [selected, setSelected] = useState(4), [source, setSource] = useState('教学预设 · 未训练'), [notice, setNotice] = useState('所有计算在当前浏览器完成。');
  const computed = useMemo(() => {
    try { return { result: runPipeline(text, tokenizer, vocabulary, embedding), error: '' }; }
    catch (reason) { return { result: null, error: reason instanceof Error ? reason.message : '无法计算当前输入。' }; }
  }, [text, tokenizer, vocabulary, embedding]);
  const { result, error } = computed;
  function resetPipeline() { setStep(0); setNotice('已重新计算下游结果，流水线回到第 1 步。'); }
  return <div className="lr-workbench">
    <div className="lr-hero"><div><span className="hero-label">T07 · LANGUAGE REPRESENTATION</span><h2>文字变成数字，顺序进入向量。</h2><p>改变一处，追踪每一步。先理解表示，再走向 Attention。</p></div><div className="lr-hero-flow" aria-hidden="true"><span>文</span><i>→</i><span>01</span><i>→</i><span>[↗]</span></div></div>
    <section className="panel lr-input-panel" aria-label="流水线输入"><label className="lr-field">输入短句<textarea aria-label="输入短句" rows={2} value={text} onChange={event => { setText(event.target.value); resetPipeline(); }} /></label><div className="lr-controls"><label className="lr-field">分词方式<select aria-label="分词方式" value={tokenizer} onChange={event => { setTokenizer(event.target.value as Tokenizer); resetPipeline(); }}>{TOKENIZERS.map(mode => <option key={mode} value={mode}>{LABELS[mode]}</option>)}</select></label><label className="lr-field">向量维度 d_model<select aria-label="向量维度 d_model" value={dim} onChange={event => { const next = Number(event.target.value); setDim(next); setEmbedding(createEmbedding(vocabulary.tokens.length, next)); setSource('教学预设 · 未训练'); resetPipeline(); setNotice('维度已改变，重建教学矩阵并重置流水线。'); }}>{[2, 4, 6, 8, 10, 12, 14, 16].map(value => <option key={value} value={value}>{value}</option>)}</select></label><div className="lr-actions"><button className="button secondary" onClick={() => { setText('I love learning'); resetPipeline(); }}>英文短句</button><button className="button secondary" onClick={() => { setText('我喜欢学习机器语言。'); resetPipeline(); }}>中文短句</button></div></div>
    <div className="lr-stats"><span>{result?.tokens.length ?? '—'} 个 Token</span><span>V = {vocabulary.tokens.length}</span><span>d_model = {dim}</span><span>{source}</span></div><p className="lr-caption" role="status">{notice}</p>{error && <p className="lr-error" role="alert">{error} 当前下游序列矩阵不可用，请修正输入。</p>}</section>
    <div className="lr-tabs" role="tablist" aria-label="语言表示实验模块">{TABS.map((label, i) => <button key={label} role="tab" id={'lr-tab-' + i} aria-selected={tab === i} aria-controls="lr-active-panel" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={event => {
      let next = tab;
      if (event.key === 'ArrowRight') next = (tab + 1) % TABS.length; else if (event.key === 'ArrowLeft') next = (tab + TABS.length - 1) % TABS.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = TABS.length - 1; else return;
      event.preventDefault(); setTab(next); document.getElementById('lr-tab-' + next)?.focus();
    }}><span>{String.fromCharCode(65 + i)}</span>{label}</button>)}</div>
    <div className="panel lr-panel" role="tabpanel" id="lr-active-panel" aria-labelledby={'lr-tab-' + tab} tabIndex={0}>
      {tab === 0 && (result ? <TokenExplorer key={text + tokenizer} result={result} /> : <p>文本超出教学范围，分词结果暂不可用。</p>)}
      {tab === 1 && <VocabularyExplorer vocabulary={vocabulary} result={result} onApply={next => { setVocabulary(next); setEmbedding(createEmbedding(next.tokens.length, dim)); setSelected(0); setSource('教学预设 · 未训练'); resetPipeline(); setNotice('词表已应用，ID 按行顺序确定，Embedding 已重建。'); }} />}
      {tab === 2 && <OneHotExplorer vocabulary={vocabulary} selected={selected} onSelect={setSelected} />}
      {tab === 3 && <EmbeddingExplorer vocabulary={vocabulary} embedding={embedding} result={result} selected={selected} onSelect={setSelected} onCell={(row, col, value) => { setEmbedding(previous => previous.map((vector, i) => i === row ? vector.map((n, j) => j === col ? value : n) : vector)); setSource('手工编辑 · 未训练'); resetPipeline(); }} onInitialize={seed => { setEmbedding(createEmbedding(vocabulary.tokens.length, dim, seed)); setSource(seed === null ? '教学预设 · 未训练' : '随机初始化 · 种子 ' + seed + ' · 未训练'); resetPipeline(); }} />}
      {tab === 4 && <SimilarityExplorer vocabulary={vocabulary} embedding={embedding} />}
      {tab === 5 && <PositionExplorer dim={dim} result={result} />}
      {tab === 6 && (result ? <PipelineExplorer result={result} vocabulary={vocabulary} embedding={embedding} step={step} onStep={setStep} /> : <p>请先修正输入，流水线不会显示旧矩阵。</p>)}
    </div><p className="lr-caption">教学范围：文本最多 256 个码点，序列最多 32 个 Token，词表最多 64 项，偶数维度 2～16。实验配置离开或刷新后重置，课时完成记录仍独立保存。</p>
  </div>;
}
