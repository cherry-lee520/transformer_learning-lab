import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from '../../frontend/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../frontend/node_modules/react-dom/server.node.js';
import katex from '../../frontend/node_modules/katex/dist/katex.mjs';
import { tokenize, graphemes, SUBWORDS } from '../../frontend/src/services/language/tokenization.ts';
import { createVocabulary, DEFAULT_WORDS, idToToken, tokenToId, oneHot, validateVocabulary } from '../../frontend/src/services/language/vocabulary.ts';
import { dimension, createEmbedding, embeddingLookup, lookupEquivalence, positionalEncoding, positionalValue, positionalCurves, addRepresentations } from '../../frontend/src/services/language/representation.ts';
import { compareVectors } from '../../frontend/src/services/language/similarity.ts';
import { runPipeline, exportPipeline } from '../../frontend/src/services/language/pipeline.ts';
import { matrixProduct, tensorShape } from '../../frontend/src/services/tensorMath.ts';
import { matMul } from '../../frontend/src/services/mlp/matrix.ts';
import { MatrixView } from '../../frontend/src/experiments/language/MatrixView.tsx';
import { PositionHeatmap } from '../../frontend/src/visualizations/language/PositionHeatmap.tsx';
import { PipelineExplorer } from '../../frontend/src/experiments/language/PipelineExplorer.tsx';
import { lessons } from '../../frontend/src/lessons/index.ts';
import { lessonContents } from '../../frontend/src/lessons/content.ts';
import { validateContentLinks } from '../../frontend/src/lessons/contentValidation.ts';
const close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance, a+' != '+b);
const texts=tokens=>tokens.map(token=>token.text);
const vocabulary=createVocabulary(DEFAULT_WORDS), embedding=createEmbedding(vocabulary.tokens.length,8);
test('空文本与多个空白明确产生空序列，不自动插入特殊 Token',()=>{
  for(const mode of ['whitespace','character','subword']) for(const text of ['',' \t\n  ']) assert.deepEqual(tokenize(text,mode),[]);
});
test('英文空格分词保留词内标点，连续空白合并并保存来源区间',()=>{
  const text='  I  love\tlearning! ';
  const result=tokenize(text,'whitespace'); assert.deepEqual(texts(result),['I','love','learning!']);
  for(const token of result) assert.equal(text.slice(token.start,token.end),token.text);
});
test('中文三种模式的差异来自确定规则',()=>{
  const text='我喜欢学习。';
  assert.deepEqual(texts(tokenize(text,'whitespace')),[text]);
  assert.deepEqual(texts(tokenize(text,'character')),['我','喜','欢','学','习','。']);
  assert.deepEqual(texts(tokenize(text,'subword')),['我','喜欢','学习','。']);
});
test('Unicode 字素完整，代理对、组合符号、肤色及家庭 emoji 不拆成 UTF-16 单元',()=>{
  const text='𠮷 e\u0301 👍🏽 👨‍👩‍👧‍👦';
  assert.deepEqual(texts(tokenize(text,'character')),['𠮷','e\u0301','👍🏽','👨‍👩‍👧‍👦']);
  assert.deepEqual(texts(tokenize(text,'subword')),['𠮷','e\u0301','👍🏽','👨‍👩‍👧‍👦']);
  for(const token of graphemes(text)) assert.equal(text.slice(token.start,token.end),token.text);
});
test('简化子词固定最长匹配、大小写敏感、回退字素且可复现',()=>{
  const text='learning learner Transformers!';
  assert.deepEqual(texts(tokenize(text,'subword')),['learning','learn','er','Transform','ers','!']);
  assert.deepEqual(tokenize(text,'subword'),tokenize(text,'subword')); assert.ok(SUBWORDS.includes('learning'));
});
test('分词非法模式、非字符串、超长文本与超序列长度拒绝且不截断',()=>{
  for(const [text,mode] of [[null,'character'],['a','bad'],['a'.repeat(257),'whitespace'],['a'.repeat(33),'character']]) assert.throws(()=>tokenize(text,mode));
  assert.equal(tokenize('a'.repeat(32),'character').length,32);
});
test('词表稳定双向映射与特殊 ID，未知明确映射 UNK',()=>{
  assert.deepEqual(vocabulary.tokens.slice(0,4),['[PAD]','[UNK]','[BOS]','[EOS]']);
  for(let id=0;id<vocabulary.tokens.length;id++) assert.equal(tokenToId(vocabulary,idToToken(vocabulary,id)),id);
  assert.equal(tokenToId(vocabulary,'unseen'),1); assert.equal(idToToken(vocabulary,1),'[UNK]');
  assert.deepEqual(createVocabulary(DEFAULT_WORDS),vocabulary);
});
test('空自定义词表保留特殊项，重复/空项/超大词表/无效反查安全拒绝',()=>{
  assert.equal(createVocabulary([]).tokens.length,4);
  for(const words of [['a','a'],['[PAD]'],[''],['a b'],Array.from({length:61},(_,i)=>'t'+i)]) assert.throws(()=>createVocabulary(words));
  for(const id of [-1,0.5,NaN,Infinity,36]) assert.throws(()=>idToToken(vocabulary,id));
  assert.throws(()=>validateVocabulary({tokens:['a']})); assert.throws(()=>tokenToId(vocabulary,null));
});
test('One-Hot 真实非零位置、尺寸变化与边界',()=>{
  assert.deepEqual(oneHot(2,4),[0,0,1,0]);
  assert.equal(oneHot(63,64).reduce((sum,n)=>sum+n),1);
  for(const [id,size] of [[4,4],[-1,4],[1,0],[0,65],[0.5,4]]) assert.throws(()=>oneHot(id,size));
});
test('共享矩阵乘法支持词表尺寸，保留 T06 原 8×8 限制及数值行为',()=>{
  assert.deepEqual(matrixProduct([[1,2]],[[3,4],[5,6]]),[[13,16]]);
  assert.deepEqual(matMul([[1,2]],[[3,4],[5,6]]),[[13,16]]);
  const large=Array.from({length:12},()=>[1,2]);
  assert.deepEqual(tensorShape(large),[12,2]); assert.throws(()=>matMul(large,[[1],[1]]));
});
test('Embedding 教学预设、固定种子可重复，种子改变影响真实元素',()=>{
  assert.deepEqual(createEmbedding(4,8),createEmbedding(4,8));
  assert.deepEqual(createEmbedding(4,8,42),createEmbedding(4,8,42));
  assert.notDeepEqual(createEmbedding(4,8,42),createEmbedding(4,8,43));
  assert.ok(createEmbedding(64,16,42).flat().every(n=>n>=-1&&n<=1));
});
test('Embedding 查表顺序、重复词、修改行及不变性',()=>{
  const original=structuredClone(embedding), vectors=embeddingLookup(embedding,[4,5,4]);
  assert.deepEqual(vectors,[embedding[4],embedding[5],embedding[4]]);
  vectors[0][0]=99; assert.deepEqual(embedding,original);
  const edited=structuredClone(embedding); edited[4][0]=2; assert.equal(embeddingLookup(edited,[4,5,4])[2][0],2);
  assert.deepEqual(embeddingLookup(embedding,[]),[]);
});
test('One-Hot × E 与所有 ID 的直接查表逐元素一致',()=>{
  for(let id=0;id<vocabulary.tokens.length;id++) {const proof=lookupEquivalence(embedding,id); assert.equal(proof.equal,true); assert.deepEqual(proof.product,embedding[id]);}
});
test('Embedding 非法 ID、矩阵、奇数维度、种子安全拒绝',()=>{
  for(const args of [[0,8],[65,8],[4,3],[4,8,-1],[4,8,NaN],[4,8,0x100000000]]) assert.throws(()=>createEmbedding(...args));
  assert.throws(()=>embeddingLookup(embedding,[-1])); assert.throws(()=>embeddingLookup([[1,2],[3]],[]));
  assert.throws(()=>embeddingLookup([[NaN,1]],[0])); assert.throws(()=>embeddingLookup(embedding,Array(33).fill(0)));
  assert.throws(()=>embeddingLookup(embedding,Array(1))); assert.throws(()=>validateVocabulary({tokens:Array(4)}));
});
test('点积、余弦、距离与逐项过程一致，浮点精度',()=>{
  const r=compareVectors([1,2],[2,1]); assert.equal(r.dot,4); close(r.cosine,0.8); close(r.distance,Math.sqrt(2));
  assert.deepEqual(r.products,[2,2]); assert.deepEqual(r.squaredDifferences,[1,1]);
  close(compareVectors([0.1,0.2],[0.3,0.4]).dot,0.11);
});
test('相同、反向、正交向量及零向量余弦未定义',()=>{
  close(compareVectors([1,0],[1,0]).cosine,1); close(compareVectors([1,0],[-1,0]).cosine,-1);
  close(compareVectors([1,0],[0,1]).cosine,0);
  for(const [a,b] of [[[0,0],[1,2]],[[1,2],[0,0]],[[0,0],[0,0]]]) assert.equal(compareVectors(a,b).cosine,null);
});
test('相似度长度/有限性/溢出保护，不显示 NaN 或 Infinity',()=>{
  for(const [a,b] of [[[],[]],[[1],[1,2]],[[NaN],[1]],[[1],[Infinity]],[[1e308],[1e308]]]) assert.throws(()=>compareVectors(a,b));
});
test('PE 偶数正弦、奇数余弦使用相同配对频率',()=>{
  for(const dim of [2,4,8,16]) for(const pos of [0,1,7,31]) for(let i=0;i<dim/2;i++){
    const angle=pos/10000**(2*i/dim);
    close(positionalValue(pos,2*i,dim),Math.sin(angle)); close(positionalValue(pos,2*i+1,dim),Math.cos(angle));
  }
});
test('PE 零位置交替 0/1，不同位置不同且与词表 ID 无关',()=>{
  assert.deepEqual(positionalEncoding(2,8)[0],[0,1,0,1,0,1,0,1]);
  assert.notDeepEqual(positionalEncoding(2,8)[0],positionalEncoding(2,8)[1]);
  const r=runPipeline('I I','whitespace',vocabulary,embedding);
  assert.equal(r.ids[0],r.ids[1]); assert.deepEqual(r.vectors[0],r.vectors[1]); assert.notDeepEqual(r.input[0],r.input[1]);
});
test('位置曲线采样与矩阵同一公式，含两端并选中成对维度',()=>{
  const curves=positionalCurves(8,3,8); assert.deepEqual(curves.map(c=>c.column),[2,3]);
  for(const curve of curves) for(const point of curve.points) close(point.y,positionalValue(point.x,curve.column,8));
  assert.equal(curves[0].points.length,129); assert.equal(curves[0].points.at(-1).x,7);
});
test('位置编码尺寸和索引边界，零长序列有效，奇数维度拒绝',()=>{
  assert.deepEqual(positionalEncoding(0,8),[]); assert.equal(positionalEncoding(32,16).length,32);
  for(const dim of [0,-2,3,18,Infinity]) assert.throws(()=>dimension(dim));
  for(const length of [-1,0.5,33,NaN]) assert.throws(()=>positionalEncoding(length,8));
  for(const args of [[-1,0,8],[32,0,8],[0,8,8],[0,0.5,8]]) assert.throws(()=>positionalValue(...args));
  assert.throws(()=>positionalCurves(0,0,8));
});
test('Embedding + PE 真实逐项相加，拒绝不一致形状，不修改输入',()=>{
  const a=[[0.2,-0.4,0.1,0.3]], pe=positionalEncoding(1,4), before=structuredClone(a);
  const result=addRepresentations(a,pe,4); [0.2,0.6,0.1,1.3].forEach((n,i)=>close(result[0][i],n));
  assert.deepEqual(a,before); assert.deepEqual(addRepresentations([],[],8),[]);
  assert.throws(()=>addRepresentations(a,[],4)); assert.throws(()=>addRepresentations([[1,2]],[[1,2,3,4]],4));
});
test('矩阵形状、非法数值和运算溢出保护',()=>{
  for(const m of [[],[[1],[2,3]],[[Infinity]],Array(65).fill([1]),[Array(2)]]) assert.throws(()=>tensorShape(m));
  assert.throws(()=>matrixProduct([[1,2]],[[1,2]])); assert.throws(()=>matrixProduct([[1e308]],[[2]]));
  assert.throws(()=>addRepresentations([[1e308,1]],[[1e308,1]],2));
});
test('完整流水线所有中间结果/形状/UNK/重复与最终值一致',()=>{
  const r=runPipeline('I love unknown I','whitespace',vocabulary,embedding);
  assert.deepEqual(r.ids,[4,5,1,4]); assert.equal(r.mappings[2].unknown,true);
  assert.deepEqual(r.shapes,{oneHot:[4,36],embedding:[36,8],sentence:[4,8]});
  assert.deepEqual(matrixProduct(r.hot,embedding),r.vectors);
  assert.deepEqual(r.input,addRepresentations(r.vectors,r.pe,8));
  for(let i=0;i<r.input.length;i++) for(let j=0;j<8;j++) close(r.input[i][j],embedding[r.ids[i]][j]+positionalValue(i,j,8));
});
test('空流水线和词表修改重新计算，不保留旧矩阵或伪填充行',()=>{
  const empty=runPipeline('','character',vocabulary,embedding);
  for(const key of ['ids','hot','vectors','pe','input']) assert.deepEqual(empty[key],[]);
  assert.deepEqual(empty.shapes.sentence,[0,8]);
  const small=createVocabulary([]), r=runPipeline('I love','whitespace',small,createEmbedding(4,2));
  assert.deepEqual(r.ids,[1,1]); assert.deepEqual(r.shapes.oneHot,[2,4]); assert.deepEqual(r.shapes.sentence,[2,2]);
  assert.throws(()=>runPipeline('I','whitespace',small,embedding));
});
test('版本化导出携带顺序、形状和原始数值，复制不共享矩阵引用',()=>{
  const r=runPipeline('I love learning','whitespace',vocabulary,embedding), json=exportPipeline(r);
  assert.equal(json.schemaVersion,1); assert.deepEqual(json.tokens,['I','love','learning']); assert.deepEqual(json.shape,[3,8]);
  assert.deepEqual(json.values,r.input); json.values[0][0]=42; assert.notEqual(json.values[0][0],r.input[0][0]);
  assert.deepEqual(exportPipeline(runPipeline('','whitespace',vocabulary,embedding)).shape,[0,8]);
});
test('实际矩阵和热图组件渲染计算值与形状，空序列安全展示',()=>{
  const pe=positionalEncoding(3,8);
  const markup=renderToStaticMarkup(createElement(PositionHeatmap,{values:pe,selected:1,onSelect:()=>{}}));
  assert.equal((markup.match(/data-position=/g)||[]).length,24); assert.ok(markup.includes('data-value="'+pe[1][0]+'"'));
  const table=renderToStaticMarkup(createElement(MatrixView,{title:'test',values:pe,columns:8})); assert.ok(table.includes('3 × 8'));
  assert.ok(renderToStaticMarkup(createElement(MatrixView,{title:'empty',values:[],columns:8})).includes('空序列'));
});
test('八步流水线真实渲染，正常/空矩阵及每步公式有效',()=>{
  const r=runPipeline('I love learning','whitespace',vocabulary,embedding);
  for(let step=0;step<8;step++){
    const markup=renderToStaticMarkup(createElement(PipelineExplorer,{result:r,vocabulary,embedding,step,onStep:()=>{}}));
    assert.ok(markup.includes('STEP '+(step+1))); assert.ok(markup.includes('查看输入')); assert.ok(markup.includes('查看输出'));
  }
  const final=renderToStaticMarkup(createElement(PipelineExplorer,{result:r,vocabulary,embedding,step:7,onStep:()=>{}}));
  assert.ok(final.includes('data-value="'+r.input[0][0]+'"'));
});
test('两节教材稳定 ID/正文/实验关联完整，公式由真正 KaTeX 排版',()=>{
  assert.deepEqual(validateContentLinks(lessons,lessonContents),[]);
  for(const id of ['embedding','position-encoding']){
    const lesson=lessons.find(item=>item.id===id), content=lessonContents[lesson.contentKey];
    assert.equal(lesson.relatedExperimentId,'language-representation'); assert.equal(content.lessonId,id);
    for(const block of content.blocks) if(block.type==='formula') assert.ok(katex.renderToString(block.latex,{throwOnError:true}).includes('katex'));
  }
});
