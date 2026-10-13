import { useState } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { ParameterInput } from '../../components/ParameterInput';
import { PARAMETER_RANGE } from '../../services/neuron';
import { ACTIVATIONS, isActivationType } from '../../services/neuronMath';
import type { NeuronConfig } from '../../services/neuronMath';
import { parseBoundedNumber } from '../../services/parameters';
import { NEURON_EXAMPLES, cloneConfig, randomConfig, resizeInputs } from './examples';
export function NeuronControls({ config, revision, onChange, onEdit }: { config: NeuronConfig; revision: number; onChange: (value: NeuronConfig, replace?: boolean) => void; onEdit: () => void }) {
  const [seedDraft, setSeedDraft] = useState('42');
  const seed = parseBoundedNumber(seedDraft, 0, 0xffffffff);
  const validSeed = seed !== null && Number.isSafeInteger(seed);
  function update(index: number, field: 'inputs' | 'weights', value: number) {
    onChange({ ...config, [field]: config[field].map((item, current) => current === index ? value : item) });
  }
  return <section className="panel neuron-parameters" id="neuron-parameters" aria-labelledby="parameters-heading"><span className="eyebrow">CHANGE & OBSERVE</span><h2 id="parameters-heading">参数控制台</h2><p className="lab-muted">滑块与数字框同步。每次修改都会暂停播放并回到第 1 步。</p>
    <div className="lab-select-row"><label>输入数量<select aria-label="输入数量" value={config.inputs.length} onChange={event => { const next = resizeInputs(config, Number(event.target.value)); if (next) onChange(next, true); }}>{[1, 2, 3, 4, 5].map(count => <option key={count} value={count}>{count} 个输入</option>)}</select></label><label>激活函数<select aria-label="激活函数" value={config.activationType} onChange={event => { if (isActivationType(event.target.value)) onChange({ ...config, activationType: event.target.value }); }}>{Object.entries(ACTIVATIONS).map(([value, activation]) => <option key={value} value={value}>{activation.label}</option>)}</select></label></div>
    <div className="input-pairs">{config.inputs.map((input, index) => <fieldset className="input-pair" key={index}><legend>输入 {index + 1}</legend><ParameterInput key={`${revision}-x-${index}`} scope="实验" name={`x${index + 1}`} label="输入值" value={input} {...PARAMETER_RANGE} onEdit={onEdit} onChange={value => update(index, 'inputs', value)} /><ParameterInput key={`${revision}-w-${index}`} scope="实验" name={`w${index + 1}`} label="权重" value={config.weights[index]} {...PARAMETER_RANGE} onEdit={onEdit} onChange={value => update(index, 'weights', value)} /></fieldset>)}</div>
    <ParameterInput key={`${revision}-bias`} scope="实验" name="b" label="偏置" value={config.bias} {...PARAMETER_RANGE} onEdit={onEdit} onChange={bias => onChange({ ...config, bias })} />
    <div className="lab-preset-area"><label>教学示例<select aria-label="教学示例" defaultValue="" onChange={event => { const example = NEURON_EXAMPLES.find(item => item.id === event.target.value); if (example) onChange(cloneConfig(example.config), true); event.target.value = ''; }}><option value="" disabled>选择并填入参数</option>{NEURON_EXAMPLES.map(example => <option key={example.id} value={example.id}>{example.title}</option>)}</select></label><button className="button secondary" onClick={() => onChange(cloneConfig(NEURON_EXAMPLES[0].config), true)}><RotateCcw size={14} />恢复默认参数</button></div>
    <div className="seed-control"><label>随机种子<input type="number" min="0" max={0xffffffff} step="1" value={seedDraft} onChange={event => setSeedDraft(event.target.value)} aria-invalid={!validSeed} /></label><button className="button secondary" disabled={!validSeed} onClick={() => { if (validSeed) { const next = randomConfig(seed, config.inputs.length); if (next) onChange({ ...next, activationType: config.activationType }, true); } }}><Shuffle size={14} />生成随机参数</button><p className="lab-muted">{validSeed ? '同一种子与输入数量生成相同参数，便于重复观察。' : '请输入 0～4294967295 之间的整数种子。'}</p></div>
  </section>;
}
