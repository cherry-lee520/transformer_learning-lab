import { useMemo, useState } from 'react';
import { DEFAULT_CONFIG, DEFAULT_VOCABULARY, initializeTransformer, forwardTransformer, tokenizeInput, parameterMatrices, updateParameter } from '../../services/transformer/model';
import type { TransformerConfig } from '../../services/transformer/model';
import { tensorFlow } from '../../services/transformer/flow';
import { createVocabulary } from '../../services/language/vocabulary';
import { NumberField } from '../language/Controls';
import { useForwardPlayer } from '../neuron/useForwardPlayer';
import { MatrixEditor, AttentionMatrix } from '../attention/AttentionMatrix';
import { ArchitectureGraph } from '../../visualizations/transformer/ArchitectureGraph';
import { TensorInspector } from './TensorInspector';
import { AttentionInspector } from './AttentionInspector';
import { ProbabilityInspector } from './ProbabilityInspector';
const TABS = ['A 架构与前向', 'B 注意力', 'C FFN 与 Add & Norm', 'D 参数编辑', 'E 输出概率'];
export function TransformerWorkbench() {
  const [config,setConfig]=useState<TransformerConfig>({...DEFAULT_CONFIG});
  const [vocabulary,setVocabulary]=useState(DEFAULT_VOCABULARY),[vocabDraft,setVocabDraft]=useState(DEFAULT_VOCABULARY.tokens.slice(4).join('\n')),[vocabError,setVocabError]=useState('');
  const [parameters,setParameters]=useState(()=>initializeTransformer(DEFAULT_CONFIG,DEFAULT_VOCABULARY.tokens.length));
  const [sourceText,setSource]=useState('I love AI'),[targetText,setTarget]=useState('[BOS] 我');
  const [tab,setTab]=useState(0),[parameterId,setParameterId]=useState('embedding');
  const [notice,setNotice]=useState('固定种子 42 · 原始 Post-LN · Dropout=0 · 共享 Embedding/输出投影 · 未训练。刷新或离开后恢复默认，课时进度独立保存。');
  const computed=useMemo(()=>{
    try {
      const source=tokenizeInput(sourceText,vocabulary),target=tokenizeInput(targetText,vocabulary);
      const result=forwardTransformer(config,parameters,source.ids,target.ids);
      return {data:{source,target,result,steps:tensorFlow(result)},error:''};
    } catch(reason) {return {data:null,error:reason instanceof Error?reason.message:'输入或计算不可用。'};}
  },[config,parameters,sourceText,targetText,vocabulary]);
  const data=computed.data,steps=data?.steps??[],player=useForwardPlayer(Math.max(1,steps.length)),index=Math.min(player.step-1,Math.max(0,steps.length-1)),current=steps[index];
  const descriptors=useMemo(()=>parameterMatrices(parameters),[parameters]),selected=descriptors.find(item=>item.id===parameterId)??descriptors[0];
  const [attentionId,setAttentionId]=useState('encoder-0-self'),[detailId,setDetailId]=useState('encoder-0-ffn');
  const attentionSteps=steps.filter(step=>step.attention),detailSteps=steps.filter(step=>step.ffn||step.norm);
  const attentionStep=attentionSteps.find(step=>step.id===attentionId)??attentionSteps[0],detail=detailSteps.find(step=>step.id===detailId)??detailSteps[0];
  const chooseStep=(next:number)=>{player.go(next+1);const value=steps[next];if(value.attention)setAttentionId(value.id);if(value.ffn||value.norm)setDetailId(value.id);};
  const configure=(next:TransformerConfig)=>{player.reset();setConfig(next);setParameters(initializeTransformer(next,vocabulary.tokens.length));setParameterId('embedding');setNotice('模型结构/种子已改变，全部参数已按固定种子重新初始化，旧步骤已清除。');};
  const reset=()=>{player.reset();setConfig({...DEFAULT_CONFIG});setVocabulary(DEFAULT_VOCABULARY);setVocabDraft(DEFAULT_VOCABULARY.tokens.slice(4).join('\n'));setVocabError('');setParameters(initializeTransformer(DEFAULT_CONFIG,DEFAULT_VOCABULARY.tokens.length));setSource('I love AI');setTarget('[BOS] 我');setParameterId('embedding');setAttentionId('encoder-0-self');setDetailId('encoder-0-ffn');setNotice('已恢复默认网络、教学词表、输入与种子 42；课时进度不变。');};
  const selects: {key:'encoderLayers'|'decoderLayers'|'dModel'|'heads'|'dFF';label:string;options:number[]}[]=[
    {key:'encoderLayers',label:'Encoder 层数',options:[1,2,3]},{key:'decoderLayers',label:'Decoder 层数',options:[1,2,3]},
    {key:'dModel',label:'d_model',options:[4,8,16]},{key:'heads',label:'Heads',options:[1,2,4]},{key:'dFF',label:'d_ff',options:[8,16,32,64]}];
  return <div className="lr-workbench at-workbench tr-workbench"><section className="lr-hero"><div><span className="eyebrow">FROM ATTENTION TO ARCHITECTURE</span><h2>让每一层，都有迹可循</h2><p>Source 形成 Encoder Memory；目标前缀先做遮罩注意力，再查询 Memory。亲手检查矩阵、残差与概率。</p></div><div className="lr-hero-flow" aria-hidden="true"><span>E</span><i>→</i><span>M</span><i>→</i><span>P</span></div></section>
    <section className="panel lr-input-panel" aria-label="模型配置"><h2>教学模型配置</h2><div className="lr-controls" onChangeCapture={player.reset}>
      {selects.map(field=><label className="lr-field" key={field.key}>{field.label}<select aria-label={field.label} value={config[field.key]} onChange={e=>configure({...config,[field.key]:Number(e.target.value)})}>{field.options.map(n=><option key={n} value={n}>{n}</option>)}</select></label>)}
      <NumberField label="随机种子" value={config.seed} min={0} max={0xffffffff} onChange={seed=>configure({...config,seed})}/>
      <NumberField label="LayerNorm epsilon" value={config.epsilon} min={1e-8} max={1} integer={false} onChange={epsilon=>{player.reset();setConfig({...config,epsilon});setNotice('epsilon 已更新，重新计算全部 Post-LN，权重保持原值。');}}/>
    </div><div className="lr-controls" onChangeCapture={player.reset}>
      <label className="lr-field">Source Tokens<input aria-label="Source Tokens" value={sourceText} maxLength={512} onChange={e=>setSource(e.target.value)}/><small>空格分隔，包括中文；最多 12 个 Token。</small></label>
      <label className="lr-field">Target Prefix<input aria-label="Target Prefix" value={targetText} maxLength={512} onChange={e=>setTarget(e.target.value)}/><small>例如 [BOS] 我，只输入已知前缀，不包含要预测的下一个 Token。</small></label>
    </div><div className="lr-actions"><button className="button secondary" onClick={()=>{player.reset();setParameters(initializeTransformer(config,vocabulary.tokens.length));setNotice('参数已按当前种子重新初始化，前向步骤回到起点。');}}>重新初始化参数</button><button className="button secondary" onClick={reset}>恢复默认模型</button><button className="button primary" disabled={!data} onClick={()=>{setTab(0);player.go(steps.length);}}>执行完整前向传播</button></div>
    <p role="status" className="lr-caption">{notice}</p>{computed.error&&<p className="lr-error" role="alert">{computed.error} 当前前向结果不可用，请修正输入；不显示过期输出。</p>}
    {data&&<><div className="lr-stats"><span data-testid="source-shape">Source：{data.source.ids.length}×{config.dModel}</span><span data-testid="target-shape">Target：{data.target.ids.length}×{config.dModel}</span><span>d_k=d_v={config.dModel/config.heads}</span><span>V={vocabulary.tokens.length}</span><span>Post-LN / ReLU / Dropout 0</span></div><p className="lr-caption" data-testid="token-ids">Source IDs=[{data.source.ids.join(', ')}]；Target IDs=[{data.target.ids.join(', ')}]。{data.source.ids.includes(1)||data.target.ids.includes(1)?'含未知词，实际计算使用 [UNK]。':''}{data.target.ids[0]!==2?'当前前缀没有以 [BOS] 开头；不自动插入，仍计算你提供的前缀。':''}</p></>}
    <details><summary>教学词表 · 源/目标共享 · V≤32</summary><p>每行一个自定义 Token，四个特殊项固定在 ID 0–3。应用后重新初始化全部参数；未知词使用 UNK。本实验拒绝 PAD，因为尚无 Padding Mask。</p><label className="lr-field">自定义词表<textarea aria-label="自定义词表" rows={6} value={vocabDraft} maxLength={2048} onChange={e=>{player.pause();setVocabDraft(e.target.value);setVocabError('');}}/></label><button className="button secondary" onClick={()=>{player.reset();try{const words=vocabDraft.split(/\r?\n/u).map(word=>word.trim()).filter(Boolean);if(words.length>28)throw new RangeError('最多 28 个自定义 Token，加四个特殊项后 V≤32。');const next=createVocabulary(words);setVocabulary(next);setParameters(initializeTransformer(config,next.tokens.length));setParameterId('embedding');setVocabError('');setNotice('词表已应用，ID/E 和模型参数已重新初始化；未知输入映射到 UNK。');}catch(e){setVocabError(e instanceof Error?e.message:'词表无效。');}}}>应用教学词表</button>{vocabError&&<p role="alert" className="lr-error">{vocabError} 保留上次有效词表与参数。</p>}<p className="lr-caption">{vocabulary.tokens.map((word,id)=>id+':'+word).join(' · ')}</p></details></section>
    <div className="lr-tabs" role="tablist" aria-label="Transformer 实验模块">{TABS.map((label,i)=><button key={label} role="tab" id={'tr-tab-'+i} aria-selected={tab===i} aria-controls="tr-panel" tabIndex={tab===i?0:-1} onClick={()=>{player.pause();setTab(i);}} onKeyDown={e=>{let next=tab;if(e.key==='ArrowRight')next=(tab+1)%TABS.length;else if(e.key==='ArrowLeft')next=(tab+TABS.length-1)%TABS.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=TABS.length-1;else return;e.preventDefault();player.pause();setTab(next);document.getElementById('tr-tab-'+next)?.focus();}}>{label}</button>)}</div>
    <div className="panel lr-panel" role="tabpanel" id="tr-panel" aria-labelledby={'tr-tab-'+tab} tabIndex={0}>
      {!data?<p>请先修正上方输入或参数，之后再检查真实张量。</p>:<>
        {tab===0&&<><div className="lr-controls"><label className="lr-field">选择张量步骤<select aria-label="选择张量步骤" value={current.id} onChange={e=>chooseStep(steps.findIndex(step=>step.id===e.target.value))}>{steps.map((step,i)=><option key={step.id} value={step.id}>{i+1}. {step.title}</option>)}</select></label><label className="lr-field">播放速度<select aria-label="播放速度" value={player.speed} onChange={e=>player.changeSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label></div>
          <div className="lr-actions"><button className="button secondary" disabled={index===0} onClick={()=>chooseStep(index-1)}>上一步</button><button className="button primary" disabled={index===steps.length-1} onClick={()=>chooseStep(index+1)}>下一步</button><button className="button secondary" onClick={player.playing?player.pause:player.play}>{player.playing?'暂停':'自动播放'}</button><button className="button secondary" onClick={player.reset}>重置步骤</button></div><p className="lr-caption" data-testid="forward-state" role="status">步骤 {index+1}/{steps.length} · {player.playing?'播放中':'已暂停'}。所有结果已真实计算，高亮表示当前解释位置。</p>
          <div className="tr-flow-grid"><ArchitectureGraph steps={steps} selected={current.id} onSelect={chooseStep}/><TensorInspector key={current.id} step={current} steps={steps}/></div></>}
        {tab===1&&<><label className="lr-field">选择层与注意力类型<select aria-label="选择层与注意力类型" value={attentionStep.id} onChange={e=>{setAttentionId(e.target.value);chooseStep(steps.findIndex(step=>step.id===e.target.value));}}>{attentionSteps.map(step=><option key={step.id} value={step.id}>{step.title}</option>)}</select></label><AttentionInspector key={attentionStep.id} step={attentionStep} sourceTokens={data.source.tokens} targetTokens={data.target.tokens}/></>}
        {tab===2&&<><label className="lr-field">选择 FFN 或 Add & Norm<select aria-label="选择 FFN 或 Add & Norm" value={detail.id} onChange={e=>{setDetailId(e.target.value);chooseStep(steps.findIndex(step=>step.id===e.target.value));}}>{detailSteps.map(step=><option key={step.id} value={step.id}>{step.title}</option>)}</select></label><TensorInspector key={detail.id} step={detail} steps={steps}/><button className="button secondary" onClick={()=>{setParameterId(detail.id.startsWith('encoder')?'encoders.'+(detail.layer??0)+'.'+(detail.ffn?'ffn.w1':detail.id.split('-').at(-1)+'.gamma'):'decoders.'+(detail.layer??0)+'.'+(detail.ffn?'ffn.w1':detail.id.split('-').at(-1)+'.gamma'));setTab(3);}}>编辑此子层参数</button></>}
        {tab===3&&<><h2>真实模型参数</h2><p>每层、每个 Head 和每个 Add & Norm 都有独立参数。共享 E 的编辑同时影响 Source、Target 和输出投影；这里没有训练更新。</p><label className="lr-field">选择模型参数<select aria-label="选择模型参数" value={selected.id} onChange={e=>{player.pause();setParameterId(e.target.value);}}>{descriptors.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <MatrixEditor key={selected.id} title="所选参数" values={selected.values} onDraft={player.reset} onChange={values=>{player.reset();setParameters(updateParameter(parameters,selected.id,values));setNotice(selected.label+' 已更新，依赖结果已重算，步骤已恢复起点。');}}/>
          <p className="lr-caption" data-testid="parameter-name">{selected.label} · {selected.values.length}×{selected.values[0].length}</p><AttentionMatrix title="更新后的 Decoder 输出" values={data.result.output}/><AttentionMatrix title="更新后的 Logits" values={data.result.logits}/></>}
        {tab===4&&<ProbabilityInspector key={data.result.output.length+'-'+vocabulary.tokens.length} result={data.result} vocabulary={vocabulary}/>}
      </>}
    </div><p className="lr-caption">本地纯前向教学：序列各 1–12，d_model 4/8/16，Heads 1/2/4，Encoder/Decoder 各 1–3 层，FFN 8/16/32/64，词表 4–32。矩阵/架构图内部滚动；无训练、KV Cache、自动生成或远程模型。</p>
  </div>;
}
