# T08 Attention 数学与数据约定

本阶段只实现小型、二维、无批量的 Self-Attention 前向计算。参数可编辑，但没有训练、Dropout、完整 Encoder–Decoder 或远程推理。公式参考 [原论文 3.2～3.2.3](https://arxiv.org/html/1706.03762v7#S3.SS2)，以下数值示例是教学验证，不是论文模型的实验结果。

## 张量方向和形状

延续 T07 的“每个 Token 一行”。不同于 T06 单样本列向量，两种约定由各自领域接口隔离，共同乘法实现仍是 services/tensorMath.matrixProduct。

| 名称 | 形状 |
| --- | --- |
| X | n×d_model |
| WQ、WK | d_model×dk |
| WV | d_model×dv |
| Q=XWQ、K=XWK | n×dk |
| V=XWV | n×dv |
| Kᵀ | dk×n |
| Scores、ScaledScores、Mask、Weights | n×n |
| Output=Weights V | n×dv |

默认 n=3、d_model=dk=dv=4。计算支持 1～32 个 Token，表示/投影列数 1～16；来自 T07 的 d_model 必须为 2～16 偶数。矩阵均规则、非空、有限数。NaN、Infinity、非法维度和乘法溢出报错；不静默补齐或裁剪。

## 缩放点积 Attention

Q=XWQ，K=XWK，V=XWV；Scores=QKᵀ；ScaledScores=Scores/√dk；Weights=逐行 Softmax(可见分数)；Output=Weights V。

Q[i,j] 取 X 第 i 行与 WQ 第 j 列点积。productElement 返回左行、右列、逐项乘积及总和，UI 高亮来自这些真实索引。Query/Key/Value 的自然语言解释是教学类比，参数不是人工固定语义标签。

默认 X 为 [[1,0,1,0],[0,1,0,1],[1,1,0,0]]，WQ/WK/WV 为教学单位矩阵（可编辑）。Scores=[[2,0,1],[0,2,1],[1,1,2]]，缩放因子 1/2。第 0 行权重约为 [0.506480391,0.186323723,0.307195886]，输出约为 [0.813676277,0.493519609,0.506480391,0.186323723]。这些数值由实际计算获得。

在 Q、K 分量近似独立、均值 0、方差 1 的假设下，点积方差约随 dk 增长；√dk 缩放控制典型尺度。分数差距通常会影响 Softmax 尖锐程度，但不承诺缩放必然提高所有任务的性能。

## 稳定 Softmax 与 Mask

每个 Query 单独计算。取该行可见项最大值 m，计算 exp(s_j−m)，再除以可见指数和。减同一个 m 不改变概率；至少一个指数为 1，避免全体下溢。有限极端差值可能下溢成负无穷，其指数按极限为 0；输入分数本身必须有限。

Mask 使用 boolean[][]，true 表示可见。Causal 规则 j≤i；自定义 Mask 与 Causal 取交集。所有不可见项的指数和权重显式为 0。若一行没有可见项，抛出“Softmax 未定义”，不返回 NaN、均匀分布或全零伪概率。

Masked Scores 用 (number|null)[][] 表示，null 在 UI 显示数学上的 −∞；不将 Infinity 写入普通矩阵或 JSON。此方式等价于论文在 Softmax 前把未来位置设为负无穷。不能先全行 Softmax 再仅涂灰。每行可见权重和约为 1，未来权重严格为 0。

Decoder Masked Self-Attention 只能取当前位置及过去；实际自回归训练还需要移位目标。Encoder 的非因果 Self-Attention 通常可看整段输入。本任务仅解释用途，不组装 Decoder、Cross-Attention 或生成系统。

## Contribution 和图形

对 Query i，terms[j][c]=Weights[i,j]×V[j,c]；对 j 求和等于 Output[i,c]。热力图横轴 Key、纵轴 Query；颜色、悬停完整数值、选中来源、Token 连线宽度和贡献表全部从同一 AttentionResult 派生。不是为图形另外计算一套近似权重。

注意力表示本层信息混合；随机或教学参数没有学会语义，权重也不能直接等同于完整模型解释。

## Multi-Head

默认 h=2，dk=dv=d_model/h，要求整除，h 为 1～8。每头独立 WQ_i、WK_i、WV_i，调用同一 selfAttention。按每行的列次序拼接 Head 输出，Concat 为 n×(h dv)，再右乘 WO，形状 (h dv)×d_model，最终为 n×d_model。

每头使用自己的 √dk。单头缩放对照开关不改变多头标准公式；全局 Causal 开关作用于全部 Head。多头与单头参数分离，修改一个 Head 不改变其他 Head 的投影。改变 h 或 d_model 时重建不兼容的多头参数。

初始化使用 uint32 种子、LCG（1664525、1013904223），单头顺序生成三套矩阵，值域约 ±1/√d_model。各 Head 由种子加不同流偏移生成独立数组，WO 使用另一流。无 Math.random；相同结构/种子可复现。未声称复现论文训练权重，也不人为命名语法头/语义头。

## T07→T08 协议 v1

复用 T07 exportPipeline 原结构，无额外重新分词、PE 或缩放：

```json
{
  "schemaVersion": 1,
  "kind": "transformer-input",
  "tokenizer": "whitespace",
  "tokens": ["I", "love", "learning"],
  "ids": [4, 5, 6],
  "shape": [3, 8],
  "values": [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]],
  "embeddingScale": 1,
  "positionStart": 0,
  "note": "格式示例；values 仅用于说明结构，不是默认流水线输出"
}
```

d_model=shape[1]，n=shape[0]。校验版本、类型、Tokenizer、缩放/位置约定、Token/ID 数量、矩阵实际形状和有限值。Token 非空且每项≤256 码点；ID 为 0～63 整数；X 元素绝对值≤10000；JSON≤65536 字符。空 T07 序列可导出，但不能进入 Attention。

T07 最后一步的传递链接先校验并写入独立 localStorage 键 transformer-learning-lab.attention-input，再打开 /laboratory/attention?from=language-representation。存储拒绝时阻止导航并给提示，可以导出备份，解除存储限制后再导入。T08 也可粘贴 JSON 校验导入；保存失败时保留当前有效输入，不暗中使用刷新后无法恢复的数据。没有执行外部文本或 HTML。

仅最近一份导入的 X 保存，大小有上限；刷新恢复 Token/ID/X，同时明确提示 WQ/WK/WV、多头权重、步骤恢复默认。缺失、损坏、不支持版本或读权限失败时提示并回退默认；不在读取时覆盖坏/未来版本原文。用户显式导入或恢复默认才写入/移除该键。没有触碰 T02 progress 键。

页面内手动编辑 X、维度、参数不自动覆盖导入缓存；刷新恢复保存的 X 或默认，界面明确说明。from 仅接受有效课时 ID 或固定 language-representation 标识，非法来源返回 attention 课时，不能外部跳转。

## 数学测试与扩展

tests/unit/attention.test.mjs 使用独立手工矩阵/指数参考，验证投影、转置、缩放、逐行 Softmax、平移不变性、贡献求和、Mask、多头、Concat、WO、种子、边界和真实 T07 数据。没有为了验证而引入 Python/PyTorch 或后端。完整实际结果见 DEVELOPMENT_LOG。

新增投影/Mask 模式：先扩展 services/attention 的纯接口、形状及失败状态，加入手工参考/边界/单头多头一致性测试，再接入工作台。新增挑战：在 experiments/attention/challenges.ts 添加稳定合法 ID，答案由共用纯数学函数构造，判定沿用 QuizRenderer/judgeAnswer 的数值容差。新增教材：在 lessons/contents 建立独立结构化正文，使用原 contentKey 注册，保持 lessonId 和块 ID 稳定唯一；无需第二套渲染器。

T09 可复用这些无批量前向接口；完整架构、残差、归一化、FFN、训练梯度均未在 T08 实现。
