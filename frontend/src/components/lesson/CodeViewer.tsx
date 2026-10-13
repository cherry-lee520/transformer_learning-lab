import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-c.js';
import type { CodeExample } from '../../lessons/contentTypes';

function Tokens({ tokens }: { tokens: (string | Prism.Token)[] }): ReactNode {
  return tokens.map((token, index) => typeof token === 'string' ? token : <span className={`token ${token.type}`} key={index}><Tokens tokens={typeof token.content === 'string' ? [token.content] : Array.isArray(token.content) ? token.content : [token.content]} /></span>);
}
const languageNames = { python: 'Python', c: 'C' };
export function CodeViewer({ examples, title, lineNumbers = false }: { examples: CodeExample[]; title: string; lineNumbers?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [manual, setManual] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const request = useRef(0);
  const example = examples[selected] ?? examples[0];
  const tokens = Prism.tokenize(example.code, Prism.languages[example.language]);
  function select(index: number) { request.current++; setSelected(index); setFeedback(''); setManual(false); }
  async function copy() {
    const current = ++request.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable');
      await navigator.clipboard.writeText(example.code);
      if (current === request.current) { setFeedback('已复制'); setManual(false); }
    } catch {
      if (current === request.current) { setFeedback('无法自动复制，请选中下方代码手动复制。'); setManual(true); }
    }
  }
  return <div className="code-viewer"><div className="code-toolbar"><strong>{title}</strong><button className="copy-button" type="button" onClick={copy}>{feedback === '已复制' ? <Check size={14} /> : <Copy size={14} />}{feedback === '已复制' ? '已复制' : '复制代码'}</button></div>
    <div className="code-tabs" role="tablist" aria-label="代码语言">{examples.map((item, index) => <button type="button" role="tab" key={item.language} ref={element => { buttons.current[index] = element; }} tabIndex={index === selected ? 0 : -1} aria-selected={index === selected} onClick={() => select(index)} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? examples.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : examples.length - 1)) % examples.length; select(next); buttons.current[next]?.focus(); }}>{languageNames[item.language]}</button>)}</div>
    <div className="code-scroll" role="tabpanel" aria-label={`${languageNames[example.language]} 代码示例`} tabIndex={0}><div className="code-grid">{lineNumbers && <div className="line-numbers" aria-hidden="true">{example.code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div>}<pre><code className={`language-${example.language}`}><Tokens tokens={tokens} /></code></pre></div></div>
    <div className="copy-feedback" role="status">{feedback}</div>{manual && <label className="manual-copy">手动复制代码<textarea readOnly value={example.code} onFocus={event => event.currentTarget.select()} /></label>}
  </div>;
}
