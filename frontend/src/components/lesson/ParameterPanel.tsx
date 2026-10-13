import { useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { ParameterInput } from '../ParameterInput';
export interface ParameterDefinition { key: string; label: string; defaultValue: number; min: number; max: number; step: number }
/** Shared slider/number container; domain calculations are supplied by its child. */
export function ParameterPanel({ definitions, children }: { definitions: ParameterDefinition[]; children: (values: Record<string, number>) => ReactNode }) {
  const initial = () => Object.fromEntries(definitions.map(item => [item.key, item.defaultValue]));
  const [values, setValues] = useState(initial);
  const [revision, setRevision] = useState(0);
  function reset() { setValues(initial()); setRevision(current => current + 1); }
  return <div className="parameter-panel"><div className="parameter-fields">{definitions.map(item => <ParameterInput key={`${revision}-${item.key}`} name={item.key} label={item.label} value={values[item.key]} min={item.min} max={item.max} step={item.step} onChange={number => setValues(current => ({ ...current, [item.key]: number }))} />)}</div>{children(values)}<button className="button secondary" type="button" onClick={reset}><RotateCcw size={14} />恢复默认值</button></div>;
}
