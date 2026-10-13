export function sampleDomain(min: number, max: number, count = 401): number[] | null {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(max - min) || min >= max || !Number.isSafeInteger(count) || count < 2 || count > 2001) return null;
  return Array.from({ length: count }, (_, index) => min + (max - min) * (index / (count - 1)));
}
export interface CurvePoint { x: number; y: number | null }
/** A missing derivative ends the current path, so no line crosses a discontinuity. */
export function curvePath(points: readonly CurvePoint[], x: (n: number) => number, y: (n: number) => number): string {
  let connected = false;
  return points.map(point => {
    if (point.y === null || !Number.isFinite(point.x) || !Number.isFinite(point.y)) { connected = false; return ''; }
    const px = x(point.x), py = y(point.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) { connected = false; return ''; }
    const command = connected ? 'L' : 'M'; connected = true;
    return command + px + ',' + py;
  }).join(' ');
}
