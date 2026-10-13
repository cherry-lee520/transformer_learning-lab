import { formatMathNumber as fmt } from '../../services/mathDisplay';
export function PositionHeatmap({ values, selected, onSelect }: { values: number[][]; selected: number; onSelect: (pos: number) => void }) {
  const dim = values[0].length;
  return <div className="lr-scroll" tabIndex={0} aria-label="位置编码热力图，可横向滚动"><svg className="lr-heatmap" viewBox={'0 0 ' + (dim * 36 + 60) + ' ' + (values.length * 26 + 45)} role="group" aria-label="位置编码热力图">
    {values[0].map((_, j) => <text key={j} x={76 + j * 36} y="18" textAnchor="middle">{j}</text>)}
    {values.map((row, i) => <g key={i} role="button" tabIndex={0} aria-label={'选择位置 ' + i + ' 的编码'} aria-pressed={selected === i} onClick={() => onSelect(i)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); } }}>
      <text x="49" y={46 + i * 26} textAnchor="end">pos {i}</text>
      {row.map((value, j) => <rect key={j} data-position={i} data-dimension={j} data-value={value} x={60 + j * 36} y={29 + i * 26} width="32" height="22" rx="3" fill={value >= 0 ? '#7864d8' : '#3996b0'} fillOpacity={0.12 + 0.88 * Math.abs(value)} stroke={selected === i ? '#39206f' : 'none'}><title>{'PE(' + i + ',' + j + ') = ' + fmt(value)}</title></rect>)}
    </g>)}</svg><p className="lr-note">紫色为正、青色为负；越深绝对值越大。点击或用键盘选择整行，下方有精确数值。</p></div>;
}
