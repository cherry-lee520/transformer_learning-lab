/** Invalid drafts never replace the last finite value in a parameter control. */
export function parseBoundedNumber(raw: string | number, min: number, max: number): number | null {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max || (typeof raw === 'string' && !raw.trim())) return null;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}
