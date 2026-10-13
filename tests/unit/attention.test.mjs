import test from 'node:test';
import assert from 'node:assert/strict';
import React from '../../frontend/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../frontend/node_modules/react-dom/server.node.js';
import katex from '../../frontend/node_modules/katex/dist/katex.mjs';
import { matrixProduct } from '../../frontend/src/services/tensorMath.ts';
import { transpose, scaleMatrix, rowSoftmax, softmaxDetails, applyMask, causalMask, project, attention, selfAttention, contribution, productElement, concatHeads, multiHead, initializeProjections, initializeMulti } from '../../frontend/src/services/attention/math.ts';
import { ATTENTION_INPUT_KEY, defaultAttentionInput, validateAttentionInput, parseAttentionInput, saveAttentionInput, loadAttentionInput } from '../../frontend/src/services/attention/input.ts';
import { createVocabulary, DEFAULT_WORDS } from '../../frontend/src/services/language/vocabulary.ts';
import { createEmbedding } from '../../frontend/src/services/language/representation.ts';
import { runPipeline, exportPipeline } from '../../frontend/src/services/language/pipeline.ts';
import { ATTENTION_CHALLENGES } from '../../frontend/src/experiments/attention/challenges.ts';
import { judgeAnswer } from '../../frontend/src/services/quiz.ts';
import { AttentionHeatmap } from '../../frontend/src/visualizations/attention/AttentionHeatmap.tsx';
import { AttentionSteps, ATTENTION_STEPS, attentionStepFormula } from '../../frontend/src/experiments/attention/AttentionSteps.tsx';
import { AttentionMatrix } from '../../frontend/src/experiments/attention/AttentionMatrix.tsx';
import { lessonContents } from '../../frontend/src/lessons/content.ts';
import { lessons } from '../../frontend/src/lessons/index.ts';
import { validateContentLinks } from '../../frontend/src/lessons/contentValidation.ts';
const near=(a,b,eps=1e-12)=>assert.ok(Math.abs(a-b)<=eps, a+' != '+b);
const matrices=(a,b)=>{assert.equal(a.length,b.length);a.forEach((row,i)=>{assert.equal(row.length,b[i].length);row.forEach((n,j)=>near(n,b[i][j]));});};
const x=[[1,2],[3,4]], identity=[[1,0],[0,1]];
const parameters={wq:[[2,0],[1,1]],wk:identity,wv:[[0,1],[1,0]]};
test('Q/K/V 独立矩阵投影和列向量点积元素说明',()=>{
  const result=project(x,parameters);
  assert.deepEqual(result,{q:[[4,2],[10,4]],k:x,v:[[2,1],[4,3]]});
  assert.deepEqual(productElement(x,parameters.wq,0,0),{left:[1,2],right:[2,1],products:[2,2],value:4});
});
test('矩阵转置、缩放和真实 QKᵀ 参考值',()=>{
  const q=[[1,2],[3,4]], k=[[2,0],[1,1]];
  assert.deepEqual(transpose(k),[[2,1],[0,1]]);
  assert.deepEqual(matrixProduct(q,transpose(k)),[[2,3],[6,7]]);
  matrices(scaleMatrix([[2,3],[6,7]],1/Math.sqrt(2)),[[2/Math.sqrt(2),3/Math.sqrt(2)],[6/Math.sqrt(2),7/Math.sqrt(2)]]);
});
test('稳定 Softmax：巨大正负分数、极端有限差、相等分数',()=>{
  matrices([rowSoftmax([10000,10000]),rowSoftmax([-10000,-10000]),rowSoftmax([-1e308,1e308])],[[.5,.5],[.5,.5],[0,1]]);
  const detail=softmaxDetails([1001,1002,1003]); assert.equal(detail.maximum,1003); assert.deepEqual(detail.shifted,[-2,-1,0]); near(detail.denominator,Math.exp(-2)+Math.exp(-1)+1);
});
test('Softmax 逐行概率和、平移不变性与已知概率',()=>{
  const rows=[[1,2,3],[-3,0,9],[0,Math.log(3)]];
  for(const row of rows){const weights=rowSoftmax(row);near(weights.reduce((a,b)=>a+b,0),1);matrices([weights],[rowSoftmax(row.map(n=>n+100))]);assert.ok(weights.every(n=>n>=0&&n<=1));}
  near(rowSoftmax([0,Math.log(3)])[1],.75);
});
test('Attention 输出匹配独立手工指数参考，而非全矩阵归一化',()=>{
  const result=attention([[1],[0]],[[1],[0]],[[2],[6]]);
  const a=Math.E/(Math.E+1);
  matrices(result.scores,[[1,0],[0,0]]);
  matrices(result.weights,[[a,1-a],[.5,.5]]);
  matrices(result.output,[[a*2+(1-a)*6],[4]]);
  result.weights.forEach(row=>near(row.reduce((a,b)=>a+b,0),1));
});
test('默认 n=3,d=4 教学预设的真实输出及缩放开关',()=>{
  const input=defaultAttentionInput(), weights=initializeProjections(4,4,4), r=selfAttention(input.values,weights);
  assert.deepEqual(r.scores,[[2,0,1],[0,2,1],[1,1,2]]);assert.equal(r.factor,.5);
  const sum=Math.E+1+Math.exp(.5), a=Math.E/sum,b=1/sum,c=Math.exp(.5)/sum;
  matrices([r.output[0]],[[a+c,b+c,a,b]]);
  const raw=selfAttention(input.values,weights,{scaled:false});assert.equal(raw.factor,1);assert.ok(raw.weights[0][0]>r.weights[0][0]);
});
test('Attention Contribution 分解与最终输出逐项一致',()=>{
  const r=selfAttention(x,parameters);
  for(let i=0;i<x.length;i++){const part=contribution(r,i);matrices([part.sum],[r.output[i]]);part.terms.forEach((row,j)=>row.forEach((n,k)=>near(n,r.weights[i][j]*r.v[j][k])));}
  assert.throws(()=>contribution(r,-1));assert.throws(()=>contribution(r,2));
});
test('Causal 可见规则、Masked Scores 状态和未来权重严格零',()=>{
  assert.deepEqual(causalMask(3),[[true,false,false],[true,true,false],[true,true,true]]);
  const r=selfAttention(defaultAttentionInput().values,initializeProjections(4,4,4),{causal:true});
  assert.deepEqual(r.weights[0],[1,0,0]); assert.equal(r.maskedScores[0][1],null);
  r.weights.forEach((row,i)=>{near(row.reduce((a,b)=>a+b,0),1);row.forEach((n,j)=>{if(j>i)assert.equal(n,0);});});
  assert.deepEqual(r.output[0],r.v[0]);
});
test('显式 Mask 与 Causal 交集、全 Mask 行明确拒绝',()=>{
  assert.deepEqual(rowSoftmax([5,2],[false,true]),[0,1]);
  assert.throws(()=>rowSoftmax([5,2],[false,false]),/未定义/);
  assert.throws(()=>attention(x,x,x,{mask:[[false,false],[true,true]]}),/未定义/);
  assert.throws(()=>attention(x,x,x,{causal:true,mask:[[false,true],[true,true]]}),/未定义/);
});
test('非法 Mask 类型、尺寸和稀疏项均拒绝',()=>{
  for(const mask of [null,[],[[true]],[[1,0],[1,1]],[Array(2),[true,true]]])assert.throws(()=>applyMask(x,mask));
  assert.throws(()=>attention(x,x,x,{mask:null}));
  for(const visible of [null,[],[true],[true,'x'],Array(2)])assert.throws(()=>rowSoftmax([1,2],visible));
});
test('Multi-Head 独立投影、每头输出和 Concat 维度',()=>{
  const input=defaultAttentionInput(), p=initializeMulti(4,2,42), r=multiHead(input.values,p);
  assert.equal(r.heads.length,2);assert.equal(r.concat.length,3);assert.equal(r.concat[0].length,4);
  r.heads.forEach((head,i)=>{assert.equal(head.dk,2);assert.equal(head.dv,2);matrices(head.q,matrixProduct(input.values,p.heads[i].wq));});
  assert.notDeepEqual(r.heads[0].weights,r.heads[1].weights);
  r.concat.forEach((row,i)=>assert.deepEqual(row,[...r.heads[0].output[i],...r.heads[1].output[i]]));
});
test('WO 输出投影真实执行，不把 Concat 当最终答案',()=>{
  const p={heads:[{wq:identity,wk:identity,wv:identity}],wo:[[2,0],[0,3]]};
  const r=multiHead(x,p);matrices(r.output,r.concat.map(row=>[2*row[0],3*row[1]]));
});
test('修改一个 Head 后其他 Head 不变，组合结果更新',()=>{
  const input=defaultAttentionInput(), p=initializeMulti(4,2,42), before=structuredClone(p), r=multiHead(input.values,p);
  const edited=structuredClone(p);edited.heads[0].wq[0][0]+=1;
  const next=multiHead(input.values,edited);
  assert.deepEqual(next.heads[1],r.heads[1]);assert.notDeepEqual(next.heads[0].weights,r.heads[0].weights);assert.notDeepEqual(next.output,r.output);assert.deepEqual(p,before);
});
test('多头每头 Causal、独立参数数组和固定种子重复性',()=>{
  const p=initializeMulti(8,4,42);assert.deepEqual(p,initializeMulti(8,4,42));assert.notDeepEqual(p,initializeMulti(8,4,43));
  const copy=structuredClone(p);p.heads[0].wq[0][0]=99;assert.deepEqual(p.heads[1],copy.heads[1]);
  for(const head of multiHead(defaultAttentionInput(8).values,copy,true).heads)assert.deepEqual(head.weights[0],[1,0,0]);
  assert.deepEqual(initializeProjections(4,3,2,42),initializeProjections(4,3,2,42));
});
test('Concat 拒绝不一致行列和过大的组合',()=>{
  assert.deepEqual(concatHeads([[[1,2]],[[3,4]]]),[[1,2,3,4]]);
  for(const data of [[],[[[1]],[[1],[2]]],[[[1]],[[1,2]]],Array.from({length:8},()=>[[1,2,3]])])assert.throws(()=>concatHeads(data));
});
test('非法投影、QK 维度、WO 和 Head 配置拒绝',()=>{
  assert.throws(()=>project(x,{...parameters,wq:[[1]]}));
  assert.throws(()=>project(x,{...parameters,wk:[[1],[2]]}));
  assert.throws(()=>attention([[1]],[[1,2]],[[1]]));
  assert.throws(()=>attention([[1],[2]],[[1]],[[1]]));
  assert.throws(()=>multiHead(x,{...initializeMulti(2,2,42),wo:[[1]]}));
  for(const pair of [[4,3],[4,0],[4,9],[17,1]])assert.throws(()=>initializeMulti(...pair,42));
});
test('NaN/Infinity/字符串/空矩阵/不规则矩阵/稀疏数组安全拒绝',()=>{
  for(const bad of [[],[[NaN]],[[Infinity]],[[-Infinity]],[['1']],[[1,2],[1]],Array(2),[Array(2)]]){assert.throws(()=>transpose(bad));assert.throws(()=>attention(bad,x,x));}
  for(const row of [[],[NaN],[Infinity],['1'],Array(2)])assert.throws(()=>rowSoftmax(row));
  assert.throws(()=>scaleMatrix(x,Infinity));assert.throws(()=>scaleMatrix([[1e308]],2));
  assert.throws(()=>attention([[1e308]],[[1e308]],[[1]]));
});
test('教学尺寸边界、不同 dk/dv、随机种子边界',()=>{
  assert.equal(selfAttention([[1,2]],initializeProjections(2,1,3)).output[0].length,3);
  assert.equal(attention(Array.from({length:32},()=>[0]),Array.from({length:32},()=>[0]),Array.from({length:32},()=>[0])).weights.length,32);
  assert.throws(()=>attention(Array.from({length:33},()=>[0]),[[0]],[[0]]));
  for(const seed of [-1,NaN,Infinity,1.5,0x100000000])assert.throws(()=>initializeProjections(4,4,4,seed));
});
const exported=()=>exportPipeline(runPipeline('I love learning','whitespace',createVocabulary(DEFAULT_WORDS),createEmbedding(36,8)));
test('T07 实际导出数据直接导入：Token 顺序、ID、数值和形状完整',()=>{
  const data=exported(), parsed=parseAttentionInput(JSON.stringify(data));assert.deepEqual(parsed,data);
  const r=selfAttention(parsed.values,initializeProjections(8,8,8));assert.equal(r.output.length,3);assert.equal(r.output[0].length,8);
  parsed.values[0][0]=99;assert.notEqual(data.values[0][0],99);
});
test('T07 协议版本、类型、维度、长度、Token/ID、非法数值校验',()=>{
  const mutations=[d=>d.schemaVersion=2,d=>d.kind='other',d=>d.shape=[3,4],d=>d.ids=[1],d=>d.ids[0]=64,d=>d.ids=Array(3),d=>d.tokens[0]='',d=>d.tokens=Array(3),d=>d.values[0][0]=NaN,d=>d.values[0][0]=Infinity,d=>d.values[0][0]=10001,d=>d.tokenizer='other',d=>d.embeddingScale=2,d=>d.positionStart=1,d=>d.note=null];
  for(const mutate of mutations){const data=exported();mutate(data);assert.throws(()=>validateAttentionInput(data));}
  assert.throws(()=>validateAttentionInput({...exported(),values:[[1,2,3]],shape:[1,3],tokens:['a'],ids:[1]}));
  assert.throws(()=>validateAttentionInput({...exported(),values:[],shape:[0,8],tokens:[],ids:[]}));
  assert.throws(()=>parseAttentionInput('{'));assert.throws(()=>parseAttentionInput(' '.repeat(65537)));
});
function storage(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test('输入独立持久化、刷新读取、不触碰进度键',()=>{
  const db=storage();db.data.set('transformer-learning-lab.progress','keep');
  saveAttentionInput(db,exported());const next=loadAttentionInput(db);assert.equal(next.restored,true);assert.deepEqual(next.input,exported());assert.equal(db.data.get('transformer-learning-lab.progress'),'keep');
});
test('缺失/损坏/未来版本/存储拒绝明确回退，不擅自覆盖原记录',()=>{
  const db=storage();assert.equal(loadAttentionInput(db).restored,false);
  for(const raw of ['{','{"schemaVersion":2}',JSON.stringify({...exported(),values:[[null]]})]){db.data.set(ATTENTION_INPUT_KEY,raw);const r=loadAttentionInput(db);assert.equal(r.restored,false);assert.match(r.message,/回退/);assert.deepEqual(r.input,defaultAttentionInput());assert.equal(db.data.get(ATTENTION_INPUT_KEY),raw);}
  assert.match(loadAttentionInput({getItem(){throw Error('blocked');}}).message,/回退/);
  assert.throws(()=>saveAttentionInput({setItem(){throw Error('quota');}},exported()),/quota/);
});
test('上游 X/WQ/缩放/Mask 变化后重算一致，未修改原配置',()=>{
  const data=defaultAttentionInput(),p=initializeProjections(4,4,4),copy=structuredClone({data,p}),r=selfAttention(data.values,p);
  const edited=structuredClone(data.values);edited[0][0]=2;const next=selfAttention(edited,p,{causal:true});
  assert.deepEqual({data,p},copy);assert.notDeepEqual(next.q,r.q);assert.deepEqual(next.output[0],next.v[0]);matrices(next.q,matrixProduct(edited,p.wq));
});
test('六项挑战答案由真实数学计算构造，容限、漏选与错误答案',()=>{
  const answers=['4','11','0.7500001',['key-1','key-0'],'5','shape-3x4'];
  ATTENTION_CHALLENGES.forEach((block,i)=>{assert.equal(judgeAnswer(block.question,answers[i]).correct,true);assert.equal(judgeAnswer(block.question,block.question.kind==='multiple'?['key-0']:block.question.kind==='single'?'shape-6x2':'999').correct,false);});
});
test('四节教材关联、唯一块 ID、KaTeX 公式与九步公式有效',()=>{
  assert.deepEqual(validateContentLinks(lessons,lessonContents),[]);
  for(const id of ['attention-math','attention','multi-head','decoder-mask']){const lesson=lessons.find(item=>item.id===id),content=lessonContents[lesson.contentKey];assert.equal(content.kind,'structured');assert.equal(lesson.relatedExperimentId,'attention');for(const block of content.blocks)if(block.type==='formula')assert.doesNotThrow(()=>katex.renderToString(block.latex,{throwOnError:true,trust:false}));}
  for(const step of ATTENTION_STEPS)assert.doesNotThrow(()=>katex.renderToString(step[1],{throwOnError:true,trust:false}));
  const p=initializeProjections(4,4,4),x=defaultAttentionInput().values;
  assert.match(attentionStepFormula(5,selfAttention(x,p,{scaled:false})),/alpha=1/);
  assert.match(attentionStepFormula(5,selfAttention(x,p,{scaled:true})),/sqrt/);
  for(const scaled of [true,false])for(const causal of [true,false]){const r=selfAttention(x,p,{scaled,causal});for(let step=1;step<=9;step++)assert.doesNotThrow(()=>katex.renderToString(attentionStepFormula(step,r),{throwOnError:true,trust:false}));}
});
test('热力图实际数值与可访问节点、Masked Scores 显式状态渲染',()=>{
  const r=selfAttention(defaultAttentionInput().values,initializeProjections(4,4,4),{causal:true});
  const html=renderToStaticMarkup(React.createElement(AttentionHeatmap,{weights:r.weights,tokens:['I','love','AI'],query:0,selectedKey:1,onSelect(){}}));assert.match(html,/data-query="0" data-key="1" data-weight="0"/);assert.match(html,/tabindex="0"/);
  const masked=renderToStaticMarkup(React.createElement(AttentionMatrix,{title:'mask',values:r.maskedScores}));assert.match(masked,/data-value="masked"/);assert.doesNotMatch(masked,/NaN/);
});
test('九步渲染真实输入输出、类型形状和当前步骤高亮',()=>{
  const data=defaultAttentionInput(),p=initializeProjections(4,4,4),r=selfAttention(data.values,p);
  for(let step=1;step<=9;step++){const player={step,playing:false,speed:1,play(){},pause(){},reset(){},go(){},changeSpeed(){}};const html=renderToStaticMarkup(React.createElement(AttentionSteps,{x:data.values,parameters:p,result:r,player,query:0,onQuery(){}}));assert.match(html,new RegExp('data-step="'+step+'"'));assert.match(html,/本步输入矩阵及形状/);assert.match(html,/本步输出矩阵及形状/);assert.match(html,/aria-current="step"/);}
});
