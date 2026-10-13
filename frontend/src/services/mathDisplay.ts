import { formatNumber } from './neuron.ts';
export function formatMathNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const absolute = Math.abs(value);
  return absolute !== 0 && (absolute < 0.0001 || absolute >= 1e6) ? value.toExponential(4) : formatNumber(value);
}
export function latexNumber(value: number): string {
  const formatted = formatMathNumber(value);
  const parts = formatted.split('e');
  return parts.length === 2 ? parts[0] + '\\times10^{' + Number(parts[1]) + '}' : formatted;
}
