import { useState } from 'react';
import { parseBoundedNumber } from '../../services/parameters';
import type { Vocabulary } from '../../services/language/vocabulary';
export function TokenSelect({ label, vocabulary, value, onChange }: { label: string; vocabulary: Vocabulary; value: number; onChange: (id: number) => void }) {
  return <label className="lr-field">{label}<select aria-label={label} value={value} onChange={event => onChange(Number(event.target.value))}>{vocabulary.tokens.map((token, id) => <option key={id} value={id}>{id} · {token}</option>)}</select></label>;
}
export function NumberField({ label, value, min, max, integer = true, onChange }: { label: string; value: number; min: number; max: number; integer?: boolean; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<{ raw: string; basis: number } | null>(null);
  const raw = draft?.basis === value ? draft.raw : String(value), parsed = parseBoundedNumber(raw, min, max), valid = parsed !== null && (!integer || Number.isSafeInteger(parsed));
  return <label className="lr-field">{label}<input aria-label={label} type="number" value={raw} min={min} max={max} step={integer ? 1 : 0.1} aria-invalid={!valid} onChange={event => {
    const text = event.target.value, next = parseBoundedNumber(text, min, max);
    setDraft({ raw: text, basis: value });
    if (next !== null && (!integer || Number.isSafeInteger(next))) { setDraft(null); onChange(next); }
  }} />{!valid && <small role="alert">请输入 {min}～{max} 的{integer ? '整数' : '有限数值'}；保留上次有效计算。</small>}</label>;
}
