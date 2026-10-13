import { formatMathNumber as number } from '../../services/mathDisplay';
import type { ForwardTrace, MLPModel, SampleBackward } from '../../services/mlp/types';
export type NetworkSelection = { kind: 'node'; layer: number; row: number } | { kind: 'edge'; layer: number; row: number; column: number };
export function NetworkGraph({ model, forward, backward, activeLayer, selected, onSelect }: { model: MLPModel; forward: ForwardTrace; backward: SampleBackward; activeLayer: number; selected: NetworkSelection; onSelect: (selection: NetworkSelection) => void }) {
  const sizes = [model.inputSize, ...model.layers.map(layer => layer.biases.length)];
  const x = (layer: number) => 66 + layer / (sizes.length - 1) * 570;
  const y = (layer: number, row: number) => sizes[layer] === 1 ? 222 : 68 + row / (sizes[layer] - 1) * 308;
  const keyAction = (event: React.KeyboardEvent<SVGGElement>, selection: NetworkSelection) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(selection); } };
  return <div className="nn-graph-scroll" tabIndex={0} aria-label="网络结构图，可横向滚动"><svg viewBox="0 0 710 442" role="group" aria-label="当前模型的全部权重连接与神经元">
    {model.layers.flatMap((layer, l) => layer.weights.flatMap((row, r) => row.map((weight, c) => {
      const selection: NetworkSelection = { kind: 'edge', layer: l, row: r, column: c };
      const active = selected.kind === 'edge' && selected.layer === l && selected.row === r && selected.column === c;
      return <g key={'edge-' + l + '-' + r + '-' + c} role="button" tabIndex={0} aria-label={'连接 第 ' + (l + 1) + ' 层 W[' + (r + 1) + ',' + (c + 1) + ']'} aria-pressed={active} className={'nn-edge ' + (weight > 0 ? 'positive' : weight < 0 ? 'negative' : 'zero') + (activeLayer === l + 1 ? ' nn-layer-active' : '')} data-layer={l + 1} data-weight={weight} data-gradient={backward.layers[l].weights[r][c]} onClick={() => onSelect(selection)} onKeyDown={event => keyAction(event, selection)}>
        <title>{'W = ' + number(weight) + '，单样本 dL/dW = ' + number(backward.layers[l].weights[r][c])}</title><line x1={x(l) + 22} y1={y(l,c)} x2={x(l+1) - 22} y2={y(l+1,r)} strokeWidth={active ? 4 : 0.6 + Math.min(2.3, Math.abs(weight) * 0.6)} strokeDasharray={weight === 0 ? '4 4' : undefined} /><line className="nn-edge-hit" x1={x(l)+22} y1={y(l,c)} x2={x(l+1)-22} y2={y(l+1,r)} />
      </g>;
    })))}
    {sizes.flatMap((size, l) => Array.from({ length: size }, (_, r) => {
      const selection: NetworkSelection = { kind: 'node', layer: l, row: r };
      const value = l === 0 ? forward.input[r] : forward.layers[l-1].a[r];
      const active = selected.kind === 'node' && selected.layer === l && selected.row === r;
      return <g key={'node-' + l + '-' + r} role="button" tabIndex={0} aria-label={(l === 0 ? '输入' : '第 ' + l + ' 层神经元') + ' ' + (r+1)} aria-pressed={active} className={'nn-node' + (activeLayer === l ? ' nn-layer-active' : '')} data-node={l + '-' + r} data-activation={value} data-z={l > 0 ? forward.layers[l-1].z[r] : undefined} data-bias={l > 0 ? model.layers[l-1].biases[r] : undefined} onClick={() => onSelect(selection)} onKeyDown={event => keyAction(event, selection)}>
        <circle cx={x(l)} cy={y(l,r)} r="22" fill={l === 0 ? '#eff7fa' : l === sizes.length-1 ? '#e8f4ef' : '#f0eafa'} /><text x={x(l)} y={y(l,r)-2} textAnchor="middle" className="nn-node-name">{l === 0 ? 'x' : 'a'}{r+1}</text><text x={x(l)} y={y(l,r)+12} textAnchor="middle" className="nn-node-value">{number(value)}</text>
      </g>;
    }))}
    {sizes.map((size, l) => <g key={'heading-'+l}><text x={x(l)} y="25" textAnchor="middle" className="nn-layer-label">{l === 0 ? '输入层' : l === sizes.length - 1 ? '输出层' : '隐藏层 ' + l}</text><text x={x(l)} y="43" textAnchor="middle" className="nn-graph-caption">{size + ' × 1'}</text>{l > 0 && <text x={x(l)} y="415" textAnchor="middle" className="nn-graph-caption">{model.layers[l-1].activation}</text>}</g>)}
  </svg></div>;
}

