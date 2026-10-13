import type { StructuredLessonContent, ContentBlock, HeadingBlock, TextBlock, FormulaBlock, CalloutBlock } from '../contentTypes';
import { ATTENTION_CHALLENGES } from '../../experiments/attention/challenges';
const heading=(id:string,title:string):HeadingBlock=>({id,type:'heading',level:2,title});
const text=(id:string,...paragraphs:string[]):TextBlock=>({id,type:'text',paragraphs:paragraphs.map(value=>[value])});
const formula=(id:string,latex:string,label:string,paperSection='3.2.1'):FormulaBlock=>({id,type:'formula',latex,label,display:true,paperSection});
const tryIt=(id:string,description:string):CalloutBlock=>({id,type:'callout',tone:'tip',title:'在 Attention 实验室核对',text:description,relatedExperimentId:'attention'});
const question=(index:number,id:string):ContentBlock=>({...ATTENTION_CHALLENGES[index],id});
export const attentionMathLesson: StructuredLessonContent={
  kind:'structured',version:1,lessonId:'attention-math',intro:'先把 Attention 看成一次按匹配程度混合信息的计算。我们依次连接点积、缩放、Softmax 和加权求和。',objectives:['计算一个匹配分数','按行归一化得到概率权重','理解缩放的假设与适用范围'],
  blocks:[
    heading('at-math-why','想找信息，先比较匹配程度'),
    text('at-math-analogy','假设你在读一句话，需要更新当前位置的理解，可以向其他位置取信息。类比为读书时带着问题寻找相关段落；实际机制没有人写好问题文本，而是向量之间的乘法和加法。','若 Query=[1,2]、Key=[3,4]，点积为 1×3+2×4=11。相同方向和较大长度往往得到更大的分数，所以点积不是仅比较方向的余弦相似度。'),
    formula('at-math-dot','S_{ij}=q_i\\cdot k_j=\\sum_{r=0}^{d_k-1}q_{ir}k_{jr}','第 i 个 Query 与第 j 个 Key 的点积'),
    heading('at-math-scale-heading','为什么除以 √dk？'),
    text('at-math-scale-text','如果 q、k 分量近似独立，均值为 0、方差为 1，点积的方差约为 dk。维度增大时典型分数尺度会变大；除以 √dk 可以控制这个尺度。该推理依赖假设，并不保证所有输入或任务的性能都会提高。','例如 dk=4，原始分数 [2,0,1] 变为 [1,0,0.5]。它们的次序没变，但差距缩小了，Softmax 通常不再那么尖锐。实验 C 可以编辑分数，对照两种分布。'),
    formula('at-math-scale','\\widetilde S=S/\\sqrt{d_k}','按 Query 与 Key 的共同维度缩放'),
    heading('at-math-softmax-heading','每个 Query 有自己的一行概率'),
    text('at-math-softmax-text','Softmax 将分数变成非负权重，一行的权重和为 1。它不是在整个矩阵上归一化：每个 Query 都单独决定向哪些 Key 取信息。','对 [0,ln(3)]，指数是 [1,3]，权重就是 [0.25,0.75]。直接 exp 大数容易溢出；减去该行最大分数不改变比例，例如减 ln(3) 后得到 [1/3,1]，归一化仍相同。'),
    formula('at-math-softmax','A_{ij}=\\frac{\\exp(\\widetilde S_{ij}-m_i)}{\\sum_{k\\ visible}\\exp(\\widetilde S_{ik}-m_i)},\\quad m_i=\\max_{k\\ visible}\\widetilde S_{ik}','可见位置逐行稳定 Softmax'),
    text('at-math-weighted','最后用权重混合 Value。若权重为 [0.25,0.75]，两行 Value 是 [2,0]、[6,4]，输出为 0.25×[2,0]+0.75×[6,4]=[5,3]。这里的输出是一个向量，不是“选择权重最大的一行”。'),
    formula('at-math-full','\\operatorname{Attention}(Q,K,V)=\\operatorname{softmax}(QK^T/\\sqrt{d_k})V','缩放点积 Attention', '3.2 / 3.2.1'),
    question(2,'at-math-quiz'),
    tryIt('at-math-try','先在 C 把分数差距增大，再打开 B 的第 7 步，逐行核对指数、分母和概率和。思考：给同一行每个分数都加 100，为什么权重不变？'),
  ],
};
export const selfAttentionLesson: StructuredLessonContent={
  kind:'structured',version:1,lessonId:'attention',intro:'同一段输入如何生成查询、匹配线索和真正要混合的信息？用三套投影参数把 X 转换为 Q、K、V。',objectives:['解释 Q/K/V 的不同计算角色','核对每一步形状','展开某个 Query 的 Value 加权贡献','区分注意力权重与完整模型解释'],
  blocks:[
    heading('at-self-roles','同一份输入，三个计算角色'),
    text('at-self-roles-text','将 Query 类比成“当前想找什么”，Key 类比成“这个位置有什么可以匹配的线索”，Value 类比成“这个位置能提供什么信息”。这个类比帮助区分用途，不能理解成人工给向量贴上固定语义标签。','WQ、WK、WV 是训练时学习的参数。实验先使用手工或固定种子随机权重，让你能核对运算；没有训练过程，因此热力图不代表模型已经理解 I love AI 的词义或语法。'),
    formula('at-self-projection','Q=XW_Q,\\quad K=XW_K,\\quad V=XW_V','三套独立投影', '3.2.2'),
    {id:'at-self-symbols',type:'formula',latex:'X\\in\\mathbb R^{n\\times d_{model}},\\quad W_Q,W_K\\in\\mathbb R^{d_{model}\\times d_k},\\quad W_V\\in\\mathbb R^{d_{model}\\times d_v}',label:'输入与投影参数形状',display:true,symbols:[{id:'at-self-n-symbol',latex:'n',label:'Token 数量',description:'按句子顺序排列的行数。不同于词表大小。'},{id:'at-self-dk-symbol',latex:'d_k',label:'匹配向量维度',description:'Query 与 Key 的列数必须相同；缩放分母使用这一维度。'}]},
    text('at-self-element','例如 X 的一行为 [1,2]，WQ=[[2,0],[1,1]]。Q[0,0]=1×2+2×1=4，Q[0,1]=1×0+2×1=2。点积取 X 的行与 WQ 的列，不把 WQ 当作另一个词元矩阵。'),
    heading('at-self-shapes','从 3 个 Token 到 3×3 的关系'),
    text('at-self-shapes-text','默认 n=3、d_model=dk=dv=4。Q/K/V 均为 3×4；K 转置为 4×3，于是 QKᵀ 为 3×3。行 i 是 Query，列 j 是 Key。逐行 Softmax 后仍为 3×3，右乘 3×4 的 V 得到 3×4 输出。','Self-Attention 中 Q、K、V 都由同一个序列 X 投影，所以每个位置可以聚合其他位置的信息。论文第 3.2.3 节还介绍跨序列注意力：Query 与 Key/Value 来自不同来源。本实验只计算同序列，不组装完整 Encoder–Decoder。'),
    formula('at-self-output','O_i=\\sum_{j=0}^{n-1}A_{ij}V_j','每个 Query 的 Value 加权贡献', '3.2 / 3.2.3'),
    text('at-self-limit','热力图颜色显示真实 A[i,j]，连线和逐项贡献使用同一份数据。一个很大的权重不等于完整的因果解释；Value 内容、输出投影及后续层也会影响最终模型行为。','Attention 本身不自带词序，T07 的 X 已包含位置编码，传入后不重复添加。关系矩阵有 n² 项，长序列会增加计算与存储成本。输入表示、投影、Mask 都会改变分布。'),
    question(0,'at-self-q-quiz'),question(4,'at-self-output-quiz'),
    tryIt('at-self-try','在 A 点击 Q[0,0] 检查高亮的 X 行与 WQ 列；修改一个权重后到 D 选择 love，观察权重和 Value 贡献是否同时改变。思考：为什么输出列数取决于 dv，而不是 Token 数？'),
  ],
};
export const multiHeadLesson: StructuredLessonContent={
  kind:'structured',version:1,lessonId:'multi-head',intro:'一个注意力分布只提供一次信息混合。多头用多套独立投影并行计算，再连接和重新组合。',objectives:['计算每个 Head 的维度','区分 Concat 与求和','理解 WO 的输出投影作用'],
  blocks:[
    heading('at-multi-heading','多个视角，来自不同参数'),
    text('at-multi-intuition','可把多头类比成多位读者用不同笔记方式看同一段文字。数学上，每个 Head 有独立 WQ_i、WK_i、WV_i，不是把同一个热力图复制几份。','训练可能让不同投影关注不同规律，但本实验没有训练。随机 Heatmap 不同只说明投影不同；不能预先把 Head 0 叫语法头、Head 1 叫语义头。'),
    formula('at-multi-head','head_i=\\operatorname{Attention}(XW_{Qi},XW_{Ki},XW_{Vi})','每头独立缩放点积注意力','3.2.2'),
    text('at-multi-dims','默认 d_model=4、h=2，因此每头 dk=dv=2。各 WQ/WK/WV 为 4×2，Q/K/V 为 n×2，每头权重矩阵为 n×n，输出为 n×2。这里要求 d_model 能被 h 整除，以保持简单而明确的形状。'),
    heading('at-multi-concat-heading','Concat 保留各头的列，再由 WO 混合'),
    text('at-multi-concat','若两个 Head 在同一位置分别输出 [1,2] 和 [3,4]，Concat 得到 [1,2,3,4]，不是 [4,6]。对于 n=3，两个 3×2 输出连接为 3×4。WO 为 4×4，右乘后仍为 3×4。','WO 是另一组训练时学习的参数，用于混合连接后的各列。修改一个 Head 不应改变另一个 Head 的 Q/K/V，但会影响 Concat 和最终输出；实验可用固定种子重复核对。'),
    formula('at-multi-result','\\operatorname{MultiHead}(X)=\\underbrace{\\operatorname{Concat}(head_1,\\ldots,head_h)}_{n\\times hd_v}\\underbrace{W_O}_{hd_v\\times d_{model}}','连接并输出投影','3.2.2'),
    question(5,'at-multi-quiz'),
    tryIt('at-multi-try','在 E 切换 Head，分别查看投影、热力图和输出；只修改 Head 0 的 WQ，再检查 Head 1 和 Concat。思考：为什么只将各头输出相加，会丢掉一些连接方式的信息？'),
  ],
};
export const causalMaskLesson: StructuredLessonContent={
  kind:'structured',version:1,lessonId:'decoder-mask',intro:'本节只理解因果 Mask：生成当前位置时，信息不能来自尚未出现的未来。完整 Decoder 留待 T09。',objectives:['判断 j≤i 的可见位置','解释 Softmax 前 Mask 的作用','区分非因果与因果 Self-Attention'],
  blocks:[
    heading('at-mask-heading','为什么要遮住未来？'),
    text('at-mask-intuition','类比为逐字猜下一词：只能使用当前已经拿到的上下文，不能偷看未来答案。真实自回归模型训练还会移位目标序列，使当前输入不含待预测标签；仅有一张掩码图并不等于完整生成系统。','Encoder Self-Attention 通常能看整段输入；Decoder 的 Masked Self-Attention 限制 Key 索引 j≤Query 索引 i。论文第 3.2.3 节描述这些不同用途，跨序列注意力与完整 Decoder 连接将在后续任务实现。'),
    formula('at-mask-formula','S^{masked}_{ij}=\\begin{cases}\\widetilde S_{ij}&j\\le i\\\\-\\infty&j>i\\end{cases}','未来位置在 Softmax 前排除','3.2.3'),
    text('at-mask-example','三项序列的可见矩阵为 [[1,0,0],[1,1,0],[1,1,1]]。第 0 个 Query 只能看自己，概率必为 [1,0,0]；第 1 个 Query 对前两项归一化，第三项严格为 0。','不能先对完整行 Softmax，再简单把未来概率涂灰，那会使可见概率和小于 1。实验先排除不可见项，再在可见项上减最大值、取指数和归一化。全 Mask 行没有合法概率分布，会明确报错，不能硬填均匀概率。'),
    question(3,'at-mask-quiz'),
    tryIt('at-mask-try','在 F 开启 Mask，检查上三角的未来权重是否全部为 0。到 B 第 6/7 步查看原始分数、Masked Scores 和逐行分母。思考：最后一个 Query 的可见范围与无 Mask 相比有什么不同？'),
    {id:'at-mask-scope',type:'callout',tone:'info',title:'本节的范围',text:'这里仅实现 Self-Attention 的因果掩码，不包含完整 Decoder、交叉注意力、FFN、残差、归一化或模型训练。'},
  ],
};
