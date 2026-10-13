import type { PipelineResult } from '../../services/language/pipeline';
import { exportPipeline } from '../../services/language/pipeline';
import { MatrixView } from './MatrixView';
import type { Vocabulary } from '../../services/language/vocabulary';
import { MathFormula } from '../../components/lesson/MathFormula';
import { useState } from 'react';
import { saveAttentionInput } from '../../services/attention/input';
const STEPS = [
  { title: 'Tokenization', operation: '按所选规则切分原文，保留来源区间。', type: 'Token[]', explanation: 'Token 不是单词的同义词，切分规则决定序列长度。' },
  { title: 'Vocabulary Lookup', operation: '逐个 Token 查找词表地址；未知使用 UNK。', type: 'Mapping[]', explanation: '词表 ID 与句子中的位置是两个独立索引。' },
  { title: 'Token IDs', operation: '按原句顺序收集词表 ID。', type: 'number[] (integer)', explanation: '重复 Token 使用相同 ID，次序仍保留。' },
  { title: 'One-Hot', operation: '每个 ID 变为长度 V 的指示行向量。', type: 'number[][]', explanation: '每行只有一个 1；用于显式说明矩阵乘法查表。' },
  { title: 'Embedding Lookup', operation: '按每个 ID 读取 E 的一行。', type: 'number[][]', explanation: '直接查表等价于 One-Hot × E，实际系统通常直接查表。' },
  { title: 'Positional Encoding', operation: '按 0 起始位置和成对维度计算 sin/cos。', type: 'number[][]', explanation: '同一位置编码不依赖该位置上是哪一个 Token。' },
  { title: 'Embedding + PE', operation: '形状相同的两个矩阵逐元素相加。', type: 'number[][]', explanation: '每个元素同时接收词元表示和位置信息，不进行拼接。' },
  { title: 'Final Input Matrix', operation: '输出当前真实计算的矩阵和形状。', type: 'number[][]', explanation: '可以导出或传入 T08 Attention 实验；这里不重复添加 PE。' },
] as const;
function JsonView({ label, value }: { label: string; value: unknown }) { return <div className="lr-json"><strong>{label}</strong><pre tabIndex={0}>{JSON.stringify(value, null, 2)}</pre></div>; }
export function PipelineExplorer({ result, vocabulary, embedding, step, onStep }: { result: PipelineResult; vocabulary: Vocabulary; embedding: number[][]; step: number; onStep: (step: number) => void }) {
  const [transferError,setTransferError]=useState('');
  const dim = result.shapes.sentence[1], count = result.tokens.length, size = result.shapes.embedding[0];
  const inputs: unknown[] = [result.text, { tokens: result.tokens.map(token => token.text), vocabulary: vocabulary.tokens }, result.mappings, result.ids, { ids: result.ids, matrixShape: result.shapes.embedding }, { positions: result.ids.map((_, i) => i), d_model: dim }, { embeddingShape: result.shapes.sentence, peShape: result.shapes.sentence }, { shape: result.shapes.sentence, source: 'elementwise addition' }];
  const shapes = ['[' + count + '] 字符串序列', '[' + count + '] 映射', '[' + count + '] 整数向量', count + ' × ' + size, count + ' × ' + dim, count + ' × ' + dim, count + ' × ' + dim, count + ' × ' + dim];
  const inputTypes = ['string · 标量文本', 'string[' + count + '] 与词表 string[' + size + ']', 'Mapping[' + count + ']', 'integer[' + count + ']', 'integer[' + count + '] 与 E: number[' + size + '][' + dim + ']', '位置 integer[' + count + '] 与维度标量', '两个 number[' + count + '][' + dim + ']', 'number[' + count + '][' + dim + ']'];
  const matrices = [null, null, null, result.hot, result.vectors, result.pe, result.input, result.input];
  const current = STEPS[step], matrix = matrices[step];
  const formulas = ['\\operatorname{tokens}=\\operatorname{Tokenizer}(\\operatorname{text})', 'ID(t)=\\operatorname{Vocabulary}[t]', '\\operatorname{ids}=[ID(t_0),\\ldots,ID(t_{n-1})]', 'H_{p,j}=\\begin{cases}1&j=ID(t_p)\\\\0&\\text{otherwise}\\end{cases}', 'X_{\\mathrm{embedding}}=HE', 'PE_{p,2i}=\\sin(p/10000^{2i/d}),\\quad PE_{p,2i+1}=\\cos(p/10000^{2i/d})', 'X_{p,j}=E_{ID(t_p),j}+PE_{p,j}', 'X_{\\mathrm{input}}\\in\\mathbb{R}^{n\\times d}'];
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportPipeline(result), null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'transformer-input-v1.json'; link.click(); URL.revokeObjectURL(url);
  }
  return <section><h2>G · 从一句话走到输入矩阵</h2><p className="lr-lead">逐步查看真实中间结果。修改上游配置会重新计算，并回到第 1 步。</p>
    <nav className="lr-steps" aria-label="流水线步骤">{STEPS.map((item, i) => <button key={item.title} aria-current={step === i ? 'step' : undefined} onClick={() => onStep(i)}><span>{i + 1}</span>{item.title}</button>)}</nav>
    <div className="lr-step-card"><span className="eyebrow">STEP {step + 1} / 8</span><h3 data-testid="pipeline-step">{current.title}</h3><p><strong>运算：</strong>{current.operation}</p><p><strong>类型：</strong>{current.type} · <strong>输出形状：</strong>{shapes[step]}</p><p>{current.explanation}</p>
    <MathFormula latex={formulas[step]} display /><details open><summary>查看输入</summary><p><strong>输入类型与形状：</strong>{inputTypes[step]}</p><JsonView label="当前步骤输入" value={inputs[step]} />{step === 4 && <MatrixView title="查表输入 E" values={embedding} columns={dim} />}{step === 6 && <><MatrixView title="步骤 7 输入 Embedding" values={result.vectors} columns={dim} /><MatrixView title="步骤 7 输入 PE" values={result.pe} columns={dim} /></>}{step === 7 && <MatrixView title="最终步骤输入" values={result.input} columns={dim} />}</details>
    <details open><summary>查看输出</summary>{matrix ? <MatrixView title={step === 7 ? 'Final Input Matrix' : current.title + ' 输出'} values={matrix} columns={step === 3 ? size : dim} rowLabels={result.tokens.map((token, i) => i + ' · ' + token.text)} /> : <JsonView label="当前步骤输出" value={step === 0 ? result.tokens : step === 1 ? result.mappings : result.ids} />}</details></div>
    <div className="lr-actions"><button className="button secondary" disabled={step === 0} onClick={() => onStep(step - 1)}>上一步</button><button className="button primary" disabled={step === 7} onClick={() => onStep(step + 1)}>下一步</button><button className="button secondary" onClick={() => onStep(0)}>重置步骤</button>{step === 7 && <button className="button primary" onClick={download}>导出输入 JSON</button>}</div>
    {step === 7 && <><p className="lr-note">导出 schemaVersion=1、Token 顺序、ID、形状和未舍入数值；包含未训练/未缩放说明。T07 不导入或执行外部数据。空序列导出形状为 0 × {dim}，不能计算 Attention。</p>{count>0&&<a className="button primary" href="/laboratory/attention?from=language-representation" onClick={event=>{try {saveAttentionInput(window.localStorage,exportPipeline(result));setTransferError('');}catch(reason){event.preventDefault();setTransferError('无法保存传递输入：'+(reason instanceof Error?reason.message:'本地存储不可用。'));}}}>将当前矩阵传入 Attention 实验室</a>}{transferError&&<p className="lr-error" role="alert">{transferError}</p>}</>}
  </section>;
}
