export function withinTolerance(actual: number, expected: number, tolerance: number): boolean {
  if (![actual, expected, tolerance].every(Number.isFinite) || tolerance < 0) return false;
  const rounding = Number.EPSILON * Math.max(1, Math.abs(expected), Math.abs(actual)) * 4;
  return Math.abs(actual - expected) <= tolerance + rounding;
}
