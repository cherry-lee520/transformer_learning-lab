import { useEffect, useId, useState } from 'react';
import { parseBoundedNumber } from '../services/parameters';
export interface ParameterInputProps {
  name: string; label: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void; onEdit?: () => void; onValidityChange?: (valid: boolean) => void; scope?: string;
}
/** Invalid drafts remain visible locally and never replace the parent's valid calculation value. */
export function ParameterInput({ name, label, value, min, max, step, onChange, onEdit, onValidityChange, scope }: ParameterInputProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  useEffect(() => { setDraft(String(value)); setError(''); }, [value]);
  function update(raw: string) {
    onEdit?.();
    setDraft(raw);
    const number = parseBoundedNumber(raw, min, max);
    onValidityChange?.(number !== null);
    if (number === null) { setError(`请输入 ${min} 到 ${max} 之间的有限数字；结果保留上次有效值。`); return; }
    setError('');
    onChange(number);
  }
  return <div className="parameter-field"><div><label htmlFor={id}>{name} · {label}</label><input id={id} aria-label={scope ? `${scope} ${name} · ${label}` : undefined} type="number" min={min} max={max} step="any" value={draft} onChange={event => update(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} /></div><input type="range" aria-label={`${scope ? scope + ' ' : ''}${name} ${label}滑块`} min={min} max={max} step={step} value={value} onChange={event => update(event.target.value)} />{error && <p className="parameter-error" id={`${id}-error`}>{error}</p>}</div>;
}
