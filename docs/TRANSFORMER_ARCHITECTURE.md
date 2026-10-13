# T09：教学 Transformer 架构与数学约定

## 原论文核对与教学范围

2026-10-13 检查 references/，没有 attention_is_all_you_need.pdf，仅有原论文链接；没有声称读取本地 PDF。通过 [arXiv 原文第 3 节](https://arxiv.org/html/1706.03762v7#S3) 核对 Encoder/Decoder 子层、Post-LN、FFN、Embedding 缩放与权重共享。

| 配置 | 论文 base | 本教学默认 |
| --- | --- | --- |
| Encoder / Decoder 层数 | 6 / 6 | 1 / 1，可各调 1–3 |
| d_model / Heads | 512 / 8 | 8 / 2；维度 4/8/16，头数 1/2/4 |
| d_k / d_v | 64 / 64 | 4 / 4，始终 d_model/Heads |
| FFN 中间宽度 | 2048 | 16，可选 8/16/32/64 |
| Dropout | 训练时 0.1 | 0，确定性教学前向 |
| 激活 | ReLU | 复用已有 activate 的 ReLU |
| LayerNorm epsilon | 本文不推断原论文实现默认值 | 明确默认 1e-5，可调整 |

模型未训练，概率没有翻译质量含义。只计算一次完整前向，不实现损失、反向传播、优化器、自动生成、Beam Search、KV Cache、批量或 Padding Mask。源/目标各 1–12 个 Token，词表 4–32 项。拒绝 PAD；UNK/BOS/EOS 保留固定 ID，不隐式插入或删除。

## 行为与文件

路由：`/laboratory/transformer`。入口来自实验列表、T08 页面及四节教材；from 只接受固定 attention-laboratory 或有效 lessonId，不能作为外部 URL。

`services/transformer/math.ts` 组合共用数学原语；`model.ts` 管理配置、初始化、参数、前向及不可变编辑；`flow.ts` 将同一次计算结果映射为有序 TensorStep。图形、检查器、热图和概率视图均消费这一份结果，不另造数值。

复用：

- T06/T07 的 tensorMath：规则二维矩阵、有限数和矩阵乘法。
- T04 的 activate：ReLU。
- T07：Tokenizer、词表/UNK、种子 Embedding、查表、sin/cos 位置编码。
- T08：多头 Self-Attention、初始化、矩阵转置/缩放、Concat、稳定 Softmax 与 Mask 工具。
- T03：MathFormula 和 LessonRenderer；原进度由 LearningProvider 保存。

T08 的 attention 接口仍要求等长 Self-Attention。T09 在独立 crossAttention/multiCross 适配层支持矩形分数，复用原语，不放宽或改写旧接口。

## 输入、权重共享与输出

Token 为行，特征为列。源长度 n、目标前缀长度 m、模型维度 d、词表 V：

`E: V×d`。Source 和 Target 查询同一 E，得到 n×d、m×d，分别乘 √d，再加各自从位置 0 开始的 PE。缩放在 T09 接入层实施，T07 的 embeddingScale=1 行为不变。

`X = √d E[sourceIds] + PE_source`  
`T = √d E[targetIds] + PE_target`

初始化复用 T07 E 生成器后乘 1/√d，得到合理尺度的参数；前向仍显式执行论文所述 √d 缩放，两个操作不能混为一次重复前向。源/目标序列不要求相等长度。

默认三方共享同一矩阵：源 Embedding、目标 Embedding、输出投影。输出投影每次由 `transpose(E)` 派生，不持有可过期的副本。Decoder 输出 H 为 m×d，Logits=H Eᵀ 为 m×V，无额外输出偏置。概率逐行在 V 上用 T08 稳定 Softmax，行和约为 1。

Top-K 是实际概率降序、同值按 ID 排序；最后前缀位置对应下一 Token 分布。包括特殊 Token 在内的整个词表参与归一化，界面不伪造合理译文。

## Position-wise FFN

`FFN(X) = ReLU(X W1 + b1) W2 + b2`

W1 为 d×d_ff，b1 长 d_ff；W2 为 d_ff×d，b2 长 d。偏置逐行广播。中间结果 n×d_ff，最终 n×d。每行应用同一组参数，该子层不直接混合 Token；不同层使用独立参数。

返回 input、linear1、activated、output、parameters。检查器展开两次仿射、ReLU、参数/偏置和形状。点击输出 [i,j] 展示 activated 第 i 行与 W2 第 j 列的逐项乘积、和及 b2[j]，并高亮对应行/列。

手工参考：X=[1,2]、W1=[[1,-1,2],[0,2,1]]、b1=[0,1,-1] → [1,4,3]；W2=[[1,0],[0,1],[1,1]]、b2=[1,-1] → [5,6]。

## 残差与 Post-LN

`R = X + Sublayer(X)`  
`Output = LayerNorm(R)`

要求残差两项同形；不拼接。每个 Token i 独立统计 d 个特征，使用总体方差：

`μ_i = Σ_j R_ij/d`  
`var_i = Σ_j (R_ij−μ_i)²/d`  
`normalized_ij = (R_ij−μ_i)/√(var_i+epsilon)`  
`output_ij = gamma_j normalized_ij + beta_j`

gamma/beta 是各 Add & Norm 独立的长度 d 参数，初始化 1/0，可编辑。零方差行依靠 epsilon 得到标准化 0，输出 beta。标准化后的方差为 var/(var+epsilon)，并非严格等于 1；gamma/beta 变换后也不应声称零均值/单位方差。

不跨 Token 或批次统计，不使用 BatchNorm，不采用 Pre-LN。返回残差、均值、方差、中心化、标准化、gamma/beta 与最终结果；非有限中间值或溢出抛错，不裁切成假结果。

## Encoder Stack

每层：

`U = LN1(X + MultiHead(X,X,X))`  
`H = LN2(U + FFN(U))`

复用 T08 multiHead，Encoder 不用 Causal Mask。每层 self/FFN/norm1/norm2 均独立分配。前一层真实输出传给下一层；最后一层输出是 n×d 的 Encoder Memory M。不存在随机 Memory 占位。

## Decoder Stack 与 Cross-Attention

每层：

`U = LN1(T + MaskedMultiHead(T,T,T))`  
`C = LN2(U + CrossMultiHead(U,M,M))`  
`H = LN3(C + FFN(C))`

Masked Self-Attention 使用 T08 multiHead 的真实 Causal 计算，j>i 权重严格为 0。Cross-Attention 的 Q=U WQ，K=M WK，V=M WV。Q 为 m×d_k，K 为 n×d_k，V 为 n×d_v；分数/权重为 m×n，输出 m×d_v。Cross 可见全部源位置，不使用 Causal Mask。各头独立投影后 Concat，再右乘 WO。

Decoder 层之间传递前一层输出，但每层 Cross 都读取同一最终 M。三个 Add & Norm 的参数相互独立。

### 无未来信息泄漏

同参数、同源序列下比较 A=[BOS,我,爱]、B=[BOS,我,AI]。前两个位置每层 Decoder 输出和最终概率应在浮点容差内一致；第 3 个位置允许变化。延长已知前缀也不能改变旧位置表示。

PE 只依赖自己的位置；FFN/LayerNorm 逐行；所有 Self-Attention Head 都用 Causal。因此未来目标不能沿上述路径泄漏。测试同时逐格严格断言 j>i 权重为 0。

Teacher Forcing 的引导教材展示输入 [BOS,我,爱,AI] 与标签 [我,爱,AI,EOS] 的右移对齐，但本任务不实现训练。界面只计算用户明确提供的前缀，不自动带入标签。

## 初始化、编辑与生命周期

uint32 种子默认 42；LCG 1664525/1013904223。FFN 使用 Xavier uniform ±√(6/(fanIn+fanOut))，零偏置；MHA 复用 T08 固定种子初始化，不调用 Math.random。每层/Head/Norm 分配独立数组；同结构/种子可重复。

parameterMatrices 返回稳定 path ID、标签、矩阵视图与向量标志。updateParameter 根据白名单描述符进行形状保持的不可变编辑；一维 b/gamma/beta 以单行表格编辑后恢复向量。模型变更前向完整校验形状/层数/头数/有限性。

改变结构、维度、词表或种子会按当前种子重建全部参数并提示；epsilon 只重算 Norm。任何数值草稿编辑停止播放、重置步骤，非法草稿保留上次有效值。无效文本隐藏全部不可用的下游结果。只保留当前模型/当前追踪，不无限记录历史；实验离开或刷新重置，T02 存储完全独立。

## Tensor Flow 与可视化扩展

TensorStep：

- id/title/lane/layer：稳定模块定位及 Encoder/Decoder 归属。
- inputs/output/shape：真实矩阵与实际形状，不先舍入。
- dependencies：真正的模块输入依赖；架构图直接据此画主通路、残差旁路及 Memory→Cross。
- formula/explanation：KaTeX 与中文解释。
- attention/norm/ffn：可选子层完整计算数据，用于展开检查。

默认 24 步；层数增加后按实际结构扩展。共用 useForwardPlayer(totalSteps) 支持播放、暂停、速度、重置和卸载清理，上游修改立即失效旧步骤。图形内部缩放/滚动，节点与热图支持 Enter/Space，页签支持方向键/Home/End；减少动态效果关闭视觉动效，保留可暂停的步骤。

新增子层先完成纯函数、参数校验/初始化与数学测试，再将同一计算缓存注册为 TensorStep，最后接入检查器/图形。不得只加装饰模块或重新计算一份不同的展示结果。未来训练应在独立任务定义梯度/损失约定，不把当前追踪当作已经实现自动微分。

## 验证与限制

测试入口：tests/unit/transformer.test.mjs、tests/transformer.spec.ts。核心覆盖小矩阵手工参考、T08 等长计算一致性、完整形状、逐层独立性、最大配置、Mask 隔离、共享权重、非法参数、追踪及 KaTeX。浏览器检查所有页签、编辑/播放/课程往返、概率与 320/390/768/1440px。

实际基线/最终结果见 [validation/t09/](validation/t09/README.md) 与开发日志。没有强制引入 Python/PyTorch 交叉验证或新依赖。移动验收为 Chromium 模拟，真实手机与 Safari/Firefox 尚未验证。随机前向不代表训练能力，也不能把教学输出当作论文真实模型输出。
