import test from 'node:test';
import assert from 'node:assert/strict';
import { matMul, matVec, transpose, outer } from '../../frontend/src/services/mlp/matrix.ts';
import { initializeNetwork, forwardNetwork, forwardLayer, validateModel, cloneModel, DEFAULT_ARCHITECTURE, DEFAULT_SEED, XOR_DATA } from '../../frontend/src/services/mlp/network.ts';
import { mseLoss, sigmoidBCELoss, probabilityBCE } from '../../frontend/src/services/mlp/loss.ts';
import { backwardSample, backwardBatch, datasetLoss, trainingActivationSlope, applySGD } from '../../frontend/src/services/mlp/backprop.ts';
import { checkGradients } from '../../frontend/src/services/mlp/gradientCheck.ts';
import { activationDerivative } from '../../frontend/src/services/activationMath.ts';
import { activate } from '../../frontend/src/services/neuronMath.ts';
import { createSession, advanceTraining, DEFAULT_TRAINING, clearLossHistory, HISTORY_LIMIT, SNAPSHOT_LIMIT, validateSettings } from '../../frontend/src/services/mlp/training.ts';
import { sampleDecisionBoundary } from '../../frontend/src/services/mlp/decisionBoundary.ts';
import { createElement } from '../../frontend/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../frontend/node_modules/react-dom/server.js';
import { NetworkGraph } from '../../frontend/src/visualizations/neural-network/NetworkGraph.tsx';
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, a + ' differs from ' + b);
const one = (activation = 'linear') => ({ inputSize: 2, layers: [{ weights: [[2, -1]], biases: [0.5], activation }] });
const sample = { id: 'sample', input: [1, 2], target: 1 };
test('矩阵乘法、转置、列向量与外积使用统一形状', () => {
  assert.deepEqual(matMul([[1,2],[3,4]], [[5],[6]]), [[17],[39]]);
  assert.deepEqual(matVec([[1,2],[3,4]], [5,6]), [17,39]);
  assert.deepEqual(transpose([[1,2],[3,4],[5,6]]), [[1,3,5],[2,4,6]]);
  assert.deepEqual(outer([2,3], [4,5]), [[8,10],[12,15]]);
  for (const action of [() => matMul([[1,2]],[[3,4]]), () => matVec([[1]], [1,2]), () => transpose([[1],[2,3]]), () => matVec([[Infinity]], [1]), () => matVec([[Number.MAX_VALUE]], [2])]) assert.throws(action);
});
test('固定种子 Xavier 初始化可复现，参数与偏置形状匹配且互不共享', () => {
  const first = initializeNetwork(DEFAULT_ARCHITECTURE, DEFAULT_SEED), second = initializeNetwork(DEFAULT_ARCHITECTURE, DEFAULT_SEED);
  assert.deepEqual(first, second); assert.notDeepEqual(first, initializeNetwork(DEFAULT_ARCHITECTURE, 43));
  assert.deepEqual(first.layers.map(l => [l.weights.length, l.weights[0].length, l.biases.length]), [[4,2,4],[1,4,1]]);
  first.layers[0].weights[0][0] = 99; assert.notEqual(second.layers[0].weights[0][0], 99);
  for (const sizes of [[1],[8],[1,8],[8,8]]) validateModel(initializeNetwork({ ...DEFAULT_ARCHITECTURE, hiddenSizes:sizes }, 0));
});
test('非法结构、维度、随机种子、参数与输入均拒绝', () => {
  for (const sizes of [[], [0], [9], [1,1,1]]) assert.throws(() => initializeNetwork({ ...DEFAULT_ARCHITECTURE, hiddenSizes:sizes }, 42));
  for (const seed of [-1,1.5,Infinity,4294967296]) assert.throws(() => initializeNetwork(DEFAULT_ARCHITECTURE, seed));
  for (const model of [null, {inputSize:2,layers:[]}, {inputSize:2,layers:[{weights:[[1]],biases:[0],activation:'linear'}]}, {inputSize:2,layers:[{weights:[[1,2]],biases:[NaN],activation:'linear'}]}]) assert.throws(() => validateModel(model));
  assert.throws(() => forwardNetwork(one(), [1])); assert.throws(() => forwardNetwork(one(), [NaN,1]));
  assert.throws(() => forwardNetwork(one(), [Number.MAX_VALUE,0]));
});
test('单层与多层前向传播、每层张量形状、分层执行结果一致', () => {
  const trace = forwardNetwork(one(), [1,2]); close(trace.prediction, 0.5);
  assert.deepEqual(trace.layers[0], {input:[1,2],weightsShape:[1,2],biasShape:[1,1],z:[0.5],a:[0.5]});
  const model = {inputSize:2,layers:[{weights:[[1,2],[-1,1]],biases:[1,-1],activation:'linear'},{weights:[[2,-3]],biases:[4],activation:'linear'}]};
  const full = forwardNetwork(model, [2,3]); close(full.prediction,22);
  const layer1 = forwardLayer(model.layers[0], [2,3]), layer2 = forwardLayer(model.layers[1], layer1.a);
  assert.deepEqual(full.layers,[layer1,layer2]);
});
test('ReLU、Sigmoid、Tanh 前向值复用 T04 核心，极端输入保持有限', () => {
  for (const activation of ['linear','relu','sigmoid','tanh']) for (const x of [-1000,0,1000]) {
    const model = {inputSize:1,layers:[{weights:[[1]],biases:[0],activation}]};
    close(forwardNetwork(model,[x]).prediction, activate(x,activation));
  }
});
test('MSE 采用未除以二的单样本平方误差与对应梯度', () => {
  assert.deepEqual(mseLoss(0.25,1), {value:0.5625,gradient:-1.5});
  assert.deepEqual(mseLoss(2,0), {value:4,gradient:4});
  assert.throws(() => mseLoss(Infinity,0));
  const result = backwardSample(one(),sample,'mse');
  close(result.loss,0.25); assert.deepEqual(result.layers[0].delta,[-1]);
  assert.deepEqual(result.layers[0].weights,[[-1,-2]]); assert.deepEqual(result.layers[0].biases,[-1]);
});
test('BCE 概率与 logit 定义一致，合并梯度真实计算', () => {
  const loss = sigmoidBCELoss(0,1); close(loss.value,Math.log(2)); close(loss.delta,-0.5); close(loss.outputGradient,-2);
  for(const z of [-10,-2,0,2,10]) for(const y of [0,0.3,1]) {
    const computed=sigmoidBCELoss(z,y); close(computed.value,probabilityBCE(activate(z,'sigmoid'),y),1e-10);
    close(computed.delta,activate(z,'sigmoid')-y);
  }
  assert.equal(probabilityBCE(0,1),null); assert.equal(probabilityBCE(1,0),null);
  assert.equal(probabilityBCE(0,0),0); assert.equal(probabilityBCE(1,1),0);
  assert.throws(()=>sigmoidBCELoss(0,2)); assert.throws(()=>probabilityBCE(-1,0));
});
test('BCE 极端 logit 稳定，无概率裁切造成的损失梯度矛盾', () => {
  close(sigmoidBCELoss(1000,0).value,1000); close(sigmoidBCELoss(1000,0).delta,1);
  close(sigmoidBCELoss(-1000,1).value,1000); close(sigmoidBCELoss(-1000,1).delta,-1);
  assert.equal(sigmoidBCELoss(1000,0).outputGradient,null);
  assert.ok(sigmoidBCELoss(40,1).delta < 0); assert.ok(sigmoidBCELoss(-40,0).delta > 0);
  for(const z of [-Number.MAX_VALUE,Number.MAX_VALUE]) for(const y of [0,1]) assert.ok(Number.isFinite(sigmoidBCELoss(z,y).value));
  assert.throws(()=>backwardSample(one('linear'),sample,'bce'));
});
test('BCE 反向传播与输出、权重和偏置维度一致', () => {
  const result=backwardSample(one('sigmoid'),sample,'bce'), d=activate(0.5,'sigmoid')-1;
  close(result.layers[0].delta[0],d); close(result.layers[0].weights[0][0],d); close(result.layers[0].weights[0][1],2*d); close(result.layers[0].biases[0],d);
  const extreme=backwardSample({inputSize:1,layers:[{weights:[[1]],biases:[1000],activation:'sigmoid'}]},{id:'s',input:[0],target:0},'bce');
  assert.equal(extreme.outputGradient,null); assert.equal(extreme.layers[0].upstream,null); assert.deepEqual(extreme.layers[0].delta,[1]);
});
test('批量损失与梯度是样本均值，不重复除以批量大小', () => {
  const model=initializeNetwork(DEFAULT_ARCHITECTURE,42), batch=backwardBatch(model,XOR_DATA,'bce');
  close(batch.loss,XOR_DATA.reduce((s,d)=>s+backwardSample(model,d,'bce').loss/4,0));
  for(let l=0;l<model.layers.length;l++) for(let r=0;r<model.layers[l].weights.length;r++) for(let c=0;c<model.layers[l].weights[r].length;c++) close(batch.gradients[l].weights[r][c],batch.samples.reduce((s,d)=>s+d.layers[l].weights[r][c]/4,0));
  close(datasetLoss(model,XOR_DATA,'bce'),batch.loss);
});
test('多层链式法则的 delta、dW、db 和上一层 dL/da 正确', () => {
  const model={inputSize:1,layers:[{weights:[[2]],biases:[1],activation:'linear'},{weights:[[3]],biases:[0],activation:'linear'}]};
  const result=backwardSample(model,{id:'s',input:[1],target:1},'mse');
  close(result.loss,64); assert.deepEqual(result.layers.map(l=>l.delta),[[48],[16]]);
  assert.deepEqual(result.layers.map(l=>l.weights),[[[48]],[[48]]]);
  assert.deepEqual(result.layers[0].upstream,[48]);
});
test('中心差分验证 MSE/BCE 的一层和两层隐藏网络，光滑点覆盖所有激活', () => {
  for(const hiddenActivation of ['linear','sigmoid','tanh','relu']) for(const loss of ['mse','bce']) for(const hiddenSizes of [[3],[3,2]]) {
    const model=initializeNetwork({...DEFAULT_ARCHITECTURE,hiddenActivation,hiddenSizes},23);
    if(hiddenActivation==='relu') model.layers.slice(0,-1).forEach(l=>l.biases.fill(2));
    const result=checkGradients(model,[{id:'a',input:[0.2,0.7],target:1},{id:'b',input:[-0.1,0.4],target:0}],loss);
    assert.equal(result.status,'checked'); assert.equal(result.passed,true); assert.ok(result.maxAbsoluteError<1e-7);
  }
});
test('ReLU 零点训练次梯度约定为 0，T05 数学导数保持未定义且数值检查跳过', () => {
  assert.equal(trainingActivationSlope(0,'relu'),0); assert.equal(activationDerivative(0,'relu').status,'undefined');
  const model={inputSize:1,layers:[{weights:[[1]],biases:[0],activation:'relu'},{weights:[[1]],biases:[0],activation:'sigmoid'}]};
  const result=checkGradients(model,[{id:'kink',input:[0],target:1}],'bce');
  assert.equal(result.status,'skipped'); assert.equal(result.passed,false);
  assert.deepEqual(backwardSample(model,{id:'kink',input:[0],target:1},'bce').layers[0].delta,[0]);
});
test('SGD 按原始梯度更新全部参数，不修改输入网络/梯度', () => {
  const model=one(), before=cloneModel(model), backward=backwardBatch(model,[sample],'mse'), gradients=structuredClone(backward.gradients);
  const after=applySGD(model,backward.gradients,0.1);
  close(after.layers[0].weights[0][0],2.1); close(after.layers[0].weights[0][1],-0.8); close(after.layers[0].biases[0],0.6);
  assert.deepEqual(model,before); assert.deepEqual(backward.gradients,gradients);
  assert.throws(()=>applySGD(model,[],0.1)); assert.throws(()=>applySGD(model,backward.gradients,Infinity));
  assert.throws(()=>applySGD(model,[{weights:[[1]],biases:[0]}],0.1));
});
test('训练步快照、当前模型和历史均来自同一次计算，批量游标/Epoch 正确', () => {
  const original=createSession(), next=advanceTraining(original,{...DEFAULT_TRAINING,batchSize:2});
  assert.equal(original.step,0); assert.equal(next.step,1); assert.equal(next.epoch,0); assert.equal(next.examplesSeen,2);
  const snapshot=next.snapshots[0]; assert.deepEqual(snapshot.backward.samples.map(s=>s.sample.id),['xor-00','xor-01']);
  assert.equal(snapshot.before,original.model); assert.equal(snapshot.after,next.model);
  close(next.loss,datasetLoss(next.model,XOR_DATA,'bce')); close(next.history.at(-1).loss,next.loss);
  const second=advanceTraining(next,{...DEFAULT_TRAINING,batchSize:2});
  assert.equal(second.epoch,1); assert.deepEqual(second.snapshots.at(-1).backward.samples.map(s=>s.sample.id),['xor-10','xor-11']);
});
test('有限历史、详细快照和曲线清空不会重置模型或伪造训练步', () => {
  let session=createSession(); for(let i=0;i<350;i++) session=advanceTraining(session,DEFAULT_TRAINING);
  assert.equal(session.history.length,HISTORY_LIMIT); assert.equal(session.snapshots.length,SNAPSHOT_LIMIT);
  const cleared=clearLossHistory(session); assert.equal(cleared.model,session.model); assert.equal(cleared.step,350); assert.equal(cleared.history.length,1);
  assert.equal(advanceTraining(session,{...DEFAULT_TRAINING,maxSteps:350}),session);
});
test('非法训练设置、空批量和标签安全拒绝', () => {
  for(const settings of [{...DEFAULT_TRAINING,learningRate:0},{...DEFAULT_TRAINING,learningRate:NaN},{...DEFAULT_TRAINING,batchSize:3},{...DEFAULT_TRAINING,maxSteps:5001},{...DEFAULT_TRAINING,loss:'unknown'}]) assert.throws(()=>validateSettings(settings));
  assert.throws(()=>backwardBatch(one(),[],'mse')); assert.throws(()=>backwardSample(one(),{...sample,target:2},'mse'));
});
test('默认 XOR 真实训练 2000 步可靠收敛，四样本概率达到正确分类', () => {
  let session=createSession(); const initial=session.loss;
  for(let i=0;i<2000;i++) session=advanceTraining(session,DEFAULT_TRAINING);
  assert.ok(session.loss<0.01); assert.ok(session.loss<initial/50); assert.equal(session.epoch,2000);
  const predictions=XOR_DATA.map(sample=>forwardNetwork(session.model,sample.input).prediction);
  assert.deepEqual(predictions.map(p=>p>=0.5?1:0),XOR_DATA.map(s=>s.target));
  assert.ok(predictions[0]<0.05 && predictions[1]>0.95 && predictions[2]>0.95 && predictions[3]<0.05);
});
test('决策边界使用当前模型真实采样，形状/激活不适用时明确返回 null', () => {
  const model=initializeNetwork(DEFAULT_ARCHITECTURE,42), grid=sampleDecisionBoundary(model,5);
  assert.equal(grid.points.length,25);
  for(const point of grid.points) close(point.probability,forwardNetwork(model,[point.x,point.y]).prediction);
  assert.equal(sampleDecisionBoundary(one('linear')),null);
  assert.equal(sampleDecisionBoundary({inputSize:1,layers:[{weights:[[1]],biases:[0],activation:'sigmoid'}]}),null);
  assert.throws(()=>sampleDecisionBoundary(model,100));
});
test('网络图的每条权重和梯度都来自同一份真实前向/反向数据', () => {
  const model=initializeNetwork(DEFAULT_ARCHITECTURE,42), backward=backwardSample(model,XOR_DATA[3],'bce');
  const markup=renderToStaticMarkup(createElement(NetworkGraph,{model,forward:backward.forward,backward,activeLayer:1,selected:{kind:'node',layer:0,row:0},onSelect:()=>{}}));
  assert.equal((markup.match(/data-weight=/g)||[]).length,12);
  assert.equal((markup.match(/data-node=/g)||[]).length,7);
  for(let l=0;l<model.layers.length;l++) for(let r=0;r<model.layers[l].weights.length;r++) for(let c=0;c<model.layers[l].weights[r].length;c++) {
    assert.ok(markup.includes('data-weight="'+model.layers[l].weights[r][c]+'"'));
    assert.ok(markup.includes('data-gradient="'+backward.layers[l].weights[r][c]+'"'));
  }
  assert.ok(markup.includes('data-activation="'+backward.forward.prediction+'"'));
});
test('MSE 的四种输出激活在光滑点均通过数值梯度检查', () => {
  for(const outputActivation of ['linear','relu','sigmoid','tanh']){
    const model=initializeNetwork({...DEFAULT_ARCHITECTURE,outputActivation},42);
    if(outputActivation==='relu') model.layers.at(-1).biases[0]=2;
    const result=checkGradients(model,XOR_DATA,'mse');
    assert.equal(result.status,'checked'); assert.equal(result.passed,true); assert.ok(result.maxAbsoluteError<1e-7);
  }
});
test('发散更新在提交前抛出错误，最后有效模型和训练记录均保持不变', () => {
  let session=createSession({...DEFAULT_ARCHITECTURE,hiddenSizes:[8,8],hiddenActivation:'linear',outputActivation:'linear'},42,'mse');
  const settings={...DEFAULT_TRAINING,loss:'mse',learningRate:2};
  for(let i=0;i<3;i++) session=advanceTraining(session,settings);
  const before=structuredClone(session);
  assert.throws(()=>advanceTraining(session,settings),/数值溢出/);
  assert.deepEqual(session,before);
  assert.ok(Number.isFinite(session.loss));
  for(const sample of XOR_DATA) assert.ok(Number.isFinite(backwardSample(session.model,sample,'mse').loss));
});

