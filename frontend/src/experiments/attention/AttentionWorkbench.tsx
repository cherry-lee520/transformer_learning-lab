import { useMemo, useState } from 'react';
import { QuizProvider } from '../../store/QuizProvider';
import { QuizRenderer } from '../../components/lesson/QuizRenderer';
import { NumberField } from '../language/Controls';
import { useForwardPlayer } from '../neuron/useForwardPlayer';
import { initializeProjections, initializeMulti, selfAttention, multiHead } from '../../services/attention/math';
import type { Matrix, ProjectionWeights } from '../../services/attention/math';
import { ATTENTION_INPUT_KEY, defaultAttentionInput, loadAttentionInput, parseAttentionInput, saveAttentionInput } from '../../services/attention/input';
import { AttentionMatrix, MatrixEditor } from './AttentionMatrix';
import { QKVExplorer } from './QKVExplorer';
import { AttentionSteps } from './AttentionSteps';
import { SoftmaxExplorer } from './SoftmaxExplorer';
import { ContributionExplorer } from './ContributionExplorer';
import { MultiHeadExplorer } from './MultiHeadExplorer';
import { MaskExplorer } from './MaskExplorer';
import { ATTENTION_CHALLENGES } from './challenges';
const TABS = ['Q、K、V','逐步计算','Softmax 与缩放','注意力与贡献','Multi-Head','Causal Mask','综合挑战'];
export function AttentionWorkbench() {
  const [initial] = useState(()=>{ try { return loadAttentionInput(window.localStorage); } catch { return { input:defaultAttentionInput(), message:'本地存储不可用，使用默认教学输入。',restored:false }; } });
  const [input,setInput]=useState(initial.input), [message,setMessage]=useState(initial.message), [json,setJson]=useState(''), [inputError,setInputError]=useState('');
  const model=input.shape[1], [dk,setDk]=useState(model), [dv,setDv]=useState(model), [seed,setSeed]=useState(42);
  const [parameters,setParameters]=useState(()=>initializeProjections(model,model,model)), [multi,setMulti]=useState(()=>initializeMulti(model,2,42));
  const [scaled,setScaled]=useState(true), [causal,setCausal]=useState(false), [tab,setTab]=useState(0), [query,setQuery]=useState(0), [selectedKey,setSelectedKey]=useState(0);
  const player=useForwardPlayer(9), selectedQuery=Math.min(query,input.tokens.length-1), key=Math.min(selectedKey,input.tokens.length-1);
  const computed=useMemo(()=>{ try { return { result:selfAttention(input.values,parameters,{scaled,causal}),multiResult:multiHead(input.values,multi,causal),error:'' }; } catch(reason) { return {result:null,multiResult:null,error:reason instanceof Error?reason.message:'无法计算。'}; } },[input,parameters,multi,scaled,causal]);
  function changed(text='上游已更新：重新计算，已暂停并回到第 1 步。') { player.reset(); setMessage(text); }
  function replaceInput(next: typeof input, persist: boolean) {
    if(persist) saveAttentionInput(window.localStorage,next);
    setInput(next); setDk(next.shape[1]);setDv(next.shape[1]);setParameters(initializeProjections(next.shape[1],next.shape[1],next.shape[1]));setMulti(initializeMulti(next.shape[1],2,seed));setQuery(0);setSelectedKey(0);setInputError('');
    changed(persist?'已校验并保存导入输入。刷新可恢复 X；投影权重与步骤重置。':'已恢复手工教学输入，并重建投影权重。');
  }
  function importJson() { try {replaceInput(parseAttentionInput(json),true);} catch(reason) { setInputError(reason instanceof Error?reason.message:'导入失败。');player.reset(); } }
  function resetDefault() { try { window.localStorage.removeItem(ATTENTION_INPUT_KEY); replaceInput(defaultAttentionInput(),false); } catch { replaceInput(defaultAttentionInput(),false);setMessage('使用默认输入，但无法清除本地导入缓存；刷新可能恢复旧导入。'); } }
  function updateWeights(key: keyof ProjectionWeights,next:Matrix) {setParameters(current=>({...current,[key]:next}));changed();}
  return <QuizProvider><div className="lr-workbench at-workbench"><div className="lr-hero"><div><span className="hero-label">T08 · ATTENTION MECHANISM</span><h2>让一个位置，向整段输入提问。</h2><p>投影、匹配、归一化、信息混合。每一步都有可核对的数字。</p></div><div className="lr-hero-flow" aria-hidden="true"><span>Q</span><i>×</i><span>Kᵀ</span><i>→</i><span>V</span></div></div>
    <section className="panel lr-input-panel" aria-label="Attention 全局配置"><div className="lr-stats"><span>Tokens：{input.tokens.join(' · ')}</span><span>ID：{input.ids.join(', ')}</span><span>X：{input.shape[0]}×{model}</span><span>教学 / 未训练参数</span></div><p className="lr-caption">{input.note}</p>
      <div className="lr-controls"><label className="lr-field">d_model<select aria-label="Attention d_model" value={model} onChange={event=>replaceInput(defaultAttentionInput(Number(event.target.value)),false)}>{[2,4,6,8,10,12,14,16].map(value=><option key={value} value={value}>{value}</option>)}</select><small>改变维度使用新教学 X，重置投影。</small></label>
      <NumberField label="单头 dk" value={dk} min={1} max={16} onChange={next=>{setDk(next);setParameters(initializeProjections(model,next,dv));changed('dk 已改变，单头投影重建；多头配置独立保留。');}}/>
      <NumberField label="单头 dv" value={dv} min={1} max={16} onChange={next=>{setDv(next);setParameters(initializeProjections(model,dk,next));changed('dv 已改变，单头投影重建；多头配置独立保留。');}}/>
      <NumberField label="Attention 随机种子" value={seed} min={0} max={0xffffffff} onChange={next=>{setSeed(next);changed('种子已修改；点击重新初始化才应用到参数。');}}/></div>
      <div className="lr-actions"><label className="at-check"><input type="checkbox" checked={scaled} onChange={event=>{setScaled(event.target.checked);changed();}}/>单头 √dk 缩放</label><label className="at-check"><input type="checkbox" checked={causal} onChange={event=>{setCausal(event.target.checked);changed();}}/>全局 Causal Mask</label><button className="button secondary" onClick={()=>{setParameters(initializeProjections(model,dk,dv,seed));changed('已按固定种子重新初始化单头参数。');}}>随机初始化单头权重</button><button className="button secondary" onClick={()=>{setParameters(initializeProjections(model,dk,dv));changed('已恢复单头教学投影。');}}>恢复教学权重</button><button className="button secondary" onClick={resetDefault}>恢复默认输入</button></div>
      <p className="lr-note" role="status">{message}</p><details><summary>输入矩阵 X · 展开查看/编辑</summary><MatrixEditor title="输入 X" values={input.values} max={10000} onDraft={player.reset} onChange={values=>{setInput(current=>({...current,values,note:'当前页面手工编辑的 X；未训练，刷新恢复保存的导入输入或默认。'}));changed('X 已编辑；本次编辑不覆盖保存的 T07 输入，刷新会明确恢复导入值或默认。');}}/></details>
      <details><summary>粘贴 T07 输入 JSON · 校验并保存</summary><label className="lr-field">T07 输入 JSON<textarea aria-label="T07 输入 JSON" rows={5} value={json} onChange={event=>setJson(event.target.value)} maxLength={65537}/></label><button className="button secondary" onClick={importJson}>校验并导入 JSON</button><p className="lr-caption">协议 v1，1～32 行、2～16 偶数列，Token/ID/shape 必须一致；空序列不能计算 Attention。失败保留当前有效输入，不执行外部代码。</p>{inputError&&<p className="lr-error" role="alert">{inputError}</p>}</details>
    </section>
    <div className="lr-tabs at-tabs" role="tablist" aria-label="Attention 实验模块">{TABS.map((label,i)=><button key={label} role="tab" id={'at-tab-'+i} aria-controls="at-panel" tabIndex={tab===i?0:-1} aria-selected={tab===i} onClick={()=>{player.pause();setTab(i);}} onKeyDown={event=>{let next=tab;if(event.key==='ArrowRight')next=(tab+1)%7;else if(event.key==='ArrowLeft')next=(tab+6)%7;else if(event.key==='Home')next=0;else if(event.key==='End')next=6;else return;event.preventDefault();player.pause();setTab(next);document.getElementById('at-tab-'+next)?.focus();}}><span>{String.fromCharCode(65+i)}</span>{label}</button>)}</div>
    <div className="panel lr-panel" role="tabpanel" id="at-panel" aria-labelledby={'at-tab-'+tab} tabIndex={0}>{computed.error?<p role="alert" className="lr-error">{computed.error} 已隐藏不可用矩阵；请恢复教学参数或输入。</p>:computed.result&&computed.multiResult&&<>
      {tab===0&&<QKVExplorer x={input.values} parameters={parameters} result={computed.result} onWeights={updateWeights} onDraft={player.reset}/>}
      {tab===1&&<AttentionSteps x={input.values} parameters={parameters} result={computed.result} player={player} query={selectedQuery} onQuery={setQuery}/>}
      {tab===2&&<SoftmaxExplorer result={computed.result} query={selectedQuery}/>}
      {tab===3&&<ContributionExplorer result={computed.result} tokens={input.tokens} query={selectedQuery} selectedKey={key} onSelect={(i,j)=>{setQuery(i);setSelectedKey(j);}}/>}
      {tab===4&&<MultiHeadExplorer parameters={multi} result={computed.multiResult} model={model} tokens={input.tokens} onCount={count=>{setMulti(initializeMulti(model,count,seed));changed('Head 数量已改变，全部多头权重与 WO 已重建。');}} onReset={()=>{setMulti(initializeMulti(model,multi.heads.length,seed));changed('已按当前种子重置多头参数。');}} onWeights={(index,key,next)=>{setMulti(current=>index==='wo'?{...current,wo:next}:{...current,heads:current.heads.map((weights,i)=>i===index?{...weights,[key]:next}:weights)});changed();}} onDraft={player.reset}/>}
      {tab===5&&<MaskExplorer result={computed.result} tokens={input.tokens} causal={causal} onCausal={value=>{setCausal(value);changed();}} query={selectedQuery} selectedKey={key} onSelect={(i,j)=>{setQuery(i);setSelectedKey(j);}}/>}
      {tab===6&&<section><h2>G · 用数字检验理解</h2><p className="lr-lead">六道独立挑战，点击提交才检查；答题不改变课程完成记录。</p>{ATTENTION_CHALLENGES.map(block=><QuizRenderer key={block.id} block={block} lessonId="laboratory-attention"/>)}</section>}
    </>}</div><details className="panel lr-input-panel"><summary>当前完整 Attention 输出</summary>{computed.result&&<AttentionMatrix title="当前 Attention Output" values={computed.result.output}/>}</details><p className="lr-caption">浏览器本地前向计算；没有训练、Dropout、完整 Encoder–Decoder 或远程 API。导入 X 保存在独立本地键；投影编辑、挑战和播放状态刷新后重置。</p>
  </div></QuizProvider>;
}
