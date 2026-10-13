import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import type { FormulaBlock } from '../../lessons/contentTypes';

export function MathFormula({ latex, display = false, label }: { latex: string; display?: boolean; label?: string }) {
  const target = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState(false);
  const previousError = useRef(false);
  useEffect(() => {
    if (!target.current) return;
    try {
      // KaTeX owns this empty node; raw textbook HTML is never injected.
      katex.render(latex, target.current, { displayMode: display, trust: false, throwOnError: true, maxExpand: 200, maxSize: 10, output: 'htmlAndMathml' });
      // Rapidly changing training matrices must not enqueue a redundant state
      // update after every successful typeset.
      if (previousError.current) { previousError.current = false; setError(false); }
    } catch {
      target.current.textContent = '';
      if (!previousError.current) { previousError.current = true; setError(true); }
    }
  }, [latex, display]);
  return <><span ref={target} className={`math-formula ${display ? 'math-display' : 'math-inline'}`} role="math" aria-label={label ?? latex} tabIndex={display ? 0 : undefined} />{error && <span className="formula-error" role="note">公式暂时无法排版：<code>{latex}</code></span>}</>;
}
export function AnnotatedFormula({ block }: { block: FormulaBlock }) {
  const [active, setActive] = useState<string | null>(null);
  const symbol = block.symbols?.find(item => item.id === active);
  const noteId = `${block.id}-symbol-note`;
  return <div className="formula-card"><MathFormula latex={block.latex} display={block.display ?? true} label={block.label} />{block.symbols?.length ? <div className="symbol-area"><span>点击或聚焦符号，查看解释</span><div className="symbol-buttons">{block.symbols.map(item => <button key={item.id} type="button" className="symbol-button" aria-label={`解释 ${item.latex}：${item.label}`} aria-expanded={item.id === active} aria-controls={noteId} onFocus={() => setActive(item.id)} onClick={() => setActive(item.id)} onKeyDown={event => { if (event.key === 'Escape') setActive(null); }}><MathFormula latex={item.latex} label={item.label} /><span>{item.label}</span></button>)}</div>{symbol && <div className="symbol-note" id={noteId} role="note"><strong>{symbol.latex}：{symbol.label}</strong><p>{symbol.description}</p></div>}</div> : null}</div>;
}
