import test from 'node:test';
import assert from 'node:assert/strict';
import katex from '../../frontend/node_modules/katex/dist/katex.mjs';
import { matrixProduct, tensorShape } from '../../frontend/src/services/tensorMath.ts';
import { transpose, multiHead, initializeMulti } from '../../frontend/src/services/attention/math.ts';
import { createEmbedding, positionalEncoding } from '../../frontend/src/services/language/representation.ts';
import { feedForward, addMatrices, layerNorm, addNorm, crossAttention, multiCross, encoderBlock, decoderBlock } from '../../frontend/src/services/transformer/math.ts';
import { DEFAULT_CONFIG, DEFAULT_VOCABULARY, initializeTransformer, validateConfig, forwardTransformer, embedInput, outputProjection, tokenizeInput, parameterMatrices, updateParameter, topTokens } from '../../frontend/src/services/transformer/model.ts';
import { tensorFlow, TRANSFORMER_FORMULAS } from '../../frontend/src/services/transformer/flow.ts';
const near=(a,b,eps=1e-11)=>assert.ok(Math.abs(a-b)<=eps, a+' != '+b);
const matrices=(a,b)=>{assert.equal(a.length,b.length);a.forEach((row,i)=>{assert.equal(row.length,b[i].length);row.forEach((n,j)=>near(n,b[i][j]));});};
const config={...DEFAULT_CONFIG}, size=DEFAULT_VOCABULARY.tokens.length;
const model=()=>initializeTransformer(config,size);
const forward=(p=model(),c=config,s=[4,5,6],t=[2,7])=>forwardTransformer(c,p,s,t);
const norm={gamma:[1,1],beta:[0,0]};
const ffn={w1:[[1,-1,2],[0,2,1]],b1:[0,1,-1],w2:[[1,0],[0,1],[1,1]],b2:[1,-1]};

test('FFN 小矩阵手工参考：线性、ReLU、输出形状和偏置',()=>{
  const r=feedForward([[1,2],[-1,0]],ffn);
  assert.deepEqual(r.linear1,[[1,4,3],[-1,2,-3]]);
  assert.deepEqual(r.activated,[[1,4,3],[0,2,0]]);
  assert.deepEqual(r.output,[[5,6],[1,1]]);
  assert.deepEqual(tensorShape(r.linear1),[2,3]);assert.deepEqual(tensorShape(r.output),[2,2]);
});
test('Position-wise FFN 共享参数且不同 Token 不直接互相影响',()=>{
  const r=feedForward([[1,2],[1,2]],ffn);assert.deepEqual(r.output[0],r.output[1]);
  const other=feedForward([[1,2],[5,9]],ffn);assert.deepEqual(r.output[0],other.output[0]);
  const frozen=structuredClone(ffn);feedForward([[3,4]],ffn);assert.deepEqual(ffn,frozen);
});
test('残差相加手工值、形状拒绝与溢出',()=>{
  assert.deepEqual(addMatrices([[1,2],[3,4]],[[5,6],[7,8]]),[[6,8],[10,12]]);
  assert.throws(()=>addMatrices([[1,2]],[[1]]));
  assert.throws(()=>addMatrices([[Number.MAX_VALUE]],[[Number.MAX_VALUE]]));
});
test('LayerNorm 逐 Token 总体均值/方差，不跨 Token 统计',()=>{
  const r=layerNorm([[1,3],[10,10]],norm);
  assert.deepEqual(r.means,[2,10]);assert.deepEqual(r.variances,[1,0]);
  matrices(r.normalized,[[-1/Math.sqrt(1.00001),1/Math.sqrt(1.00001)],[0,0]]);
  near(r.normalized[0].reduce((a,b)=>a+b)/2,0);
  near(r.normalized[0].reduce((a,b)=>a+b*b,0)/2,1/(1+1e-5));
});
test('LayerNorm gamma/beta 可学习变换与零方差 epsilon',()=>{
  const r=layerNorm([[1,3],[5,5]],{gamma:[2,3],beta:[4,6]});
  near(r.output[0][0],4-2/Math.sqrt(1.00001));near(r.output[0][1],6+3/Math.sqrt(1.00001));
  assert.deepEqual(r.output[1],[4,6]);assert.ok(r.output.flat().every(Number.isFinite));
});
test('Post-LN 先残差再归一化，保留全部中间数据',()=>{
  const r=addNorm([[1,2]],[[2,3]],norm);
  assert.deepEqual(r.residual,[[3,5]]);matrices(r.output,layerNorm([[3,5]],norm).output);
  assert.deepEqual(r.skip,[[1,2]]);assert.deepEqual(r.sublayer,[[2,3]]);
});
test('Cross-Attention 手工概率/加权值，Query 与 Source 长度不同',()=>{
  const r=crossAttention([[1],[0]],[[1],[2],[3]],[[2,0],[4,1],[6,2]]);
  assert.deepEqual(r.scores,[[1,2,3],[0,0,0]]);assert.deepEqual(tensorShape(r.weights),[2,3]);
  const denominator=Math.exp(1)+Math.exp(2)+Math.exp(3);
  near(r.weights[0][2],Math.exp(3)/denominator);
  matrices([r.output[1]],[[4,1]]);
  r.weights.forEach(row=>near(row.reduce((a,b)=>a+b),1));
  assert.ok(r.mask.flat().every(Boolean));
});
test('Multi-Cross 独立投影、Concat 和 WO 形状，等长时与 T08 数值一致',()=>{
  const p=initializeMulti(4,2,42),q=[[1,2,3,4],[4,3,2,1]],memory=[[2,1,0,-1]];
  const cross=multiCross(q,memory,p);assert.deepEqual(tensorShape(cross.concat),[2,4]);assert.deepEqual(tensorShape(cross.output),[2,4]);
  for(const head of cross.heads){assert.deepEqual(head.weights,[[1],[1]]);assert.deepEqual(tensorShape(head.k),[1,2]);}
  assert.deepEqual(multiCross(q,q,p),multiHead(q,p));
});
test('Encoder Block 与明确组装的注意力/残差/FFN 对照',()=>{
  const p=model().encoders[0],x=forward().source.output,r=encoderBlock(x,p);
  const attention=multiHead(x,p.self),n1=addNorm(x,attention.output,p.norm1),f=feedForward(n1.output,p.ffn),n2=addNorm(n1.output,f.output,p.norm2);
  matrices(r.output,n2.output);assert.ok(r.self.heads.every(h=>h.mask.flat().every(Boolean)));
});
test('多层 Encoder 输出逐层相接，层参数不共享对象',()=>{
  const c={...config,encoderLayers:3},p=initializeTransformer(c,size),r=forward(p,c);
  assert.equal(r.encoders.length,3);assert.deepEqual(r.encoders[1].input,r.encoders[0].output);
  assert.deepEqual(r.encoders[2].input,r.encoders[1].output);assert.deepEqual(r.memory,r.encoders[2].output);
  assert.notStrictEqual(p.encoders[0].self,p.encoders[1].self);assert.notDeepEqual(p.encoders[0].ffn.w1,p.encoders[1].ffn.w1);
});
test('Decoder 包含三次 Post-LN 和 Cross-Attention，Memory 为真实 Encoder 输出',()=>{
  const r=forward(),d=r.decoders[0];
  assert.deepEqual(d.memory,r.memory);assert.deepEqual(d.cross.heads[0].q,matrixProduct(d.norm1.output,model().decoders[0].cross.heads[0].wq));
  assert.deepEqual(d.cross.heads[0].k,matrixProduct(r.memory,model().decoders[0].cross.heads[0].wk));
  assert.deepEqual(d.ffn.input,d.norm2.output);assert.deepEqual(d.output,d.norm3.output);
  assert.deepEqual(tensorShape(d.cross.heads[0].weights),[2,3]);
});
test('Decoder Mask 未来权重严格为零，Cross 无 Mask',()=>{
  const r=forward(model(),config,[4,5],[2,7,8,9]);
  for(const d of r.decoders){for(const h of d.self.heads)for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.equal(h.weights[i][j],0);for(const h of d.cross.heads)assert.ok(h.mask.flat().every(Boolean));}
});
test('三层 Decoder 的未来信息隔离，已知前缀每层表示/概率保持一致',()=>{
  const c={...config,encoderLayers:3,decoderLayers:3},p=initializeTransformer(c,size);
  const a=forward(p,c,[4,5,6],[2,7,8]),b=forward(p,c,[4,5,6],[2,7,9]);
  for(let i=0;i<3;i++){matrices(a.decoders[i].output.slice(0,2),b.decoders[i].output.slice(0,2));matrices(a.decoders[i].self.heads[0].weights.slice(0,2),b.decoders[i].self.heads[0].weights.slice(0,2));}
  matrices(a.probabilities.slice(0,2),b.probabilities.slice(0,2));
  assert.notDeepEqual(a.output[2],b.output[2]);
});
test('延长目标前缀不改变已有位置，PE 不用全序列统计',()=>{
  const p=model(),a=forward(p,config,[4,5],[2,7]),b=forward(p,config,[4,5],[2,7,8,9]);
  matrices(a.output,b.output.slice(0,2));matrices(a.target.pe,b.target.pe.slice(0,2));
});
test('T07 Embedding/位置编码复用与明确 sqrt(d_model) 缩放',()=>{
  const e=createEmbedding(4,4,42),r=embedInput(e,[2,3],4);
  assert.deepEqual(r.vectors,[e[2],e[3]]);matrices(r.scaled,[e[2].map(n=>n*2),e[3].map(n=>n*2)]);
  assert.deepEqual(r.pe,positionalEncoding(2,4));assert.deepEqual(r.pe[0],[0,1,0,1]);
  matrices(r.output,addMatrices(r.scaled,r.pe));assert.deepEqual(createEmbedding(4,4,42),e);
});
test('共享输出投影 Eᵀ 与手工 Logits/Softmax 参考',()=>{
  const e=[[1,0],[0,1],[1,1],[0,0]],r=outputProjection([[2,3]],e);
  assert.deepEqual(r.projection,transpose(e));assert.deepEqual(r.logits,[[2,3,5,0]]);
  const denominator=Math.exp(2)+Math.exp(3)+Math.exp(5)+1;near(r.probabilities[0][2],Math.exp(5)/denominator);
});
test('完整 Transformer 所有层形状与概率归一化',()=>{
  const r=forward();assert.deepEqual(tensorShape(r.memory),[3,8]);assert.deepEqual(tensorShape(r.output),[2,8]);
  assert.deepEqual(tensorShape(r.logits),[2,16]);assert.deepEqual(tensorShape(r.probabilities),[2,16]);
  for(const row of r.probabilities){near(row.reduce((a,b)=>a+b),1);assert.ok(row.every(n=>n>=0&&n<=1));}
});
test('固定种子可重复，种子不同有差异；独立层/Head/Norm 参数',()=>{
  assert.deepEqual(model(),model());assert.notDeepEqual(model(),initializeTransformer({...config,seed:43},size));
  const p=model();assert.notStrictEqual(p.embedding[0],p.embedding[1]);assert.notStrictEqual(p.encoders[0].norm1.gamma,p.encoders[0].norm2.gamma);
  assert.notDeepEqual(p.decoders[0].self.heads[0],p.decoders[0].cross.heads[0]);
  assert.notStrictEqual(p.encoders[0].ffn.w1,p.decoders[0].ffn.w1);assert.deepEqual(forward(),forward());
});
test('最大教学配置 3/3 层、16 维、4 头、64 FFN、12/12 长度有限',()=>{
  const c={...config,dModel:16,heads:4,dFF:64,encoderLayers:3,decoderLayers:3},p=initializeTransformer(c,size);
  const r=forward(p,c,Array(12).fill(4),Array(12).fill(2));
  assert.deepEqual(tensorShape(r.probabilities),[12,16]);assert.ok(r.probabilities.flat().every(Number.isFinite));
  r.probabilities.forEach(row=>near(row.reduce((a,b)=>a+b),1));
});
test('修改上游 Embedding 同时更新源/目标与共享投影，不改变旧参数',()=>{
  const p=model(),before=forward(p),values=p.embedding.map(row=>[...row]);values[4][0]+=1;
  const edited=updateParameter(p,'embedding',values),after=forward(edited);
  assert.equal(p.embedding[4][0],model().embedding[4][0]);assert.equal(after.projection[0][4],values[4][0]);
  assert.notDeepEqual(before.memory,after.memory);assert.notDeepEqual(before.probabilities,after.probabilities);
});
test('修改 FFN/Norm/Head 参数独立且重算一致',()=>{
  const p=model(),list=parameterMatrices(p);assert.equal(new Set(list.map(item=>item.id)).size,list.length);
  for(const id of ['encoders.0.ffn.w1','decoders.0.norm3.beta','decoders.0.cross.heads.0.wq']){
    const d=list.find(item=>item.id===id),v=d.values.map(row=>[...row]);v[0][0]+=0.3;
    const next=updateParameter(p,id,v);assert.notDeepEqual(forward(p).output,forward(next).output);
    assert.deepEqual(next.encoders[0].self,p.encoders[0].self);
  }
});
test('配置与维度拒绝：层数/Heads/矩阵/序列/词表尺寸',()=>{
  for(const bad of [{dModel:6},{heads:3},{dFF:7},{encoderLayers:0},{decoderLayers:4},{epsilon:0},{seed:-1}])assert.throws(()=>validateConfig({...config,...bad}));
  const p=model();p.encoders[0].ffn.w2=[[1]];assert.throws(()=>forward(p));
  const wrong=model();wrong.decoders[0].self.heads.pop();assert.throws(()=>forward(wrong));
  assert.throws(()=>forward(model(),config,[],[2]));assert.throws(()=>forward(model(),config,[0],[2]));
  assert.throws(()=>forward(model(),config,Array(13).fill(4),[2]));
  assert.throws(()=>multiCross([[1,2]],[[1]],initializeMulti(2,1,42)));
});
test('非法值 NaN/Infinity/稀疏数组与坏 gamma/beta 安全拒绝',()=>{
  for(const n of [NaN,Infinity,-Infinity]){const p=model();p.embedding[0][0]=n;assert.throws(()=>forward(p));assert.throws(()=>layerNorm([[1,n]],norm));}
  assert.throws(()=>layerNorm([[1,2]],{gamma:[1],beta:[0,0]}));assert.throws(()=>layerNorm([[1,2]],norm,NaN));
  assert.throws(()=>crossAttention([[1]],[[1],[2]],[[1]]));
  assert.throws(()=>feedForward([[1,2]],{...ffn,b1:[NaN,0,0]}));
  assert.throws(()=>updateParameter(model(),'nonexistent',[[1]]));assert.throws(()=>updateParameter(model(),'embedding',[[1]]));
  assert.throws(()=>forward(model(),config,Array(2),[2]));
});
test('真实 Tokenization/UNK、ID 与序列教学上限',()=>{
  const r=tokenizeInput('I love AI',DEFAULT_VOCABULARY);assert.deepEqual(r.ids,[4,5,6]);assert.deepEqual(r.tokens,['I','love','AI']);
  assert.deepEqual(tokenizeInput('未知',DEFAULT_VOCABULARY).ids,[1]);
  assert.throws(()=>tokenizeInput('',DEFAULT_VOCABULARY));assert.throws(()=>tokenizeInput('[PAD]',DEFAULT_VOCABULARY));
  assert.throws(()=>tokenizeInput(Array(13).fill('I').join(' '),DEFAULT_VOCABULARY));
});
test('Top-K 从真实概率排序，ID 稳定并验证非法 count',()=>{
  const r=forward(),ranked=topTokens(r.probabilities[1],DEFAULT_VOCABULARY,5);
  assert.equal(ranked.length,5);ranked.forEach((item,i)=>{assert.equal(item.probability,r.probabilities[1][item.id]);if(i)assert.ok(ranked[i-1].probability>=item.probability);});
  assert.throws(()=>topTokens(r.probabilities[1],DEFAULT_VOCABULARY,0));
});
test('Tensor Flow 全真实张量、依赖有序、三子层和形状齐全',()=>{
  const r=forward(),flow=tensorFlow(r),ids=new Set();
  for(const step of flow){assert.ok(!ids.has(step.id));for(const id of step.dependencies)assert.ok(ids.has(id));ids.add(step.id);assert.deepEqual(step.shape,tensorShape(step.output));}
  assert.deepEqual(flow.find(s=>s.id==='encoder-memory').output,r.memory);
  assert.deepEqual(flow.find(s=>s.id==='decoder-0-cross').dependencies,['decoder-0-norm1','encoder-memory']);
  assert.deepEqual(flow.at(-1).output,r.probabilities);assert.ok(ids.has('decoder-0-norm3'));
});
test('Tensor Flow 公式经过真实 KaTeX 排版，所有配置可生成一致追踪',()=>{
  for(const latex of Object.values(TRANSFORMER_FORMULAS))assert.doesNotThrow(()=>katex.renderToString(latex,{throwOnError:true}));
  assert.match(katex.renderToString(TRANSFORMER_FORMULAS.attention),/mfrac/);
  assert.match(katex.renderToString(TRANSFORMER_FORMULAS.normStatistics),/μ/);
  for(const c of [config,{...config,encoderLayers:3,decoderLayers:3,dModel:16,dFF:64,heads:4}]){
    const flow=tensorFlow(forward(initializeTransformer(c,size),c));
    for(const step of flow)assert.doesNotThrow(()=>katex.renderToString(step.formula,{throwOnError:true}));
    assert.equal(flow.filter(s=>s.attention).length,c.encoderLayers+2*c.decoderLayers);
    assert.equal(flow.filter(s=>s.norm).length,2*c.encoderLayers+3*c.decoderLayers);
  }
});
