import type { StructuredLessonContent, ContentBlock } from '../contentTypes.ts';
import { causalMaskLesson } from './attention.ts';
const heading=(id:string,title:string):ContentBlock=>({id,type:'heading',level:2,title});
const text=(id:string,...paragraphs:string[]):ContentBlock=>({id,type:'text',paragraphs:paragraphs.map(line=>[line])});
const formula=(id:string,latex:string,label:string,paperSection:string):ContentBlock=>({id,type:'formula',latex,label,paperSection});
const experiment=(id:string,description:string):ContentBlock=>({id,type:'callout',tone:'tip',title:'进入完整 Transformer 前向实验',text:description,relatedExperimentId:'transformer'});
export const ffnNormLesson:StructuredLessonContent={
  kind:'structured',version:1,lessonId:'ffn-residual-norm',intro:'Attention 让位置交换信息，FFN 对每个位置加工特征；残差保留直接通路，LayerNorm 调整每一行的数值尺度。',objectives:['计算共享参数的 Position-wise FFN','理解残差相加与 Post-LN 顺序','区分 LayerNorm 与 BatchNorm'],
  blocks:[
    heading('tr-ffn-heading','同一套加工规则，作用于每个位置'),
    text('tr-ffn-intuition','类比为每位读者拿到上下文笔记后，独立用同一套规则整理。真正的 FFN 是逐行仿射、ReLU、再仿射；这一子层内部不把不同 Token 的行拼成一个向量。','例如 X 有 3 行、每行 8 个特征。W1 为 8×16，使隐藏表示为 3×16；W2 为 16×8，使输出回到 3×8。各位置共享参数，各层参数独立。'),
    formula('tr-ffn-formula','\\mathrm{FFN}(X)=\\max(0,XW_1+b_1)W_2+b_2','逐位置前馈网络','3.3'),
    text('tr-ffn-number','小例子：x=[1,2]，W1=[[1,-1,2],[0,2,1]]，b1=[0,1,-1]，得到 [1,4,3]。ReLU 保持这三个正数。W2=[[1,0],[0,1],[1,1]]，b2=[1,-1]，最终输出 [5,6]。换成 x=[-1,0]，隐藏仿射为 [-1,2,-3]，ReLU 得 [0,2,0]，输出 [1,1]。'),
    heading('tr-residual-heading','先相加，再按行归一化'),
    formula('tr-residual-formula','H=\\mathrm{LayerNorm}(X+\\mathrm{Sublayer}(X))','原论文 Post-LN','3.1'),
    text('tr-residual-explain','残差要求输入和子层输出形状相同。若 X=[1,2]、子层输出=[2,3]，相加得到 [3,5]，而不是连接成四维。它提供直接的信息通路，但不保证每个模型都能自动训练成功。'),
    formula('tr-norm-formula','\\mu_i=\\frac1d\\sum_j r_{ij},\\quad\\sigma_i^2=\\frac1d\\sum_j(r_{ij}-\\mu_i)^2,\\quad o_{ij}=\\gamma_j\\frac{r_{ij}-\\mu_i}{\\sqrt{\\sigma_i^2+\\epsilon}}+\\beta_j','逐 Token 特征归一化','3.1'),
    text('tr-norm-number','对 [3,5]，均值为 4，总体方差为 1；epsilon=1e-5 时标准化约为 [-0.999995,0.999995]。对 [10,10]，方差为 0，标准化为 [0,0]；再通过独立 gamma/beta 变换。','LayerNorm 在一个 Token 的特征上统计，不跨 Token 或批次合并。BatchNorm 使用不同的统计轴，本实验没有 BatchNorm。gamma 默认 1，beta 默认 0，但都是可编辑的独立模型参数。'),
    experiment('tr-ffn-experiment','在 C 查看 FFN 中间值、残差、均值、方差和标准化结果；点击输出元素查看点积。去 D 修改 W1 或 gamma，观察下游更新。思考：只修改第二个输入 Token，会直接改变第一个 Token 的 FFN 输出吗？'),
  ],
};
export const encoderLesson:StructuredLessonContent={
  kind:'structured',version:1,lessonId:'encoder',intro:'Encoder 将每个源 Token 的输入表示变成含上下文的信息，输出最终 Memory，供 Decoder 查询。',objectives:['追踪 Encoder 的两个子层','理解层与层之间的传递','定位最终 Encoder Memory'],
  blocks:[
    heading('tr-encoder-heading','从局部词向量到上下文表示'),
    text('tr-encoder-intuition','同一个词在不同句子中可能承担不同角色。Self-Attention 允许当前位置从整段源输入混合信息；FFN 再逐位置加工这些特征。这里的随机参数没有学到语言规律，数值变化只是计算过程。'),
    formula('tr-encoder-formula','U=\\mathrm{LN}(X+\\mathrm{MHA}(X,X,X)),\\qquad H=\\mathrm{LN}(U+\\mathrm{FFN}(U))','Encoder 两个 Post-LN 子层','3.1'),
    text('tr-encoder-dims','默认输入为 3×8。两头的 Q/K/V 分别为 3×4，权重为 3×3；Concat 为 3×8，WO 为 8×8。两个 Add & Norm 都输出 3×8，所以可作为下一层输入。','Encoder 默认没有 Causal Mask，源序列全部已知。三层堆叠时，第 2 层必须使用第 1 层输出，第 3 层再接第 2 层输出，每层参数独立，不能复制同一层的结果冒充深度。'),
    heading('tr-memory-heading','最终 Memory 从哪里来'),
    text('tr-memory-text','Memory 是最后一个 Encoder Block 的真实输出，形状仍为 Source Length×d_model。每个 Decoder 层的 Cross-Attention 都从这份 Memory 产生 K、V，而不是从某个随机占位矩阵产生。'),
    experiment('tr-encoder-experiment','设置 Encoder 层数为 2，在 A 比较 Encoder 1/2 的输入输出，点击架构图上的 Memory，再到 B 查看不同层与不同 Head。思考：Encoder 为什么通常可以读取源句子的全部位置？'),
  ],
};
export const decoderArchitectureLesson:StructuredLessonContent={
  ...causalMaskLesson,
  intro:'保留因果 Mask 的基础实验，再把三个子层连成真正的 Decoder：Masked Self-Attention、Cross-Attention、FFN。',objectives:[...causalMaskLesson.objectives,'追踪 Cross-Attention 的 Q/K/V 来源','理解三个 Post-LN 与目标右移'],
  blocks:[
    ...causalMaskLesson.blocks.map(block=>block.id==='at-mask-intuition'?text(block.id,'逐个预测下一词时，只能使用已知上下文。真实自回归训练还会右移目标，使当前位置输入不含待预测标签。','Encoder 通常看全部源输入；Decoder Masked Self-Attention 仅允许 j≤i。前半节的 T08 入口用于单独检查 Mask，后半节进入完整 T09 Decoder。'):block.id==='at-mask-scope'?{...block,text:'T08 Attention 实验保留独立 Mask 计算；下方继续用 T09 将 Cross-Attention、FFN、残差和归一化接成完整 Decoder。本节不训练模型。'}:block),
    heading('tr-decoder-heading','Decoder 的三个子层'),
    formula('tr-decoder-self','U=\\mathrm{LN}(T+\\mathrm{MaskedMHA}(T,T,T))','先读取已知目标前缀','3.1'),
    formula('tr-decoder-cross','C=\\mathrm{LN}(U+\\mathrm{MHA}(U,M,M))','然后查询 Encoder Memory','3.2.3'),
    formula('tr-decoder-ffn','H=\\mathrm{LN}(C+\\mathrm{FFN}(C))','最后逐位置前馈','3.1'),
    text('tr-decoder-source','Cross-Attention 的 Query 来自本层 Masked Add & Norm 输出，Key、Value 来自最终 Encoder Memory。默认目标长度 2、源长度 3，因此每头权重为 2×3，而不是 2×2。Cross 不用 Causal Mask，因为整段源输入都已知。','Decoder 每层都有三组独立 gamma/beta。多层 Decoder 逐层传递目标表示，但每层 Cross 仍查询同一份最终 Encoder Memory。'),
    heading('tr-teacher-heading','Teacher Forcing 与目标右移'),
    text('tr-teacher-text','若完整目标是 [我,爱,AI,EOS]，训练时可把 [BOS,我,爱,AI] 作为 Decoder 输入，与 [我,爱,AI,EOS] 标签对齐。位置 0 根据 BOS 预测“我”，位置 1 根据 BOS、我预测“爱”。这叫用真实前缀进行 Teacher Forcing。','本实验只接受已知前缀，不训练、不计算标签损失，也不自动拼接未来答案。输入 [BOS,我] 时，查看最后一个位置就是“下一 Token”分布。'),
    text('tr-isolation-text','检验信息泄漏：在相同参数下比较 [BOS,我,爱] 与 [BOS,我,AI]。前两个位置的每层隐藏表示应相同，因为未来位置无法通过 Mask、逐位置 FFN 或 LayerNorm 向前传播。仅把热图格子涂灰不满足这个要求。'),
    experiment('tr-decoder-experiment','从这里打开 T09，选择 B 中 Decoder Masked 与 Cross，核对 2×2 和 2×3 的差异；查看 C 中三次 Add & Norm。思考：为什么 Cross 能看全部源序列，却不能看到未来目标？'),
  ],
};
export const transformerLesson:StructuredLessonContent={
  kind:'structured',version:1,lessonId:'transformer',intro:'把词元、位置编码、Encoder、Decoder 和输出概率连成一次完整、可检查的前向传播。',objectives:['解释完整 Encoder–Decoder 数据流','理解 Embedding 缩放与权重共享','区分随机前向结果与经过训练的生成能力'],
  blocks:[
    heading('tr-full-heading','为什么分为 Encoder 与 Decoder'),
    text('tr-full-intuition','以翻译为例，源句子已经全部给出，Encoder 可以让源位置相互交换信息；目标句子尚在逐词形成，Decoder 只能使用已有目标前缀，同时查询源 Memory。并非所有现代 Transformer 都用这套结构，本节研究的是 2017 年原始 Encoder–Decoder。'),
    formula('tr-input-formula','X=\\sqrt{d_{model}}E[\\mathrm{SourceID}]+PE,\\quad T=\\sqrt{d_{model}}E[\\mathrm{TargetID}]+PE','源和目标输入表示','3.4 / 3.5'),
    text('tr-shared-text','同一个教学词表上，源、目标共用 E，输出投影使用 Eᵀ。默认 E 为 16×8，查表得到 3×8 和 2×8，乘 √8 后分别加上同形 PE。T07 原演示未缩放，T09 在模型接入层明确添加缩放。'),
    heading('tr-output-heading','从隐藏表示到词表概率'),
    formula('tr-output-formula','M=\\mathrm{EncoderStack}(X),\\quad H=\\mathrm{DecoderStack}(T,M),\\quad Z=HE^{\\mathsf T},\\quad P_i=\\mathrm{softmax}(Z_i)','完整前向传播','3.1 / 3.4'),
    text('tr-output-number','默认 Memory 为 3×8，Decoder 最终表示为 2×8；右乘 8×16 的 Eᵀ 得到 2×16 Logits。每行在 16 个目标词表项上单独归一化，行和约为 1。小例子：Logits=[0,ln3]，概率为 [0.25,0.75]，不是对整个矩阵一次归一化。'),
    heading('tr-random-heading','一次前向还不是语言能力'),
    text('tr-random-text','固定种子使结果可重复，不能让随机权重自动学会翻译。Top-K 只是把这次真实概率排序，可能把特殊 Token 排在前面，不应把它解释成正确答案。训练需要数据、损失、反向传播和优化器，留给独立 T10。','本教学模型 1+1 层、8 维、2 头、FFN 16；原论文 base 使用 6+6 层、512 维、8 头、FFN 2048。这里 Dropout=0，仅用于确定性前向，不能把教学数值当作原论文模型实验结果。'),
    experiment('tr-full-experiment','在 A 沿架构图追踪完整前向，在 B 检查三种 Attention，在 C 展开 FFN/Norm，在 D 修改共享 E，最后在 E 查看最后位置的 Top-K。思考：改变源 Token 时，目标概率为什么可能改变？'),
  ],
};
