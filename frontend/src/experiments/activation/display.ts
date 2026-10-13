import type { GradientState } from '../../services/gradientChain';
import { formatMathNumber } from '../../services/mathDisplay';
export function gradientText(state: GradientState): string {
  if (state.status === 'undefined') return '连乘暂不可判定';
  if (state.underflow) return (state.sign < 0 ? '负' : '正') + ' · 浮点下溢';
  return formatMathNumber(state.value);
}
