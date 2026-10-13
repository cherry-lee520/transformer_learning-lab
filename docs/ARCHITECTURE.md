# 工程架构

## 基础结构

保留 T01 的 Vite + React 单页应用及 `BrowserRouter`。`App.tsx` 只声明路由和 Provider；布局、公共组件、页面、元数据、正文、进度逻辑与存储分别维护。没有后端请求。

| 层 | 关键文件 | 责任 |
| --- | --- | --- |
| 领域类型 | `src/lessons/types.ts` | Course、Chapter、Lesson、LearningProgress、ProgressSnapshot |
| 元数据 | `src/lessons/catalog.ts` | 稳定 ID、显示层级、排序、预计时长、先修与关联 |
| 正文资源 | `src/lessons/content.ts`、`contents/*.ts` | contentKey 对应的结构化正文或兼容占位内容 |
| 校验 | `src/lessons/validation.ts` | 唯一 ID、父级关联、排序、依赖有效性与环检测 |
| 查询入口 | `src/lessons/index.ts` | 校验、按 order 排序、展平目录和索引、课时 URL |
| 进度领域函数 | `src/services/learningProgress.ts` | 无浏览器依赖的状态转换和完成率计算 |
| 本地存储 | `src/services/progressStorage.ts` | 版本解码、记录修复、读写失败处理 |
| 状态接入 | `src/store/LearningProvider.tsx` | 初始化、保存、页面共享与跨标签存储事件同步 |
| 界面 | `components/CourseTree.tsx`、`pages/*` | 从元数据和进度派生展示，定位当前课时 |

## 内容模型

Course 嵌套 Chapter，Chapter 嵌套 Lesson；同时保留 `courseId` 与 `chapterId` 校验归属。所有实体 ID 全局唯一，采用小写字母、数字和连字符。ID 不由索引或中文标题生成，也不因重排而变化。

每一级 `order` 是正安全整数，同级唯一。查询层复制并排序，不改变原始元数据。跨课程的上一节/下一节遵循课程、章节、课时三层排序。

Lesson 的 `contentKey` 仅引用正文资源，不承载正文。未来可用懒加载组件替换 contentKey 对应内容，无需重写 Course/Chapter 或进度结构。论文和实验关联提供导航入口；当前已开放 T04 单神经元前向传播、T05 激活与梯度、T06 MLP 训练、T07 语言表示、T08 Attention 与 T09 Transformer 前向实验，其他实验继续预留。

`prerequisites` 是学习顺序建议，不强制锁定课时。校验器使用 DFS 检查循环，包括自我依赖。校验入口面对已通过 TypeScript 结构检查的目录；未来若从外部 JSON 加载，应先增加结构解析。单元测试同时验证每个实际课时均有正文占位。

## 学习记录

状态流转：

- 无记录：`not_started`。
- 打开合法详情页：`in_progress`，更新 `lastVisitedAt` 和最近课时。
- 手动标记：`completed`，设置 `completedAt`。
- 再次访问已完成课时：保留完成状态与完成时间。
- 撤销完成：`in_progress`，清空 `completedAt`。
- 无效 ID：不创建或修改学习记录。

所有完成率等于范围内已完成课时数 / 范围内实际课时数，四舍五入为整数百分比；不平均子章节百分比。空范围为 0%。学习中和已访问均不计入完成。

“继续学习”使用最近访问的有效课时，没有记录时使用路线第一课。课程目录本身不自动开始任何课时。

## 存储与版本

localStorage 键：`transformer-learning-lab.progress`。

```json
{
  "schemaVersion": 1,
  "courseVersion": "2026.10.t02",
  "records": [
    {
      "lessonId": "start",
      "status": "in_progress",
      "lastVisitedAt": "2026-10-11T01:00:00.000Z",
      "completedAt": null,
      "courseVersion": "2026.10.t02"
    }
  ],
  "recentLessonId": "start"
}
```

时间用 UTC ISO 字符串存储，界面按浏览器本地时区显示。结构版本与课程版本独立。更改目录时保留有效稳定 ID 的记录，丢弃已删除 ID，重算分母；每条记录保留其课程版本，用户后续操作更新该字段。

`decodeProgress` 是未来结构迁移的统一入口。目前只支持 v1；未知版本进入只读存储模式，本次页面仍可操作但不覆盖原始记录。没有虚构 v0 迁移：T01 只存在内存演示状态。

损坏 JSON 或 records 结构恢复为空白进度并提示；部分坏记录、非法状态/日期与过期 ID 被跳过；重复课时保留最近时间的记录。最近课时从有效访问时间重建。读取权限失败时保留会话内状态；写入失败时显示提示，不导致白屏。

多个标签页通过 storage 事件同步顺序发生的修改，但没有并发事务合并；极短时间同时修改时采用最后写入结果。记录不跨设备或来源同步。没有导出/导入功能，这些属于未来任务。

## 路由与兼容

T01 路由 `/`、`/lessons`、`/laboratory`、`/paper`、`/progress` 保留。新增 `/lessons/:lessonId`。旧查询链接用 replace 跳转到新详情 URL。非法课时显示独立友好错误页；其他未知路径仍由全局 404 处理。Vite 支持刷新回退，未来静态部署必须配置 SPA fallback。

## 测试

Node 内置测试器运行领域函数和渲染单元测试。T03 使用 tsx 加载 TypeScript 与 TSX，通过 React 服务端渲染测试真实 LessonRenderer，而非测试一份模拟实现。纯领域模块保留显式 `.ts` 导入。Playwright 测试仍位于根目录 `tests/`，在 frontend 使用已安装的 Playwright。浏览器并发数限定为 3，避免本地电脑同时启动大量 Chromium。

浏览器测试使用独立上下文，不影响用户已有 localStorage。保留 T01 的导航、实验、论文、404、布局与截图验收，并将演示进度断言更新为 T02 持久化状态。真实课程树和课时详情都复用 T01 的蓝紫浅色视觉系统。

## T03 结构化教材引擎

数据流：`catalog.ts 的 contentKey → content.ts 资源注册 → contents/*.ts → prepareContent → blockRegistry → 各内容块组件`。Lesson 页面保留 T02 的路由、访问记录、关联、完成/撤销与上一节/下一节，仅替换正文区域并由有效标题块生成本节导航。课程页面通过 React.lazy 按路由加载，公式引擎、高亮器及其样式不会全部进入首页入口包；Suspense 提供加载反馈。

`contentTypes.ts` 使用带 type 字段的 TypeScript discriminated union：

| type | 数据 | 组件 |
| --- | --- | --- |
| heading | title、level（2/3） | 标题与锚点 |
| text | paragraphs、可选 bullets；每段含字符串或显式 inline math | 转义文本与行内公式 |
| formula | latex、label、可选 display 与 symbols | MathFormula / AnnotatedFormula |
| code | title、Python/C examples、可选 lineNumbers | CodeViewer |
| callout | tone、title、text | 提示卡片 |
| image | src、alt、可选 caption | 响应式图片与加载失败说明 |
| quiz | 单选、多选或数值 question | QuizRenderer |
| interactive | demo、title、defaults | NeuronDemo / ParameterPanel |

结构化正文的 kind 为 structured、version 为 1，并声明稳定的 lessonId、intro、objectives 与有序 blocks。块 ID 采用小写字母、数字和连字符，跨正文唯一；不由数组索引生成。旧 intro/objectives 占位内容由 prepareContent 转为标准块，其他 15 个课时不必一次升级。

所有块均可选附带 paperSection、paperPage、paperEquation、relatedExperimentId；可建立后续论文/教材/实验关联。内容块实验链接兼容原查询入口；已开放的 neuron 查询会转到实验页。课时级实验入口通过 experimentPath 保留来源课时。没有实现论文阅读器。

### 新增一种内容块

1. 在 contentTypes.ts 声明新接口，将其加入 ContentBlock union。
2. 在 contentValidation.ts 的 blockChecks 添加运行时字段校验。类型注册使用穷尽映射，缺少键时类型检查会失败。
3. 在 components/lesson/ 创建展示组件，向 LessonRenderer.tsx 的 blockRegistry 注册相同 type。保留文本转义、键盘访问和局部滚动。
4. 添加结构校验、真实组件渲染与必要的浏览器测试，再创建使用该块的正文。

prepareContent 对 unknown 输入逐块校验。未知类型、损坏字段或重复 ID 仅替换为可读提示，有效块仍按原顺序渲染。整份正文的版本或 lessonId 不兼容时显示降级提示。BlockBoundary 进一步隔离单个组件的运行异常。validateContentLinks 可复用检查全部课时的正文存在性、lessonId 对应关系和跨正文块 ID，单元测试检查实际目录。

### 创建新课时正文

在 lessons/contents/ 创建独立 .ts 文件，导出 satisfies StructuredLessonContent 或显式类型对象；不要把教材写入页面组件。例如：

```ts
import type { StructuredLessonContent } from '../contentTypes';
export const example: StructuredLessonContent = {
  kind: 'structured', version: 1, lessonId: 'existing-lesson-id',
  intro: '简短介绍', objectives: ['一个学习目标'],
  blocks: [
    { id: 'example-start', type: 'heading', level: 2, title: '开始理解' },
    { id: 'example-text', type: 'text', paragraphs: [['介绍 ', { type: 'math', latex: 'x' }, ' 的含义。']] },
  ],
};
```

在 content.ts 用元数据已有的 contentKey 注册；新增课时才需要修改 catalog.ts。保持已有 lessonId 不变，升级正文不需要迁移完成记录。复制示范时必须更换块 ID。

### 配置公式与符号解释

```ts
{
  id: 'example-formula', type: 'formula', latex: 'y = wx + b',
  label: 'y 等于 w 乘 x 加 b', display: true,
  symbols: [{ id: 'example-weight', latex: 'w', label: '权重', description: '控制输入对输出的影响程度。' }],
}
```

符号通过显式按钮配置，不解析或拆分 KaTeX 的内部 DOM。按钮支持点击、Tab 聚焦和 Escape；用 aria-expanded/aria-controls 关联解释区域。LaTeX 在 TypeScript 字符串中需要双反斜线，或使用 String.raw 模板字符串。

MathFormula 调用真正的 KaTeX render，使用 trust:false、throwOnError:true、maxExpand:200、maxSize:10，输出 HTML 与 MathML；排版失败时清空目标节点并以转义文本提示。详见 [KaTeX 官方选项](https://katex.org/docs/options.html)。KaTeX 仅管理独立空节点；教材字符串从不作为原始 HTML 注入。代码通过 [Prism tokenize](https://prismjs.com/extending.html) 产生 token，再由 React 渲染转义文本与 span，没有使用 dangerouslySetInnerHTML。

### 创建随堂测验

QuizBlock.question 根据 kind 选择：

- single：options（稳定 option.id/text）、correctOptionId。
- multiple：options、correctOptionIds；比较集合，顺序不影响答案，漏选或多选均错误。
- numeric：answer、tolerance（非负有限绝对误差），输入必须为有限数字；额外补偿浮点表示边界误差。

三种题型均需 prompt 和 explanation。提交后锁定本次答案、显示反馈和解析；重新作答清除该题尝试。空答案或非法数字不会记录为已提交。QuizProvider 仅在本次页面会话存储 attempts[lessonId][blockId]，客户端路由切换保留，刷新清空；本阶段没有新增答题 localStorage 格式。若未来要持久化，必须使用独立存储键与 schemaVersion，不能混入 T02 progress records。答题没有调用 completeLesson，任何测验结果都不自动完成或撤销课时。

### 复用轻量参数组件

ParameterPanel 接受 definitions 数组（key、label、defaultValue、min/max、step）与 render prop children(values)。合法有限值进入 values；数字输入草稿独立保存，非法值只显示说明而不污染计算。恢复默认值同时清空错误。调用者应提供不同 key 和范围内的有限默认值，动态更换整套定义时通过 React key 重新初始化组件。

NeuronDemo 使用 -10～10 的定义、默认 x=2/w=3/b=1，把 values 交给 services/neuron.ts 的 calculateNeuron，再显示实时公式、输出和两步过程。services/parameters.ts 负责可复用的数值边界解析。公式计算没有 UI 或浏览器依赖，可单独测试；本组件不包含神经网络可视化或训练。

### UI 与兼容边界

桌面沿用课程树/正文/本节目录三列，平板两列，手机单列与可折叠课程组。长公式、代码分别局部滚动；全局 reduced-motion 样式继续生效。CodeViewer 的标签支持方向键/Home/End，复制成功或失败均有状态反馈，剪贴板受限时显示手动复制框。Python/C 示例固定使用默认参数并在正文明确说明，不会运行代码。

课程版本更新为 2026.10.t03，localStorage 键和 schemaVersion 1 均保持；稳定课时 ID 的历史记录继续加载，历史完成时间不会因为访问新版教材而清空。其余跨设备同步和并发存储限制沿用 T02。


## T04 可视化神经元实验室

### 路由与状态边界

`App.tsx` 按需加载 `pages/NeuronLaboratory.tsx`，路由 `/laboratory/:experimentId` 当前只开放 `neuron`；其他 ID 显示友好提示。列表沿用 `/laboratory`，向量、注意力和位置编码的旧查询预览保留。`experiments/catalog.ts` 的可选 path 区分已开放实验与预览，`experimentPath` 集中生成入口。旧 `?experiment=neuron&from=课时ID` 使用 replace 转入新地址。

`/lessons/neuron-forward` 保留稳定 ID，元数据关联 neuron，入口携带 `?from=neuron-forward`。返回参数必须存在于 lessonById，非法或外部地址回退到 neuron-forward，不直接用作导航 URL。直接访问和刷新由现有 SPA fallback 支持。

配置只存在 NeuronWorkbench 的 React 状态中，离开实验页或刷新后恢复默认。挑战使用各自独立状态，只由显式提交判定，不调用 LearningProvider。课程记录的键、schemaVersion、课程 ID 和完成逻辑均不变，没有新增实验 localStorage 或后端服务。

### 共用纯数学核心

`services/neuronMath.ts` 提供 NeuronConfig、NeuronComputation、activate、computeNeuron、sampleActivation。计算 `weightedTerms[i] = inputs[i] * weights[i]`，再求 weightedSum、加一次 bias 得到 preActivation，最后由 activate 得到 output。结果复制输入和权重，调用不会修改配置。

computeNeuron 要求 1～5 个有限输入、相同长度的有限权重、有限偏置和有效激活类型；每次乘积、累加与加偏置都检查有限性，非法或溢出返回 null。数学模块不限 UI 的数值范围；UI 复用 parameters.ts 验证 -10～10。Sigmoid 按 z 正负选择非正指数，避免 exp 溢出；Tanh 使用 Math.tanh。曲线采样 2～2001 点，拒绝无效区间与溢出的跨度，先计算插值比例以避免大跨度乘采样索引溢出。

T03 的 `services/neuron.ts/calculateNeuron` 保留原参数接口、范围和返回格式，内部调用单输入 Linear 的 computeNeuron。`services/numbers.ts/withinTolerance` 供挑战和原数值测验共用绝对误差判断，补偿浮点表示边界。显示使用 formatNumber（最多 6 位小数），不提前舍入数学计算。

### 组件与数据流

`NeuronWorkbench 配置 → computeNeuron → 同一 NeuronComputation → 结构图 / 六步公式 / 激活曲线 / 结果摘要`。

| 文件 | 责任 |
| --- | --- |
| components/ParameterInput.tsx | T03/T04 共用滑块与数字框、局部草稿、边界错误、键盘访问 |
| experiments/neuron/NeuronControls.tsx | 输入数量、输入/权重/偏置、激活切换、示例、整数种子随机生成 |
| experiments/neuron/examples.ts | 默认/教学数据、配置复制、输入数量变更、确定性 LCG 随机参数 |
| experiments/neuron/steps.ts | 从真实结果派生六步公式、解释及节点/连线高亮 ID |
| experiments/neuron/useForwardPlayer.ts | 六步播放、暂停、速度与计时器清理；代次标识阻止旧回调继续推进 |
| experiments/neuron/ForwardStepper.tsx | 步骤时间线、当前 KaTeX 公式和控制按钮 |
| visualizations/neuron/layout.ts | 1～5 输入的桌面横向 / 手机纵向节点坐标 |
| visualizations/neuron/NeuronGraph.tsx | SVG 节点、正/负/零连线、步骤高亮、解释和局部缩放 |
| visualizations/neuron/ActivationPlot.tsx | 共用函数采样、自动包含当前 z 的横轴、真实当前输出点 |
| experiments/neuron/challenges.ts | 挑战数据、类型、固定目标及独立判定 |
| experiments/neuron/NeuronChallenges.tsx | 独立作答/调参、显式提交、反馈、重做与本页完成计数 |

任何数学参数编辑（包括非法草稿）都会暂停并回到第 1 步；生成整套参数/变更输入数量还会重建字段，清除旧草稿。播放速度只改变计时，不改变数学结果。播放到第 6 步停止；再次播放从第 1 步开始。结构图数字始终显示当前完整计算，高亮表达正在解释哪一步，避免把局部和与加偏置后的 z 混淆；第 3/4 步公式分别明确显示它们。

SVG 节点具有可理解的按钮标签、Tab 焦点、Enter/空格与说明；节点和连线采用不同 React key 前缀。结构图支持 100%～200% 局部缩放，手机变为纵向信息流；公式与图形在自身区域滚动。全局 prefers-reduced-motion 关闭节点动效，仍保留步骤和数据更新。所有绘图由 React/SVG 生成，无截图、远程图表或重型图表依赖。

### 扩展激活函数

1. 在 neuronMath.ts 的 ACTIVATIONS 增加稳定键、label、LaTeX 定义和初学者说明；ActivationType 自动推导。
2. 在 activate 的穷尽 switch 添加真实有限计算，处理极端输入。computeNeuron 与 sampleActivation 共享该实现，不另写绘图版函数。
3. 在 ActivationPlot 的纵轴范围策略中为有界函数设置合适边界，确保当前点可见；控件与曲线切换按钮由 ACTIVATIONS 生成。
4. 补充函数精度、边界/溢出、采样一致性、步骤 KaTeX 排版及浏览器切换测试。

### 新增示例与挑战

教学示例添加到 examples.ts 的 NEURON_EXAMPLES（唯一 id、title、合法 NeuronConfig）。随机参数由显式整数种子和输入数量决定，测试不使用 Math.random。

挑战添加到 challenges.ts 的 NEURON_CHALLENGES，提供稳定唯一 id、title、prompt、非负有限 tolerance。prediction 保存固定 config，答案通过共用核心计算；tuning 保存固定 inputs、activationType、target 及初始 weights/bias。当前支持的类型由统一 ChallengeCard 渲染。新增类型时扩展 NeuronChallenge / ChallengeSubmission union、judgeChallenge 和对应 UI，并增加测试。

判定只接收挑战 ID 与学生答案或权重/偏置，不接收学生指定的目标、输入或激活函数。调参权重/偏置限 -10～10；非法草稿禁用提交。改变答案或重新挑战清除上次判定，只有再次提交成功才计为完成，探索区参数不会影响挑战。新增调参卡片时应为可访问标签提供相应挑战名称。绝对容限与原始计算值比较，不比较页面舍入后的文本。

当前三关为 Linear 输出 7、负值经过 ReLU 输出 0、固定 [2,-1] 输入调到 6（容限 0.05）。挑战不设置学习进度门槛，不实现反向传播、网络堆叠或训练。


## T05 激活函数与梯度实验

### 共享核心与模块边界

T03 → calculateNeuron → T04 computeNeuron / activate，T05 也调用同一核心；四个激活函数值没有分叉实现。neuronMath.ts 的 sampleActivation 改用共用 sampleDomain，保持 T04 API 和数值行为。激活实验页面通过 React.lazy 按需加载，没有新增依赖。

| 文件/目录 | 职责 |
| --- | --- |
| services/activationMath.ts | 数学导数、向量逐元素计算、函数/导数采样、真实切线 |
| services/affineMath.ts | 两次仿射、等效仿射和中间 ReLU 对照计算 |
| services/gradientChain.ts | 1～8 层标量复合函数、局部因子与累计输入梯度 |
| services/plotSampling.ts、mathDisplay.ts | 有界采样、缺失值断线、科学记数与 LaTeX 数字显示 |
| visualizations/activation/CartesianPlot.tsx | 共用 SVG 坐标、曲线、切线、当前点与空心端点 |
| visualizations/activation/GradientPlot.tsx | 梯度绝对值坐标、符号颜色、零/未定义行和键盘选点 |
| experiments/activation/ | A～E 的 UI、扫描 Hook、教学预设和挑战定义 |
| pages/ActivationLaboratory.tsx | 正式页面、模块导航、来源课时返回 |

独立路由 /laboratory/activation 保留 T04 /laboratory/neuron 与友好无效实验页面。experiments/catalog.ts 的 path/entryLabel 驱动正式入口；旧 ?experiment=activation 会用 replace 跳转，合法 from 参数继续保留，非法来源只回退至 gradients-backprop。其他旧查询预览不变。

gradients-backprop 的稳定 ID、contentKey 和层级保持不变，仅注册 contents/activationGuide.ts 的短篇结构化引导并设置 relatedExperimentId。T03 LessonRenderer 按原注册表渲染，不增加专用页面分支。课程版本为 2026.10.t05；进度 schemaVersion 与原记录兼容。

### 数学定义与数值约定

| 激活函数 | 函数值 | 数学导数 |
| --- | --- | --- |
| Linear | x | 1 |
| ReLU | max(0,x) | x<0 为 0；x>0 为 1；x=0 未定义 |
| Sigmoid | 1/(1+exp(-x)) | f(x)(1-f(x)) |
| Tanh | tanh(x) | 1-tanh²(x) |

activate 沿用 T04：Sigmoid 按输入符号选择非正指数，避免 exp 溢出。activationDerivative 对 Sigmoid/Tanh 使用等价的 exp(-abs(x)) / exp(-2abs(x)) 形式，避免函数值舍入到端点后相减提前得到零。Tanh 极端尾部将系数 4 放在指数内，保留仍可表示的次正规值。有限输入的极小导数允许浮点下溢，但同时返回 logMagnitude 和 underflow；非有限输入、非法类型/向量或不安全采样返回 null。

DerivativeResult 使用 defined / undefined 联合类型。ReLU 在 ±0 返回 reason: relu-zero、leftSlope:0、rightSlope:1；不产生唯一切线，导数采样断开并绘制空心端点。本阶段不使用次梯度；若未来优化器选择某种零点约定，应另设优化算法接口，不能改变这里的数学含义。

两层仿射等效于 (w2*w1)x+(w2*b1+b2)，计算同时返回展开前后结果和 ReLU 对照。比较基于未舍入值；曲线和当前点使用相同纯函数。并非所有含 ReLU 的退化配置都会产生不同形状，不据此给模型作绝对排名。

### 链式法则范围与绘图

computeGradientChain 逐层调用 computeNeuron，得到 zi = wi*h(i-1)+bi、hi=f(zi)，再计算局部因子 wi*f'(zi) 和累计 gi=gi-1*局部因子，g0=1。每个图点/表格行是 dhi/dx，最终值是 dy/dx；同时保存带符号数值、绝对值和 log10 绝对值。

精确零使用 sign:0、logMagnitude:null，不执行 log(0)。非零极小量下溢时保留符号与对数幅度，界面明确显示“浮点下溢”。后续因子将数值带回可表示范围时，可由保留的对数恢复乘积。计算本身不使用显示舍入值。超出有限计算范围返回 null，UI 参数限 -10～10，层数限 1～8。

遇到 ReLU 零点的局部未定义导数，累计状态为 local-derivative-undefined，表示这条链式法则计算的条件不满足。这不证明复合函数一定不可导（例如某个零权重可能让它为常数）；本实验不额外代数化简或推断唯一导数。

GradientPlot 纵轴表示幅度，紫/橙分别表示正/负，灰色表示精确零或连乘不可判定。对数图对零另设行，对未知导数显示 ?；路径在缺失位置断开。线性图也使用绝对值，不混淆负梯度与小幅度。五个预设包含四种必需对照和 Sigmoid 权重补偿，明确梯度由权重和激活导数共同决定。

此处只是标量复合函数的输入导数教学，未建模损失函数、参数梯度、多维神经网络、自动微分、训练或优化器。

### 状态、交互与可访问性

ParameterInput 复用 T04 的非法草稿隔离与边界验证。A、B、C、D 参数各自独立；预设/恢复默认值重建草稿。B 的扫描 Hook 定时修改真实输入，可暂停；编辑输入/切换函数停止扫描，卸载清理定时器。prefers-reduced-motion 下禁用自动扫描并保留键盘/手动操作。

桌面参数/曲线/公式分栏，窄屏单列。SVG、表格和公式必要时只在自身容器滚动；梯度点支持 Tab、Enter 和空格；曲线滚动容器可聚焦。同步比较始终使用相同坐标，勾选变化不单独缩放函数。未聚焦的跳转主内容链接通过裁切隐藏，键盘聚焦仍显示。

E 直接复用 T03 QuizBlock、QuizRenderer 和 judgeAnswer，嵌套独立 QuizProvider，以 laboratory-activation 为作用域，不读写 LearningProvider。参数/答题在离开实验页或刷新后重置；课程进度仍由原 localStorage 保存。提交错误答案不会完成课时，答对也不会自动完成课时。

### 扩展激活函数与挑战

新增激活函数时同时完成以下步骤，不能只添加一条 UI 曲线：

1. 在 neuronMath.ts 的 ACTIVATIONS 和 activate 增加稳定键、定义、说明及数值稳定计算，T03/T04/T05 继续共用。
2. 在 activationMath.ts 为新键实现导数，明确不可导点、logMagnitude 与下溢约定；若导数允许负值，应扩展导数符号表示和 gradientChain 的局部因子符号计算（当前四函数导数非负）。
3. 扩展 activation/definitions.ts 的特征与导数公式、ActivationComparison 的颜色和共用尺度策略；检查 T04 ActivationPlot 的纵轴策略。新函数超出当前坐标时，应共同调整比较尺度。
4. 增加值/导数边界、光滑点中心差分、采样/向量一致性、链式法则和浏览器切换测试；不可用中心差分断言不可导点可导。

新增 T05 挑战在 experiments/activation/challenges.ts 添加唯一 QuizBlock ID，使用 numeric（answer/tolerance）、single（options/correctOptionId）或 multiple（options/correctOptionIds）。答案通过纯数学模块构造，解释写在数据里；数值判定复用绝对误差容限，不比较字符串或舍入文本。保持 QuizProvider 作用域独立，并扩充单元和浏览器显式提交/重试测试。新题型按 T03 内容联合类型/校验/判定/渲染器接口扩展，避免在实验 UI 中硬编码答案。

## T06 多层神经网络与训练

### 模块与复用

T06 在独立纯函数目录 `services/mlp/` 组合矩阵运算、前向、损失、反向和训练，不改写已有 T04/T05 的数学定义。激活值调用 `neuronMath.activate`，解析导数调用 `activationMath.activationDerivative`；`trainingActivationSlope` 只为 ReLU 零点选择训练次梯度 0。T05 的数学导数仍返回 undefined。

| 文件/目录 | 职责 |
| --- | --- |
| services/mlp/types.ts、matrix.ts | 张量/缓存/快照类型，形状和有限数校验，矩阵乘法、转置、外积 |
| services/mlp/network.ts | 种子初始化、模型校验、逐层与完整前向、XOR 数据 |
| services/mlp/loss.ts、backprop.ts | 一致的损失/梯度、手写链式法则、批量平均、不可变 SGD |
| services/mlp/training.ts | 单步状态转换、Step/Epoch、300 点历史与 12 份快照 |
| services/mlp/gradientCheck.ts | 所有参数的中心差分核对，跳过 ReLU 不可导区域 |
| services/mlp/decisionBoundary.ts | 当前模型的二维概率网格采样 |
| experiments/neural-network/useMLPTraining.ts | React 调度、暂停/停止/清理、配置兼容和错误状态 |
| experiments/neural-network/NetworkControls、ModelExplorer、ForwardInspector | 结构编辑、真实节点/连接检查、分层矩阵展示 |
| experiments/neural-network/BackpropInspector、TensorView | 当前梯度与历史批快照区分，KaTeX 矩阵与参数更新展开 |
| experiments/neural-network/LossExplorer、GradientCheckPanel | 真实损失函数曲线与可运行数值梯度检查 |
| visualizations/neural-network/ | SVG 全连接结构、真实损失历史、二维概率边界 |
| pages/NeuralNetworkLaboratory.tsx | 按需加载页面及安全来源课时返回 |
| lessons/contents/networkTraining.ts | loss-training 的教材及 gradients-backprop 的 T06 扩展 |

`/laboratory/neural-network` 在通用实验详情路由前注册；实验目录的 path/entryLabel 继续驱动入口。旧 `?experiment=neural-network` 通过已有逻辑跳转，保留合法 from；无效 from 回退 loss-training，不作外部跳转。T04/T05 路由与旧预览不变。LessonRenderer 的块级实验链接也统一调用 experimentPath(experimentId, lessonId)，从教材关联块进入后能返回原课时，不另建教材渲染系统。

### 列向量与形状约定

模型为 inputSize 和按前向顺序排列的 layers。每层包含 weights、biases、activation。若上一层宽度为 m，当前层为 n：

| 张量 | 内部数组形状 | 数学形状 |
| --- | --- | --- |
| 输入/上一层激活 a[l−1] | number[m] | m×1 列向量 |
| W[l] | number[n][m] | n×m，行对应当前神经元 |
| b[l]、z[l]、a[l]、delta[l] | number[n] | n×1 列向量 |
| dL/dW[l] | number[n][m] | n×m |
| dL/db[l] | number[n] | n×1 |

前向计算 `z[l]=W[l]a[l−1]+b[l]`，`a[l]=f(z[l])`。forwardLayer 返回输入、权重/偏置形状、z、a；forwardNetwork 顺次组合并保留全部层缓存。网络图、前向面板与当前单样本反向使用同一缓存，不另行拼造数据。界面 2 个输入、1 个输出，1～2 个隐藏层，各 1～8 个神经元；纯核心允许 1～8 个输入并支持单计算层，便于验证基本公式。当前不支持多输出、CNN、RNN 或 Transformer。

随机初始化使用显式 uint32 种子的 LCG（1664525、1013904223），按矩阵行优先生成 Xavier uniform `±sqrt(6/(fanIn+fanOut))`，偏置全零。不调用 Math.random，同种子/结构可复现；可视化颜色、标签与线宽不参与数学计算。

### 损失、手写反向和 SGD

单输出 MSE 为 `L=(ŷ−y)²`，没有 1/2，`dL/dŷ=2(ŷ−y)`。批量损失、dW、db 都对 B 个样本取均值，只除一次 B。XOR 标签为 0/1，训练样本接口限定目标在 [0,1]。

Sigmoid+BCE 为 `−y log σ(z)−(1−y)log(1−σ(z))`。实现使用同一目标的稳定 logit 形式：

`L=y softplus(−z)+(1−y)softplus(z)`，`softplus(t)=max(t,0)+log1p(exp(−abs(t)))`。

输出层合并求导 `delta=ŷ−y` 以稳定等价式 `(1−y)σ(z)−yσ(−z)` 计算，保留概率舍入到端点后仍可表示的小梯度。不会裁切损失后沿用不一致的梯度。单独展示的 dL/dŷ 若超出有限数范围返回 null，并说明使用稳定合并求导，不显示伪造的零值。教学概率曲线的错误端点具有无穷极限，用缺失点表示而不强行截平。

手写反向：

1. 输出层：MSE 使用 `2(ŷ−y)f′(z[L])`；Sigmoid+BCE 使用上面的合并 delta。
2. 隐藏层：`upstream=(W[l+1])ᵀdelta[l+1]`，`delta[l]=upstream ⊙ f′(z[l])`。
3. 单样本参数梯度：`dW[l]=delta[l](a[l−1])ᵀ`（外积），`db[l]=delta[l]`。
4. 批量平均后基础 SGD：`Wnew=W−η mean(dW)`，`bnew=b−η mean(db)`。

ReLU(0) 在训练接口使用次梯度 0，教材与面板明确说明这是算法约定；不修改 T05 的数学结论。损失/梯度/SGD 均为纯函数；更新生成新模型，不在渲染期间改写参数，不使用自动微分或现成训练框架。

### 训练状态、检查快照与性能

默认：2→4→1、隐藏 Tanh、输出 Sigmoid、BCE、种子 42、学习率 0.5、批量 4、最多 2000 次更新。学习率界面范围 0.001～2，批量 1/2/4，上限 1～5000。按已处理样本数确定固定循环批，不随机打乱；Step 是一次批量更新，Epoch=floor(examplesSeen/4)。修改兼容的学习率/批量/上限只暂停，保留参数；结构、种子、损失改变重新初始化并清空不兼容记录。BCE 强制 Sigmoid 输出；MSE 可选四种输出激活。

每步在旧模型上缓存实际训练样本的 forward、loss、delta、dW/db，记录 before/after 模型、学习率、更新量 L₂ 范数和更新后全 XOR 平均 Loss。每次更新先算完整结果再返回；非法维度、非有限值及溢出抛出错误，调用者不提交失败状态。有限但不收敛的真实结果照常显示，不按预测替换训练数据。

三个对象明确分离：

- **当前模型**用于当前选中输入的网络图、预测表、损失实验和边界；图中梯度为该单样本梯度。
- **损失历史**每次更新记录一个全数据损失点，最多 300 个；清空历史不改变模型或 Step。
- **检查快照**保留最近 12 步；面板可额外固定一份引用，在后续训练中保持不变，最多额外一份，切换结构重置。快照单样本 delta 与整批平均 dW/db 分开标注。

连续训练每轮最多 25 次更新或约 10ms 计算，然后用 setTimeout 让出至少 32ms；每轮统一通过 startTransition 提交显示状态，使导航和参数编辑优先。暂停/停止/结束/错误会立即发布最新有效状态。generation token 和定时器取消防止停止、重置、卸载后旧任务继续。前向可见步骤由所选步骤的模型 Step 派生，避免训练时额外的 Effect 更新；共享 MathFormula 只在排版错误状态改变时更新 React 状态，不在每次成功排版后重复 setState。二维概率使用 25×25 单元中心真实采样，最多每 150ms 更新一次，显示所采样的 Step 与当前 Step，最终停止后会刷新至最新模型。非二维输入/非 Sigmoid 输出不显示概率边界。

SVG 图中所有连接与 W 元素一一对应。正/负/零通过颜色、说明和虚线区分，数值选中查看；透明点击区域单独定义，不参与线宽编码。主要控件、节点、连线与图内滚动支持键盘。没有不可暂停的位移动画；遵循全局 prefers-reduced-motion。窄屏单列，图、矩阵和表格自身滚动，不扩宽整页。

### 数值梯度检查与扩展

`checkGradients` 对每个权重和偏置计算 `(L(θ+ε)−L(θ−ε))/(2ε)`；ε 默认 10⁻⁵，同一个批量损失/平均约定。通过条件为绝对误差 ≤ `10⁻⁶×max(1,|解析值|,|数值值|)`。相对误差也展示，分母下限 10⁻⁸。原始样本命中 ReLU 零点（邻域阈值 10⁻¹⁰）或扰动跨越区域时返回 skipped、passed=false，提示不适用，不宣称零点可导。

扩展激活函数须先完成 T05 共用值/导数接口，再明确训练不可导点约定，并增加新函数的前向、MSE 反向和中心差分测试。新增损失须同时提供数值、输出梯度、适用激活限制、批量约定、教学公式和梯度检查；不能只添加 UI 名称。新增预设应由架构/种子/设置/真实数据组合，不填写预制预测或损失历史。

模型、曲线和快照只保存在当前实验组件，离开/刷新重置；学习进度键及 schemaVersion 1 完全独立，训练不调用完成课时接口。测试覆盖基础张量、多层 MSE/BCE 反向、四种激活、中心差分、SGD、种子、XOR 收敛、有限历史、SVG 数据和发散安全停止；实际结果见 DEVELOPMENT_LOG。

## T07 语言表示实验

### 分层与共用计算

`LanguageWorkbench 的有效配置 → runPipeline → 同一份 PipelineResult → A～G 展示/矩阵/导出`。计算模块无 React、DOM、网络或存储依赖。页面通过 React.lazy 加载；七个页签只显示当前实验区，避免把全部内容堆成长页。曲线复用 CartesianPlot、sampleDomain；公式复用 MathFormula，教材复用原 LessonRenderer 注册表。

| 文件 | 职责 |
| --- | --- |
| services/tensorMath.ts | 共用有限数、规则矩阵校验及真实矩阵乘法，最多 64×64 |
| services/mlp/matrix.ts | 保留 T06 1～8 维接口；matMul 先执行原限制再委托共用乘法 |
| services/language/tokenization.ts | 字素来源区间、三种确定性分词及教学尺寸上限 |
| services/language/vocabulary.ts | 四特殊 ID、词表校验、双向映射、UNK 与 One-Hot |
| services/language/representation.ts | 教学/种子 E、查表/乘法证明、PE、采样与逐元素相加 |
| services/language/similarity.ts | 点积、余弦、距离、逐项过程和零向量状态 |
| services/language/pipeline.ts | 统一中间结果、张量形状、版本化导出 |
| experiments/language/ | 共同工作台、七个实验组件、数值草稿控件与可滚动 MatrixView |
| visualizations/language/PositionHeatmap.tsx | 可点击/键盘选择的真实 PE 热图 |
| pages/LanguageRepresentationLaboratory.tsx | 来源验证、返回链接、按需加载样式 |
| lessons/contents/languageRepresentation.ts | embedding 与 position-encoding 两节结构化教材 |

T06 原矩阵约定和限制并未扩大；只把有限性检查和乘法实现提取到共用模块，T07 允许更大的词表矩阵。旧前向、反向、损失、SGD、激活/导数代码保持原行为，旧单元与浏览器测试继续执行。无需引入第二套深度学习框架或不一致的矩阵乘法。

### Tokenizer 与词表规则

字符单位采用 `Intl.Segmenter('und',{granularity:'grapheme'})`，保留组合附加符号、代理对、肤色/ZWJ emoji 的完整字素。Token.start/end 是仅供原文 slice 的 UTF-16 偏移，不用作字符数量或位置编号；pos 是分词后从 0 开始的序列索引。没有 Unicode 正规化、大小写折叠或隐式替换。

- whitespace：连续非空白 `\S+`，多个空白合并，标点留在片段中。无空格中文往往只得到一项，界面明确说明局限。
- character：每个非空白字素为一项，标点保留。
- subword：固定 SUBWORDS 按最长优先匹配，必须在字素边界结束；不匹配时回退一个完整字素。区分大小写，空白跳过。没有学习过程或合并统计，不声称实现 BPE/WordPiece/SentencePiece。

特殊词表地址恒定：PAD=0、UNK=1、BOS=2、EOS=3。自定义项按显式输入顺序追加，不能重复特殊项或彼此重复。UI 忽略空白行，空自定义表得到四特殊项；纯 createVocabulary 对非法空项/含空白项拒绝。最多 60 自定义项，每项最多 64 码点。未知查找只返回 UNK，反查非法 ID 抛出可测试错误。ID 不因 React 渲染变化；用户编辑/重排词表会改变地址，因此工作台原子更新词表与 E、重置选择和流水线。不会自动添加 BOS/EOS/PAD。

### 张量与数学约定

T07 以 Token 为行；这与 T06 单样本列向量约定处于不同领域，不混用其张量接口：

| 对象 | 形状 |
| --- | --- |
| Token/ID 序列 | n |
| One-Hot H | n×V |
| 可编辑 Embedding E | V×d_model |
| X_embedding = H E（实际直接查表） | n×d_model |
| PE、X_input | n×d_model |

createEmbedding(seed=null) 使用公开教学规则 `((row*3+column*2)%9−4)/4`。指定 uint32 种子时使用确定性 LCG，按行优先产生 [-1,1) 数字。两者和手工编辑均未训练；E 并非预训练语义表示。lookupEquivalence 真实计算 `[OneHot(ID)]×E` 并与 E[ID] 逐元素比较。查表结果复制行，编辑输出不会污染参数。

点积为 Σaⱼbⱼ；余弦为点积除两向量范数；欧氏距离为 √Σ(aⱼ−bⱼ)²。过程同时返回乘积、差及差的平方。范数/距离用 Math.hypot，余弦先逐分量归一化避免范数乘积溢出；零范数返回 null（未定义），不显示成 0。不可表示的乘积、差或结果抛出错误。UI E 元素限定 [-10,10]，计算使用全精度；前两维图只表示投影，指标使用全部维度。

位置编码严格按[原论文 第 3.5 节](https://arxiv.org/html/1706.03762v7#S3.SS5)：

`PE(pos,2i)=sin(pos/10000^(2i/d_model))`；
`PE(pos,2i+1)=cos(pos/10000^(2i/d_model))`。

实现按列 j 取 i=floor(j/2)，偶列 sin、奇列 cos，单位弧度。d_model 为 2～16 正偶数；位置索引从 0 开始。矩阵长度 0～32，独立预览窗口长度 1～32。positionalValue 允许区间内连续位置供曲线采样（129 点），矩阵行位置仍为整数。pos=0 交替得到 0/1；曲线、热图、精确数值和当前点共用这一公式。

addRepresentations 拒绝行数/列数/d_model 不匹配、非法和溢出；实际逐元素相加，不拼接、不补齐。空句子返回 [] 并通过显式 shape=[0,d] 保留零行语义。独立 PE 预览窗口不改变句子；流水线 PE 永远按 n 行生成，避免用用户的独立预览长度错误相加。

原论文 第 3.4 节 另有 Embedding×√d_model。T07 直接使用可编辑 E 作为相加前的教学表示，embeddingScale=1；教材、界面与导出注明这一差异，不声称复现完整原模型。没有 QKV/Self-Attention 或上下文聚合。

### 状态、输入和导出

有效共同配置是 text、tokenizer、vocabulary、E、dim。纯 runPipeline 一次派生 tokens/mappings/ids/hot/vectors/pe/input/shapes。useMemo 只优化计算，不作为数据来源；上游有效变化同一 React 更新批重置步骤，保证公式/图/矩阵一致。非法数字草稿独立于有效参数，显示错误并保留上次有效计算；文本超限时 computed.result=null，序列相关组件显示不可用而不沿用历史矩阵。

限制为 256 Unicode 码点、32 Token、V≤64、d≤16。矩阵/图形内部滚动，键盘可聚焦；页签支持方向键/Home/End，热图支持 Enter/空格/直接数字选择。使用现有 reduced-motion 全局规则，无持续播放任务。实验数据离开或刷新重置；页签局部选择回到默认值，但共同矩阵和文本在页内切换保留。T02 LearningProvider/存储键/schemaVersion 均未变。

八步分别展示输入类型/形状、真实输入、运算/公式、输出类型/形状、真实输出和解释。输入/输出可折叠；最终导出仅将当前结果序列化为 JSON Blob，没有读取外部 JSON 或执行代码。

导出结构 v1：schemaVersion、kind=transformer-input、tokenizer、按原序 tokens、ids、shape=[n,d]、values（完整浮点）、embeddingScale=1、positionStart=0、未训练说明。它是未来 T08 的输入接口；本次没有消费者。未来添加导入必须单独校验版本/类型、Token 与行数、偶数列数、尺寸/有限值及位置约定，不能把外部数据直接交给渲染器。

### 教材、路由和扩展

正式路由 `/laboratory/language-representation` 在通用实验 ID 路由前声明；目录 path/entryLabel 驱动列表及旧查询跳转。from 参数必须是 lessonById 中的稳定 ID，非法值回退 embedding，不能外部跳转。旧 neuron/activation/neural-network 路由与 vector/attention/position 查询预览继续存在。

embedding 与 position-encoding 保留 ID、标题及课程顺序，只升级独立正文和实验关联，课程版本更新 2026.10.t07。原 LessonRenderer 渲染标题/文字/公式/符号解释/提示/测验，三道新题复用独立 QuizProvider，不操作课时完成状态。其他 11 节仍为占位，不能把目录视为完整教材。

新增教材继续按 T03 流程：创建 contents/*.ts，提供稳定 lessonId 和跨正文唯一 block.id，在 content.ts 注册现有 contentKey；不在实验页写第二套教材。新增分词器须扩展 Tokenizer/TOKENIZERS、纯 tokenize 分支和标签，保留 Unicode 来源区间与尺寸验证，并测试英文、中文、emoji、空白与未知词。扩展相似度/PE 必须补充独立纯函数、公式、边界/数值测试及同步 UI，不添加只改图形不改计算的实现。

T07 单元测试见 tests/unit/language.test.mjs；浏览器见 tests/language.spec.ts。真实 JSON 下载后读取内容验证，跨 Node/Chromium 的三角函数以合理浮点容差比较；不会通过字符串末位相等来判定数学正确性。实际结果与 QA 截图记录见 DEVELOPMENT_LOG。

## T08 Attention 核心实验室

详见 [Attention 数学与协议说明](ATTENTION_MATH.md)。T08 复用 tensorMath.matrixProduct/finite/tensorShape，不扩大或改写 T06 的尺寸与训练定义；单头、多头、Mask、Softmax 共用 services/attention/math.ts，无框架或第二套近似计算。

数据流为 AttentionWorkbench 的 X/单头参数/多头参数/开关 → useMemo 的真实 AttentionResult 与 MultiHead 结果 → 七个模块、矩阵、热力图、Token 连线和贡献。上游有效修改同步 reset 播放、重算依赖；非法草稿只暂停，保留有效值。计算错误显示提示并隐藏不可用结果。矩阵编辑按选中行/列单元格操作，不挂载几百个输入框。

新增文件：

- services/attention/math.ts：投影、转置、缩放、稳定逐行 Softmax、Mask、贡献、Concat、多头、初始化及形状保护。
- services/attention/input.ts：复用 T07 v1 协议的运行时验证、大小限制、独立持久化与安全回退。
- experiments/attention/：工作台、矩阵编辑、QKV、九步、缩放、贡献、多头、Mask、独立挑战。
- visualizations/attention/AttentionHeatmap.tsx：真实权重 SVG 热图、键盘选择与 Token 连线。
- pages/AttentionLaboratory.tsx、styles/attention-lab.css：按需加载路由、来源返回、局部滚动与减少动态效果。
- lessons/contents/attention.ts：attention-math、attention、multi-head、decoder-mask 四个稳定课时的正文；最后一个只介绍 Mask，完整 Decoder 未实现。

neuron/useForwardPlayer 增加可选 totalSteps，默认仍为 6，T08 传 9；沿用代次标识、暂停、速度、卸载清理。切换模块暂停播放。没有位移动画；prefers-reduced-motion 关闭视觉动效，手动步骤和可暂停播放仍可使用。

正式路由 /laboratory/attention 在通用实验 ID 前声明，已有 attention 预览入口升级为可操作实验；旧 ?experiment=attention 由既有目录逻辑跳转并保留 from。其他旧实验/预览仍在。T07 最后一步保存输入后跳转，返回链接回到语言表示实验室；来源课时白名单仍由 lessonById 保护。

挑战采用独立 QuizProvider 作用域 laboratory-attention，页面内切换模块保留，刷新/离开清空，不操作 LearningProvider。课程仍为 5 门、9 章、16 个稳定 ID；升级四节后共 9 节结构化（decoder-mask 仅 Mask 引导）、7 节占位，版本 2026.10.t08。T02 键及 schemaVersion 1 不变。

测试入口为 tests/unit/attention.test.mjs 和 tests/attention.spec.ts；扩展规则及详细协议见数学文档，实际结果见开发日志。T08 不实现完整 Encoder–Decoder、训练或远程 API。

## T09 Transformer 完整前向

上述 T08 范围保留为历史。T09 新增 /laboratory/transformer，复用旧接口组合真实 Encoder–Decoder。数学、Post-LN、张量形状和权重共享详见 [TRANSFORMER_ARCHITECTURE](TRANSFORMER_ARCHITECTURE.md)。

| 模块 | 责任 |
| --- | --- |
| services/transformer/math.ts | FFN、逐行 LayerNorm、残差、矩形 Cross-Attention 适配、Encoder/Decoder Block |
| services/transformer/model.ts | 教学配置、固定种子初始化、参数校验、T07 表示接入、共享 E 输出、完整前向、Top-K、不可变参数编辑 |
| services/transformer/flow.ts | 统一公式常量、真实计算到 TensorStep 的适配，显式依赖/形状/公式/内部缓存 |
| experiments/transformer/TransformerWorkbench.tsx | 单一有效配置/模型、memo 完整前向、播放失效、五页签、有限草稿和错误状态 |
| TensorInspector / AttentionInspector / ProbabilityInspector | FFN/Norm 展开、矩形三类热图、按位置概率/Top-K；共用旧矩阵和 KaTeX 组件 |
| visualizations/transformer/ArchitectureGraph.tsx | 据 TensorStep.dependencies 绘制主通路、残差与 Memory→Cross，键盘模块选择、内部滚动/缩放 |
| pages/TransformerLaboratory.tsx / styles/transformer-lab.css | 按需加载新实验、来源返回、浅色样式与响应式 |
| lessons/contents/transformer.ts | 四节稳定课时的结构化教材，Decoder 保留 T08 Mask 内容/入口并扩充 |

T08 继续只提供等长 Self-Attention。矩形 Cross 适配复用 transpose/scale/softmaxDetails/applyMask/concatHeads 与共用 matrixProduct，不放宽 T08 接口。Self-Attention 直接调用旧 multiHead，激活仍调用旧 activate('relu')。T06/T07/T08 数学行为不改。

参数结构：embedding，独立 encoders[]（self/ffn/norm1/norm2），独立 decoders[]（self/cross/ffn/norm1/norm2/norm3）。源/目标共用 embedding，输出 projection 每次 transpose(E) 派生。初始化/前向/编辑不修改旧对象，无自动微分或训练更新。

参数编辑通过 parameterMatrices 的稳定 path 白名单，向量在 UI 显示为单行、保存时恢复向量。非法草稿停止播放但不污染有效参数；模型结构/词表/种子改变显式重建，epsilon 仅重算。无效输入/计算错误隐藏下游旧结果。计算不提前舍入；模型不跨刷新保存，T02 progress 和 T08 独立导入缓存不变。

默认 Tensor Flow 24 步，层数增加动态扩展。每项持有真实 inputs/output/shape/dependencies，可选 attention/ffn/norm 内部缓存；图形和检查器都读取同一结果。用已有 useForwardPlayer(totalSteps) 管理上/下一步、播放/暂停、速度、代次失效和卸载取消，不创建无限历史。图形内部滚动而非整页溢出，节点/热图 Enter/Space，页签方向键/Home/End，减少动态效果遵循全局与实验样式。

扩展：先增加纯数学/参数结构/形状校验与参考测试，随后在 flow.ts 注册真实依赖，再接入检查视图。公式统一以 TypeScript 字符串常量传给 MathFormula，避免 JSX 字面量重复反斜线造成静默错误。新增教材仍用原 content.ts 注册与 LessonRenderer；不另建教材渲染分支。

原课时 16 个稳定 ID/顺序和 progress schemaVersion 1 不变，目录版本 2026.10.t09；当前 12 节结构化、4 节占位。FFN/Encoder/完整 Transformer 主关联新实验；Decoder 主关联 T08 兼容旧入口，正文提供 T09。T08 页面新增进入 T09 链接，from=attention-laboratory 安全返回 T08；有效课时 from 返回原课时，其余回退 transformer。

测试：tests/unit/transformer.test.mjs、tests/transformer.spec.ts。数学涵盖独立手工参考、与 T08 等长结果一致、未来隔离/延长前缀、权重共享、逐层独立、最大配置、非法值及公式；浏览器覆盖五模块、实时编辑、播放、课程往返、320/390/768/1440px、键盘和运行错误。实际日志见 validation/t09/。T09 不实施 T10 训练。
