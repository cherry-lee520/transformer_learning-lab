import { useEffect, useId, useState } from 'react';
import { ParameterInput } from '../../components/ParameterInput';
import { ACTIVATIONS, isActivationType } from '../../services/neuronMath';
import { parseBoundedNumber } from '../../services/parameters';
import type { MLPEngine } from './useMLPTraining';
function IntegerField({ label, value, min, max, onChange, onEdit, resetVersion }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void; onEdit: () => void; resetVersion: number }) {
  const [draft, setDraft] = useState(String(value)), [invalid, setInvalid] = useState(false), id = useId();
  useEffect(() => { setDraft(String(value)); setInvalid(false); }, [value, resetVersion]);
  return <label className="nn-integer">{label}<input type="number" aria-label={label} min={min} max={max} step="1" value={draft} aria-invalid={invalid} aria-describedby={invalid ? id : undefined} onChange={event => {
    onEdit(); setDraft(event.target.value); const parsed = parseBoundedNumber(event.target.value, min, max);
    if (parsed === null || !Number.isSafeInteger(parsed)) { setInvalid(true); return; }
    setInvalid(false); onChange(parsed);
  }} />{invalid && <small className="parameter-error" id={id}>请输入 {min}～{max} 的整数；保留上次有效值。</small>}</label>;
}
export function NetworkControls({ engine }: { engine: MLPEngine }) {
  const { architecture, settings, seed } = engine;
  const changeArchitecture = (patch: Partial<typeof architecture>) => engine.configure({ ...architecture, ...patch }, seed, settings, '网络结构已改变；重新初始化参数，并清空不兼容的训练记录与快照。');
  return <aside className="panel nn-controls" aria-label="网络与训练配置"><span className="eyebrow">BUILD A SMALL NETWORK</span><h2>搭建你的网络</h2><p className="nn-caption">输入固定为 2，输出固定为 1。最多 2 个隐藏层，每层 8 个神经元。</p>
    <label>隐藏层数量<select aria-label="隐藏层数量" value={architecture.hiddenSizes.length} onChange={event => changeArchitecture({ hiddenSizes: Number(event.target.value) === 1 ? [architecture.hiddenSizes[0]] : [architecture.hiddenSizes[0], 4] })}><option value="1">1 层</option><option value="2">2 层</option></select></label>
    {architecture.hiddenSizes.map((size, index) => <label key={index}>隐藏层 {index + 1} 神经元<select aria-label={'隐藏层 ' + (index + 1) + ' 神经元数量'} value={size} onChange={event => changeArchitecture({ hiddenSizes: architecture.hiddenSizes.map((current, i) => i === index ? Number(event.target.value) : current) })}>{[1,2,3,4,5,6,7,8].map(n => <option value={n} key={n}>{n} 个</option>)}</select></label>)}
    <label>隐藏层激活函数<select aria-label="隐藏层激活函数" value={architecture.hiddenActivation} onChange={event => { if (isActivationType(event.target.value)) changeArchitecture({ hiddenActivation: event.target.value }); }}>{Object.entries(ACTIVATIONS).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</select></label>
    <label>输出层激活函数<select aria-label="输出层激活函数" value={architecture.outputActivation} onChange={event => { if (isActivationType(event.target.value)) changeArchitecture({ outputActivation: event.target.value }); }}>{Object.entries(ACTIVATIONS).map(([key, item]) => <option value={key} key={key} disabled={settings.loss === 'bce' && key !== 'sigmoid'}>{item.label}</option>)}</select></label>
    <IntegerField resetVersion={engine.revision} label="网络随机种子" value={seed} min={0} max={4294967295} onEdit={engine.pause} onChange={next => engine.configure(architecture, next, settings, '随机种子已改变；模型和训练记录已重新初始化。')} />
    <div className="nn-control-buttons"><button className="button secondary" onClick={engine.reinitialize}>重新初始化参数</button><button className="button secondary" onClick={engine.reset}>恢复默认 XOR 预设</button></div>
    <hr /><h3>训练设置</h3><label>损失函数<select aria-label="训练损失函数" value={settings.loss} onChange={event => { const loss = event.target.value === 'mse' ? 'mse' : 'bce'; engine.configure({ ...architecture, outputActivation: loss === 'bce' ? 'sigmoid' : architecture.outputActivation }, seed, { ...settings, loss }, '损失定义已改变；重新初始化模型与训练记录。BCE 自动使用 Sigmoid 输出。'); }}><option value="bce">Sigmoid + BCE</option><option value="mse">MSE 平方误差</option></select></label>
    <ParameterInput key={'rate' + engine.revision} scope="训练" name="η" label="学习率" value={settings.learningRate} min={0.001} max={2} step={0.001} onEdit={engine.pause} onChange={learningRate => engine.changeSettings({ ...settings, learningRate })} />
    <label>批量大小<select aria-label="训练批量大小" value={settings.batchSize} onChange={event => engine.changeSettings({ ...settings, batchSize: Number(event.target.value) })}>{[1,2,4].map(n => <option key={n} value={n}>{n} 个样本</option>)}</select></label>
    <IntegerField resetVersion={engine.revision} label="最大更新次数" value={settings.maxSteps} min={1} max={5000} onEdit={engine.pause} onChange={maxSteps => engine.changeSettings({ ...settings, maxSteps })} />
    <p className="nn-caption">SGD 以固定顺序循环取样，批量梯度取均值。学习率、批量与上限的有效修改暂停训练但保留模型；结构、种子或损失修改会重置。非法草稿不影响计算。</p>
  </aside>;
}

