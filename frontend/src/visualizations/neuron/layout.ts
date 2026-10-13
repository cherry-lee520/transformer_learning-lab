export interface Position { x: number; y: number }
export function graphLayout(count: number, compact: boolean) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 5) throw new RangeError('Input count must be 1–5');
  const inputs = Array.from({ length: count }, (_, index) => compact ? { x: count === 1 ? 180 : 35 + 290 * index / (count - 1), y: 65 } : { x: 65, y: 245 + (index - (count - 1) / 2) * 77 });
  return compact ? { width: 360, height: 610, inputs, weights: inputs.map(input => ({ x: input.x, y: 160 })), sum: { x: 180, y: 300 }, bias: { x: 300, y: 300 }, activation: { x: 180, y: 430 }, output: { x: 180, y: 550 } } : { width: 800, height: 460, inputs, weights: inputs.map(input => ({ x: 200, y: input.y })), sum: { x: 370, y: 245 }, bias: { x: 370, y: 75 }, activation: { x: 555, y: 245 }, output: { x: 735, y: 245 } };
}
