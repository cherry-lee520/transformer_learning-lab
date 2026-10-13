# 开发记录

## T01：项目初始化与基础界面（历史）

已建立 React + TypeScript + Vite + Tailwind 本地应用，提供 Dashboard、Lessons、Laboratory、Paper、Progress 和 404，具备桌面、平板与手机布局。T01 学习状态是内存演示数据，默认完成 2/6，不代表真实学习成果。

历史类型检查、生产构建、12 项功能验收与 3 项截图验收通过；完整历史记录保留在 `T01-acceptance.md`。后续处理过本地服务停止造成的拒绝连接、PowerShell 执行策略导致的 npm.ps1 报错，以及手机访问需要 LAN 监听的问题。增加 `dev:lan`，保留默认仅本机监听的 `dev`。

## T02：课程数据系统（2026-10-11，Asia/Shanghai）

### 开发前基线

已阅读 README、T01 验收、所有相关页面、路由、布局、组件、进度状态和测试。开始时不存在 `PROJECT_OVERVIEW.md`、`ARCHITECTURE.md`、`DEVELOPMENT_LOG.md` 或 `TASKS.md`，本次创建这些文件，没有覆盖历史 T01 验收。

| 命令 | 实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 通过 |
| `npm.cmd run build` | 沙箱内因 Vite realpath EPERM 失败；正常本地权限重跑通过 |
| `npm.cmd run test:e2e` | 修改前 15 项通过，15.9 秒 |

工程差异：现有项目只有 6 个独立课时条目，没有 Course/Chapter 层级；状态在内存，不曾存入 localStorage。因而 T02 新记录从零开始，不导入假完成率。现有页面风格、路由、实验预览、论文链接、移动导航和 LAN 启动方式沿用。

### 实现内容

- 增加 Course、Chapter、Lesson、LessonContent、LearningProgress 与版本化存储类型。
- 目录组织成 5 门课程、9 个章节、16 个课时，覆盖指定的 15 个主题并保留向量基础课时。
- 元数据与正文占位独立；保留 T01 六个稳定 ID，不用数组索引生成标识符。
- 增加可复用校验函数，检查全局 ID、父级关联、先修引用、循环依赖、同级 order、contentKey 与预计时长。
- 实现开始访问、标记完成、撤销、最近课时、章节/课程/整体完成率，访问不计为完成。
- localStorage 使用 schemaVersion 1；恢复损坏数据、过滤非法/过期记录、处理存储限制；未来版本不覆盖原记录。
- 接入 Dashboard、Lessons、Progress、Sidebar 与 Header，取消所有学习假进度。
- 新增 `/lessons/:lessonId`；旧查询链接重定向；无效课时显示友好错误页。
- 课程树展开当前课程并在自身滚动区域定位当前课时；保留全局移动导航和键盘反馈。
- 单元测试使用 Node 内置测试器，无新增依赖。更新原有浏览器测试，保留实验、论文、404 等回归覆盖。

### 最终验收

环境沿用 Windows、Node.js 24.19.0、npm 11.17.0、Playwright 1.56.1 与 Chromium 141。

| 命令/检查 | 实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 最终代码通过 |
| `npm.cmd run test:unit` | 26 项通过 |
| `npm.cmd run test:e2e` | 首轮 33 项通过，32.7 秒 |
| `npm.cmd test` | 最终完整执行：26 项单元 + 33 项浏览器测试全部通过；浏览器部分 34.9 秒 |
| `npm.cmd run build` | 最终代码通过，Vite 构建 16.98 秒 |
| 响应式与刷新 | 桌面 1440×1000、平板 768×1024、手机 390×844 均通过 |
| 全部课时 | 16 个合法课时逐一加载、当前目录定位、跨章导航与末课边界通过 |
| localStorage | 刷新持久化、重开页面、完成与撤销、损坏恢复、无效 ID 过滤、未知版本保护、读取受限均通过 |
| 浏览器运行错误与横向溢出 | 路由验收未发现 |
| 截图 | 三种尺寸的首页、课时详情、进度页共 9 张，保存在 `screenshots/t02/` |

人工查看了桌面与手机课时页、手机进度页和平板首页。首轮视觉检查发现手机目录滚动区域未自动显示当前课时，补充了自动定位及浏览器断言；最终测试通过，截图已更新。

生产输出：CSS 25.65 kB（gzip 6.70 kB），JavaScript 280.11 kB（gzip 90.48 kB）。

未出现本次修改造成的未修复测试或构建失败。沙箱 EPERM 属于执行环境限制，通过正常本地权限运行验证；不要求最终用户管理员权限。Playwright 的颜色环境变量警告不影响测试结果。

### 关键文件变更

- 新增 `frontend/src/lessons/types.ts`、`content.ts`、`index.ts`、`validation.ts`；扩展 `catalog.ts`。
- 新增 `frontend/src/services/learningProgress.ts`、`progressStorage.ts`；删除被真实记录替代的 `demoProgress.ts`。
- 改造 `frontend/src/store/LearningProvider.tsx`，接入版本化持久化。
- 新增 `CourseTree`、`CourseIcon`、`LessonStatus`；更新 `LessonCard`、`Sidebar`、`Header`、`AppLayout`。
- 更新 `App.tsx` 和三个学习页面；扩展 `styles/index.css`。
- 在 package.json 增加 `test` 与 `test:unit`；Playwright 只匹配 `.spec.ts`，与 Node 单元测试分开。
- 新增 `tests/unit/*.test.mjs`、`tests/content-system.spec.ts`；更新旧功能与视觉测试。
- 更新 README，创建四份开发文档，保留 T01 验收和截图。

### 当前限制与技术债务

- 没有发现阻碍 T02 使用的问题。正文依然是占位，实验、模型训练和 T03 均未开发。
- localStorage 不跨设备、浏览器或站点来源同步；清理站点数据会丢失记录，当前未提供导出/导入。
- 存储版本迁移边界已建立，但没有假造尚不存在的历史版本转换器；未知版本保持原数据。
- 跨标签页顺序修改可同步，极短时间并发修改采用最后写入结果，没有事务合并。
- 浏览器验收基于 Chromium 和移动视口模拟，未验证真实手机、Safari 或 Firefox。已有 LAN 启动不保证当前 Wi-Fi 允许设备互访。
- 没有创建远程仓库、部署或后端。`sources/` 参考材料未修改。

T02 完成后停止开发，等待下一条任务。

## T03：交互式教材引擎（2026-10-11，Asia/Shanghai）

### 开发前基线

已阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG、课程目录与正文、Lesson 页面、进度 Provider 和存储逻辑。实际工程与任务描述一致：5 门课程、9 章、16 课时，使用 React 19 / TypeScript 5.9 / Vite 7 / Tailwind 4 / React Router 7。

| 命令 | 修改前实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 通过 |
| `npm.cmd run test:unit` | 26 项通过，约 252 毫秒 |
| `npm.cmd run build` | 通过，Vite 3.94 秒 |

没有重新初始化项目。sources/ 参考材料未修改。保留 catalog 中全部稳定 ID，升级 neuron-forward 的标题、描述、预计时长和正文，课程版本更新为 2026.10.t03；进度 schemaVersion 仍为 1。

### 实现内容与关键文件

- `lessons/contentTypes.ts`：八种 discriminated union 内容块、行内公式、符号注释、三种测验、可选论文/实验关联、兼容占位正文。
- `lessons/contentValidation.ts`：运行时字段检查、未知/损坏/重复块降级、正文/课时关联完整性与目录锚点。
- `components/lesson/LessonRenderer.tsx`：穷尽类型注册表与单块错误边界，按顺序渲染，兼容旧占位教材。
- `MathFormula.tsx`：KaTeX 真正排版，键盘可达的显式符号解释，安全配置与排版失败回退。
- `CodeViewer.tsx`：Prism tokenize 转 React 节点，Python/C 标签、行号、水平滚动、真实复制和失败时手动复制。
- `ParameterPanel.tsx`、`NeuronDemo.tsx`、`services/parameters.ts`、`services/neuron.ts`：通用参数输入与独立公式计算，默认 2/3/1 得到 7；非法输入不污染结果。
- `QuizRenderer.tsx`、`services/quiz.ts`、`store/QuizProvider.tsx`：单选、多选、数值容限、反馈解析与重做，会话状态与 T02 完成记录分离。
- `lessons/contents/neuron.ts` 与 `public/images/neuron-flow.svg`：完整示范教材与说明配图；其余 15 节保留占位。
- 更新 Lessons 页、本节目录、App 路由按需加载、Header/Sidebar 阶段标记与教材响应式样式。
- 新增 `tests/unit/content.test.mjs`、`textbook.test.mjs` 和 `tests/textbook.spec.ts`；保留原有回归测试。增加 tsx 以测试真实 TSX 渲染器。
- README 和 ARCHITECTURE 已说明新增块、独立正文、符号配置、随堂题与参数组件复用方式。

安装并锁定 katex 0.19.0、prismjs 1.30.0、@types/prismjs 1.26.6、tsx 4.23.15；安装审计报告 0 个漏洞。

### 验收与修复记录

单元测试首轮发现测试错误地把 lessonId 当作 contentKey，修正为读取元数据中的实际 contentKey 后，41 项通过。浏览器首轮 48/54 通过；6 个失败为两种断言问题在三种尺寸上的重复：状态选择器同时匹配了当前课时与先修课时；真实 Windows 剪贴板返回 CRLF，而源代码使用 LF。收窄状态选择器并只规范化换行后，21 项教材专项全部通过（25.3 秒），复制仍实际读回系统剪贴板，未用模拟结果代替。

初次构建通过，但入口包约 593 kB 触发大小提醒，随后通过 React.lazy 分离课程页及公式/高亮资源。正式验收结果在下方记录。

按需加载后，完整回归中旧存储测试的全局 status 选择器同时匹配了保存提示和短暂加载提示；已改为定位具体存储提示。页面存储受限时仍正常阅读与标记，加载反馈保留。

### 当前范围

本次只实施 T03，没有 T04 的完整实验室、神经网络可视化、代码执行或训练。答题记录仅在页面会话内保存，刷新清空；课时记录继续持久化。真实手机、Safari、Firefox 尚未验证，移动验收使用 Chromium 设备视口模拟。HTTP 局域网的剪贴板能力取决于浏览器，已提供手动复制回退。其他 localStorage 同源/跨设备/并发限制沿用 T02。

### 最终实际结果

| 命令/检查 | 实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 通过，包含 src、配置与浏览器测试的严格检查 |
| `npm.cmd run test` 第一次最终执行 | 41/41 单元 + 54/54 浏览器测试通过；浏览器约 1.1 分钟 |
| `npm.cmd run test` 连续第二次最终执行 | 41/41 单元 + 54/54 浏览器测试通过；浏览器约 1.1 分钟 |
| `npm.cmd run build` | 通过，含再次类型检查；Vite 4.14 秒，无大包提醒 |
| 数学排版 | 行内、独立、矩阵、分数、上下标、希腊字母与多行公式通过；示范教材无公式错误 |
| 交互与代码 | 默认 y=7；正/负/零参数、边界、非法值、键盘滑块、重置、Python/C 切换、真实剪贴板读回与手动回退通过 |
| 测验与进度 | 单选、多选、数值误差、正误反馈、解析、重做、路由切换保留答题、刷新清空答题、课时完成独立持久化通过 |
| T01/T02 回归 | 全部页面与 16 课时、导航、404、旧链接、完成/撤销/最近学习、损坏存储/无效 ID/未知版本/存储拒绝均通过 |
| 响应式 | 桌面 1440×1000、平板 768×1024、手机 390×844 和额外 320px 窄屏，无页面横向溢出；长代码局部滚动 |
| 本地 HTTP | 示范课时地址返回 200；无需后端 |
| 截图与人工检查 | screenshots/t03/ 保存教材参数/代码/测验和原有页面回归截图；人工查看桌面参数区及手机参数、代码和测验布局 |

最终产物：入口 JavaScript 272.49 kB（gzip 88.61 kB）、课程 JavaScript 320.86 kB（gzip 101.51 kB）；基础 CSS 25.75 kB、课程/KaTeX CSS 36.85 kB。KaTeX 字体随本地构建输出，不依赖在线 CDN。

测试过程的颜色环境变量提示不影响结果。构建和 Chromium 测试使用执行环境允许的本地进程权限；这是沙箱限制处理，不要求用户管理员权限。最终没有未修复的测试或构建失败。临时测试服务器由 Playwright 启动和清理；实际使用请按 README 启动并保持终端运行。

T03 完成，T04 未实施。后续可按相同接口逐节补充教材、单独设计答题存储迁移，并扩大真实设备验收；本次停止，等待下一条任务。


## T04：可视化神经元实验室（2026-10-11，Asia/Shanghai）

### 开发前检查与基线

已阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG；检查 T03 的 NeuronDemo、ParameterPanel、数学/数值题函数，以及实验目录、Laboratory、ExperimentCard、课时路由和 LearningProvider。实际工程与描述一致，继续在原项目增量开发，没有重新初始化，也没有修改 sources/。

| 修改前检查 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过 |
| npm.cmd run test | 41/41 单元 + 54/54 浏览器测试通过；浏览器约 1.1 分钟 |
| npm.cmd run build | 通过，Vite 5.35 秒 |

### 实现与关键修改

- 新增 services/neuronMath.ts：1～5 输入、结构化计算结果、Linear/ReLU/Sigmoid/Tanh、稳定 Sigmoid、逐项有限性与溢出检查、真实采样。
- services/neuron.ts 保留 T03 calculateNeuron 接口，改用共同核心；新增 numbers.ts，共享浮点容限，quiz.ts 同步复用。
- 从 T03 ParameterPanel 提取共用 ParameterInput，数字草稿和实际参数分离，保留原教材控件标签与行为。
- 新增 experiments/neuron/ 下的参数控制、示例/确定性随机数据、六步公式、播放 Hook、步骤 UI、挑战数据/判定和挑战 UI。
- 新增 visualizations/neuron/ 下的桌面/手机坐标布局、可交互 SVG 结构图和采样激活曲线。参数、图形、公式、结果与当前点都来自同一次真实计算。
- 新增 pages/NeuronLaboratory.tsx 和 styles/neuron-lab.css，App 按需加载 /laboratory/:experimentId，当前开放 neuron。
- 更新 experiments/catalog.ts、ExperimentCard 和 Laboratory：新增正式实验入口，保留原向量/注意力/位置编码查询预览及友好错误反馈。
- 更新 lessons/catalog.ts 的关联与 Lessons 入口：neuron-forward ID 不变，进入完整实验可返回原课时。Header 支持实验子路由；阶段标记更新为 T04。
- 新增 tests/unit/neuron-lab.test.mjs 和 tests/neuron-lab.spec.ts，package.json 将新单元文件加入现有测试命令；未增加依赖。
- 更新 README、ARCHITECTURE、TASKS、PROJECT_OVERVIEW 和本日志；保留此前有效记录。

课程目录仍为 5 门课程、9 章、16 课时；存储 schemaVersion 1、progress 键、课时完成/撤销和最近学习逻辑未改。实验挑战不调用学习进度 Provider，不将探索操作或预测错误视为完成。

### 验收中发现并修复的问题

第一轮实验专项浏览器测试 27 项失败：结构图的节点与连线共用 bias/activation/output React key，导致控制台重复键错误；包装 select 的隐式 label 在精确标签定位中包含选项文本，部分测试超时。分别增加 node-/edge- key 前缀，并为下拉框提供明确 aria-label。

第二轮专项 24/27 通过，剩余三项是同一个挑战断言在三种视口下同时匹配输出 output 的隐式 status 和反馈 status。收窄到挑战反馈区域后，完整回归 55/55 单元 + 81/81 浏览器全部通过（浏览器约 1.5 分钟）。没有忽略运行错误或删除失败用例。

补充检查曲线采样的大数区间，改为先计算插值比例，避免“跨度 × 索引”的中间值溢出，并加入 Number.MAX_VALUE 区间断言。此后开始下列最终重复验收。

### 最终实际结果

| 命令/检查 | 实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 通过，严格检查 src、配置与浏览器测试 |
| `npm.cmd run test` 第一次最终执行 | 55/55 单元 + 81/81 浏览器测试全部通过；浏览器约 1.6 分钟 |
| `npm.cmd run test` 连续第二次最终执行 | 55/55 单元 + 81/81 浏览器测试全部通过；浏览器约 1.6 分钟 |
| `npm.cmd run build` | 通过，包含再次类型检查；Vite 6.38 秒，无大包提醒 |
| 数学与可视化数据 | 单/多输入、正负零权重、偏置、四种激活精度、1～5 输入边界、非法值/溢出、真实 SVG 值、曲线采样和浮点容限均通过 |
| 参数与播放 | 滑块/数字框同步、非法草稿不污染结果、输入数量、激活切换、默认恢复、示例、种子随机重复、前后步骤、自动播放/暂停/速度、到末步停止和修改参数重置通过 |
| 三项挑战 | 正误反馈、数学解析、调参目标固定、显式提交、非法草稿禁用、重做及与学习记录隔离通过 |
| 路由与教材 | 实验直接打开/刷新、列表入口、旧查询、无效 ID、安全返回参数、T03 教材往返与原完成状态保持通过 |
| T01～T03 回归 | 原页面/404、全部 16 个课时、完成/撤销/最近学习、历史与损坏存储、教材公式/代码/复制/测验均通过 |
| 响应式与可访问交互 | 1440×1000 桌面、768×1024 平板、390×844 手机及额外 320px 窄屏，无不必要的页面横向溢出；节点键盘访问、局部缩放和 reduced-motion 通过 |
| 浏览器错误 | 新实验验收同时检查 pageerror 与 error 级控制台消息，最终未发现严重运行错误或重复键错误 |
| 截图与人工查看 | screenshots/t04/ 保存三种视口的结构图、曲线、挑战区共 9 张；查看桌面/平板结构、手机结构/曲线和桌面/手机挑战布局 |

最终构建产物：入口 JavaScript 273.79 kB（gzip 89.02 kB）、实验 JavaScript 25.52 kB（gzip 9.41 kB）、课程 JavaScript 56.17 kB（gzip 22.35 kB）、共享 KaTeX JavaScript 266.68 kB（gzip 80.19 kB）；基础 CSS 26.55 kB、实验 CSS 10.14 kB、共享教材/KaTeX CSS 36.85 kB。字体本地输出，无在线图表或 CDN 依赖。

没有新增依赖、未经执行的通过声明或最终未修复的测试/构建失败。Playwright 颜色环境变量提示不影响结果。Chromium 和构建使用执行环境允许的本地进程权限，用户运行不需要管理员权限。临时开发服务器由测试启动并清理，日常使用需要按 README 启动服务器并保持终端开启。

### 当前范围与限制

只实施 T04 的单神经元前向传播。未实施 T05、反向传播、多层网络或模型训练。实验参数和挑战在离开实验页/刷新后重置，界面已明确提示；课时学习进度继续持久化。计算使用浮点数，显示最多 6 位小数；极端 Sigmoid/Tanh 在浮点精度下可能达到饱和值。

浏览器使用 Chromium 的桌面、平板、手机视口和额外 320px 窄屏，未验证真实手机、Safari 或 Firefox。localStorage 同源、跨设备与并发限制沿用 T02。测试截图仅用于 QA，页面全部由实际组件渲染。

T04 已完成并验证。后续可在单独任务中扩充真实设备验收和独立实验状态存储；本次停止，不实施 T05。


## T05：激活函数与梯度可视化实验室（2026-10-12，Asia/Shanghai）

### 开发前检查与实际基线

已阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG；检查 T03 内容类型、注册渲染器、测验/数值判定、ParameterInput，T04 neuronMath、神经元图形/激活曲线、实验目录、路由、课时关联和 LearningProvider。T04 实际完整存在，无前置阻塞。继续在原目录增量开发，没有重建项目或修改 sources/。

| 修改前命令 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过 |
| npm.cmd run test | 55/55 单元 + 81/81 浏览器验收通过；浏览器约 1.4 分钟 |
| npm.cmd run build | 通过；Vite 13.77 秒 |

### 实现与关键文件

- 保留 services/neuronMath.ts 的 activate/computeNeuron 作为 T03～T05 函数值共同核心；采样改用 plotSampling.ts 的有界插值，不建立第二套激活值实现。
- 新增 activationMath.ts：四函数数学导数、defined/undefined 联合类型、有限向量、真实采样与切线；Sigmoid/Tanh 的小导数使用数值稳定等价表达式。
- 新增 affineMath.ts、gradientChain.ts、mathDisplay.ts：仿射合并和 ReLU 对照、1～8 层标量链式法则、符号/幅度/对数/下溢区分、科学记数显示。极小因子下溢保留对数，后续大因子可恢复可表示乘积。
- 新增 visualizations/activation/CartesianPlot.tsx、GradientPlot.tsx：SVG 采样曲线、真实切线、当前点、ReLU 空心端点与断线，梯度幅度图和键盘选择层。
- 新增 experiments/activation/ 的 AffineExplorer、DerivativeExplorer、GradientExplorer、ActivationComparison、ActivationChallenges、useInputSweep、definitions、challenges、display：五个模块、暂停/减少动态效果、五组预设、四项可验证挑战；复用 T03 QuizRenderer/judgeAnswer，使用独立 QuizProvider。
- 新增 pages/ActivationLaboratory.tsx、styles/activation-lab.css，App.tsx 按需加载独立 /laboratory/activation；保留原神经元及无效实验路由。
- 更新 experiments/catalog.ts、ExperimentCard、Laboratory 的正式入口及旧查询跳转；新增 entryLabel 不改变旧预览或 neuron 入口。
- 更新 lessons/catalog.ts、content.ts，新增 contents/activationGuide.ts；复用 gradients-backprop 稳定 ID 和原 contentKey，只添加适量激活/梯度引导；Lessons 添加进入实验并返回来源课时的入口。
- 更新阶段标记，新增 tests/unit/activation-lab.test.mjs、tests/activation-lab.spec.ts，将单元文件接入 package.json；没有新增依赖或后端。
- 更新 README、ARCHITECTURE、TASKS、PROJECT_OVERVIEW 与本日志，保留此前有效历史记录。

课程保持 5 门/9 章/16 课时。neuron-forward 完整示范教材不变，gradients-backprop 从占位升级为短篇引导，其余 14 节仍为占位。课程版本更新为 2026.10.t05；LearningProvider、localStorage 键与 schemaVersion 1 未改，旧课时完成记录继续有效。

### 数学边界与验收修正

ReLU 在 ±0 的数学导数返回未定义及左右斜率，不采用优化器次梯度约定，不画唯一切线。遇到未定义局部导数时，链式模拟提示“连乘暂不可判定”，不将其误说成复合函数必然不可导。精确零不执行 log(0)；非零极小量与浮点下溢分别标识，图高表示绝对值，颜色表示梯度正负。

光滑点采用中心差分验证解析导数，涵盖 Linear、ReLU 正负半轴、Sigmoid、Tanh；不使用中心差分证明 ReLU 零点可导。多层链式结果也与 Tanh 复合函数的数值导数比较。预设增加 Sigmoid 权重补偿对照，说明权重与激活导数共同决定传播，不断言某函数总导致梯度消失。

首轮新增单元测试 72/73 通过，剩余测试误将 Course[] 传入需要 Lesson[] 的正文关联校验器；修正测试输入后 73/73 通过。课程关联本身有效，没有删除失败用例。

首轮新增浏览器验收 27/30 通过，三项失败为同一精度断言在三种视口的重复：预期 Sigmoid(2) 被手工截短至 0.8807970779，却要求 10 位小数精度。改用完整 1/(1+exp(-2)) 表达式后，专项 3/3 通过（6.6 秒）；实际函数值未被改成截短结果。

人工截图检查后，增大坐标标注并为窄屏曲线增加可聚焦的局部横向滚动，避免将 SVG 整体缩得过小；未聚焦跳转主内容链接增加裁切隐藏，键盘聚焦仍能访问。B 区说明随当前函数/曲线模式更新。截图仅用于 QA，不参与网站显示。

### 最终实际结果

按要求依次执行 typecheck、test、test、build，实际结果如下；包含 T01～T04 全部既有回归，没有跳过失败用例。

| 命令/检查 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过，严格检查源代码、配置和浏览器测试 |
| npm.cmd run test 第一次最终执行 | 73/73 单元 + 111/111 浏览器全部通过；浏览器约 1.8 分钟 |
| npm.cmd run test 连续第二次最终执行 | 73/73 单元 + 111/111 浏览器全部通过；浏览器约 1.8 分钟 |
| npm.cmd run build | 通过，包含再次类型检查；Vite 4.48 秒，无大包提醒 |
| 数学验证 | 四函数值/导数、光滑点中心差分、ReLU ±0 未定义、极端输入、向量/采样/切线、仿射等价与非线性、链式法则及浮点容限均通过 |
| 梯度边界 | 正负/绝对值区分、精确零、局部未定义、下溢对数保留及后续大因子恢复、权重补偿对照均通过 |
| 浏览器交互 | 四函数切换、输入/导数/切线同步、播放/暂停/编辑停止、减少动态效果、1～8 层与权重/偏置、真实梯度数据和图一致、键盘查看层、同步比较均通过 |
| 挑战与集成 | 四项挑战正确/错误/重试/解析/容限、挑战与学习记录隔离、教材进入返回与完成记录保持、旧查询和安全来源、刷新及 T04 神经元实验均通过 |
| 布局与运行错误 | 320/390/768/1440px 均无整体横向溢出；窄屏曲线/表格仅局部滚动；验收未发现 pageerror 或 error 级控制台消息 |
| 截图与人工查看 | screenshots/t05/ 保存三种视口的导数/梯度/比较模块共 9 张；人工查看桌面与手机导数、梯度、比较布局，改善后复查手机导数区 |

最终构建新增激活实验 JavaScript 35.42 kB（gzip 12.55 kB）、CSS 7.48 kB（gzip 2.14 kB）；入口 JavaScript 274.75 kB（gzip 89.33 kB）。课程、神经元实验与 KaTeX 继续按需/共享加载，字体本地输出。没有新增依赖或最终未修复的测试/构建失败。

### 当前范围与限制

仅实施 T05。五个模块是函数/导数和标量复合链式法则教学，没有损失函数、参数梯度、完整多层神经网络、自动微分、反向传播训练、优化器或模型训练；T06 未实施。

实验参数和独立答题状态在离开实验页或刷新后重置，界面已说明；课时完成/最近学习仍持久化。采用 JavaScript 浮点计算，极端值可舍入/下溢，但状态和对数幅度不与精确零混淆。ReLU 零点的复合函数不额外代数化简。手机使用 Chromium 视口模拟，真实手机、Safari 和 Firefox 尚未验证；本地进度的同源/跨设备限制沿用 T02。

测试开发服务由 Playwright 自动启动和清理；日常使用需按 README 启动并保持终端运行。执行环境的本地进程权限不代表用户需要管理员权限；颜色环境变量提示不影响测试。后续建议只作为独立任务：扩大真实设备验收、补充课时正文、按明确需求设计实验状态持久化，本次不实施。

T05 已完成并验证。停止开发，等待下一条指令，不实施 T06。

## T06：多层神经网络与训练实验室（2026-10-12，Asia/Shanghai）

### 开发前检查与基线

阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG，检查 T03 结构化正文/渲染器、T04 neuronMath、T05 activationMath/gradientChain、参数组件、实验目录/路由和 LearningProvider。T01～T05 的实际工程存在且基线通过，无前置功能阻塞。增量开发原项目，没有重新初始化，没有修改 sources/，没有新增依赖。

| 修改前命令 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过 |
| npm.cmd run test:unit | 73/73 通过；约 1.18 秒 |
| npm.cmd run test:e2e | 111/111 通过；约 1.9 分钟 |
| npm.cmd run build | 通过；Vite 5.62 秒 |

### 实现范围与文件

- 新增 services/mlp/：类型、矩阵、模型/种子初始化、分层前向、MSE/BCE、手写反向、不可变 SGD、单步训练、数值检查、二维网格。复用 T04 激活值和 T05 解析导数。
- 新增 experiments/neural-network/：配置、分批训练 Hook、当前模型检查、逐层前向、快照反向、张量矩阵、损失实验、可运行梯度核对和主工作台。
- 新增 visualizations/neural-network/：全部真实权重连接/节点 SVG、真实有限损失历史、模型概率热图与 XOR 标签。
- 新增 pages/NeuralNetworkLaboratory.tsx、styles/neural-network-lab.css；App.tsx 按需加载 /laboratory/neural-network。
- 修改 experiments/catalog.ts、Laboratory：第三座正式实验入口，保留原预览、T04/T05 和旧查询跳转。
- 新增 lessons/contents/networkTraining.ts；content.ts 注册 loss-training 与扩展后的 gradients-backprop。LessonRenderer 的块级实验链接统一保留来源课时；Lessons 增加训练入口。
- 目录稳定 ID/5 门课程/9 章/16 课时不变，版本更新为 2026.10.t06。LearningProvider、progress 存储键、schemaVersion 1 和手动完成/撤销均未改。保留 T05 主课时关联，训练不自动完成课程。
- 新增 tests/unit/mlp.test.mjs、tests/neural-network.spec.ts；package.json 接入单元文件。更新 Header/Sidebar 阶段标记和 README/ARCHITECTURE/TASKS/PROJECT_OVERVIEW/本日志。

12 项路线按本次要求明确：T01～T05 保留已完成历史，T06 为本次开发，T07 Token/Embedding，T08 Attention，T09 Transformer 架构，T10 Mini Transformer 训练/推理，T11 论文/代码映射，T12 AI 导师/集成优化。旧日志不删除，TASKS 记录计划变更。

### 数学实现与已执行专项验证

采用列向量，W 为 n×m，b/z/a/delta 为 n×1，dW 由 delta 与上一层输出外积得到；批量损失/参数梯度都取一次平均。MSE 为平方误差，不乘 1/2。Sigmoid+BCE 从 logit 计算稳定 softplus 损失，合并 delta 与同一目标一致，端点 dL/dŷ 超出有限表示时明确标记。ReLU 零点训练次梯度 0 与 T05 的“数学导数未定义”分开。具体公式与张量规则见 ARCHITECTURE。

默认 2→4→1、隐藏 Tanh、输出 Sigmoid、Xavier uniform/零偏置、种子 42、BCE、学习率 0.5、批量 4、2000 次更新：

| 检查 | 实测 |
| --- | --- |
| 初始化全 XOR 平均 BCE | 0.9018187121766812 |
| 2000 次 SGD 后全 XOR 平均 BCE | 0.0013607311397600688 |
| [0,0] → 标签 0，预测概率 | 0.0007512941876291948 |
| [0,1] → 标签 1，预测概率 | 0.9984963615069318 |
| [1,0] → 标签 1，预测概率 | 0.9986168139321204 |
| [1,1] → 标签 0，预测概率 | 0.0018008109545269327 |
| 以概率 ≥0.5 分类 | 4/4 正确 |
| 默认初始网络中心差分参数数 | 17 个；ε=10⁻⁵ |
| 默认初始网络最大绝对梯度误差 | 1.392139181710661×10⁻¹¹ |
| 默认初始网络最大相对梯度误差 | 6.206680784806074×10⁻⁸ |

实际训练在纯核心和三个浏览器视口独立执行，预测与损失相同。光滑点梯度检查覆盖 Linear/Sigmoid/Tanh/ReLU 正区间、1/2 个隐藏层、MSE/BCE，以及 MSE 的四种输出激活；ReLU 零点和跨零扰动不作为普通差分通过项。

### 验收修正

首轮新增单元 18/19 通过，差异是权重外积产生 -0 而严格比较预期 0；仅在新矩阵核心规范化有限零值，保持旧数学模块不变，随后 19/19 通过。补充 SVG 实际数据、四输出激活梯度和发散状态不可变测试后，全项目 95/95 单元通过。

首轮桌面新增浏览器验收 8/9 通过；失败是测试误将新正文描述当作保留的课时标题。改为保留标题“损失函数与模型训练”，并另查新增 MLP 教材标题，随后三视口专项 27/27 通过（51.9 秒），未删除或跳过失败项。

人工截图复查发现负权重透明点击区域的 CSS 优先级低于负权重配色，造成可见连线过粗。提高点击区域透明样式优先级，并加入正/负权重点击区域计算样式断言。补充 2→8→8→1、Linear/MSE、学习率 2 的真实发散用例：前三步有限，下一步溢出应停止且保持原模型/记录，不显示 NaN 或虚假成功。最终完整回归在这些修正之后执行。

补充发散用例后的首次完整浏览器回归 138/141 通过（3.1 分钟）；三个失败均为同一脚本定位错误：单步后状态为 paused，按钮名是“继续训练”，脚本仍查找“连续训练”。修正后该用例三视口专项 3/3 通过（9.7 秒），实际模型在 Step 3 后溢出中止、保留有限状态且可恢复默认。随后重新执行完整工程检查，没有通过扩大超时、删用例或跳过断言掩盖失败。

随后一次完整回归仍为 138/141（2.9 分钟）：三个快速往返/训练控制场景功能断言通过，但错误日志检查捕获 Maximum update depth exceeded。临时调用栈诊断与重复专项 7/9 确认警告来自连续 tick 的 React 状态提交。修复为低优先级训练显示、控制操作立即同步最新有效状态；移除前向步骤的冗余 Effect，以模型 Step 派生重置；MathFormula 仅在错误状态变化时 setState，减少频繁矩阵排版的被动更新链。数学计算与误差回退语义不变。移除临时诊断代码，保留全部控制台错误断言后，三个视口各重复三次的专项 **9/9 通过（38.0 秒）**；再执行下述完整工程验收。

### 最终实际结果

最后一次按序执行 typecheck、test:unit、test:e2e、build；以下均为全部修正之后的实际结果，未跳过失败项。此前 T01～T05 的 73 项单元/111 项浏览器测试全部包含，T06 新增 22 项单元/30 项浏览器验收。

| 命令/检查 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过，严格检查源代码、配置与浏览器测试 |
| npm.cmd run test:unit | **95/95 通过**，0 失败/跳过；约 1.22 秒 |
| npm.cmd run test:e2e | **141/141 通过**，0 失败；约 2.9 分钟 |
| npm.cmd run build | 通过，包含再次类型检查；Vite **7.77 秒**，无大包提醒 |
| 核心数学 | 矩阵运算/维度、分层/多层前向、共用激活、MSE/BCE 值/梯度、批量平均、多层反向、四种 MSE 输出、中心差分、ReLU 约定、SGD、种子及非法参数通过 |
| 默认 XOR | 三视口均实际训练 2000 步，损失和四个概率与纯核心一致，4/4 分类正确，未填入预设预测或曲线 |
| 状态与检查 | 单步、连续、暂停/继续/停止、上限、学习率/批量、结构/种子/损失重置、曲线清空、历史/快照上限、固定快照与当前状态区分通过 |
| 发散与生命周期 | 真实溢出中止并保留有限状态、恢复默认、训练中离开页面/再进入无后台旧任务和运行错误通过；额外重复专项 9/9 |
| 可视化 | SVG 节点/连接与权重/梯度一致、键盘检查、透明点击区域、真实 Loss 点、625 个当前模型概率样本及最后采样 Step 一致 |
| 教材与旧功能 | 两节结构化教材、公式、课时往返/完成保持、旧实验查询与 T04/T05、T01 页面/导航/404、T02 存储、T03 代码/复制/测验等全部回归通过 |
| 布局 | 320/390/768/1440px 无整页横向溢出；矩阵/图形/表格自身滚动，减少动态效果下可用 |
| 浏览器错误 | 最终新增验收检查 pageerror 与 error 级 console，未发现严重运行错误；没有过滤更新警告 |
| 截图 | screenshots/t06/ 三视口各保存网络、反向矩阵、初始阶段曲线/边界、训练后曲线/边界，共 12 张；人工查看桌面与手机的网络及训练后绘图，修复连线后复查 |

最终构建：新增训练实验 JS 47.17 kB（gzip 16.36 kB）、CSS 8.38 kB（gzip 2.30 kB）；入口 JS 275.65 kB（gzip 89.56 kB）、课程 JS 63.80 kB（gzip 25.46 kB）。训练页按需加载，共享 KaTeX/数学/曲线组件，没有新运行依赖、图表库或远程服务。

执行环境的一次自动进程权限审核超时，按工具提示重试后成功运行完整浏览器验收；没有将未执行检查记为通过。颜色环境变量提示不影响测试；测试开发服务器由 Playwright 启动并清理，日常使用仍需按 README 自行启动并保持终端运行，不需要管理员权限。

### 已知限制与后续建议

未发现阻碍 T06 验收功能使用的已知问题。界面限定 2 输入/1 输出、1～2 隐藏层、每层最多 8 个神经元，最多 5000 次更新，只提供基础 SGD。默认预设已验证收敛，其他种子/结构/超参数可能不收敛；XOR 四训练样本成功不代表泛化已验证。计算为浏览器 JavaScript 浮点数，溢出明确中止，模型/曲线/快照只在当前页面保存。

移动端使用 Chromium 模拟视口；真实手机、Safari 和 Firefox 尚未验证。课时进度继续使用原 localStorage，跨设备和同源限制不变。截图仅用于验收，网站由真实 React/SVG/数学计算渲染。

下一阶段建议作为独立任务：按 T07 开展 Token/Embedding，复用教材块与 SVG；补充真实设备验收，按实际需求设计实验状态导出/保存。本次未实现这些后续功能，也没有自动微分、CNN/RNN/Transformer 训练、Python 后端或远程 AI API。

**T06 已完成并验证。停止开发，等待下一条指令，不实施 T07。**

## T07：Token、Embedding 与位置编码实验室（2026-10-13，Asia/Shanghai）

### 开发前检查与基线

已阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG，检查课程正文/目录、LessonRenderer、学习进度、实验目录/路由、T06 矩阵工具及共用绘图。工程中 T06 完整存在；增量开发，没有重建、删除旧功能或修改 sources/。

| 修改前命令 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过 |
| npm.cmd run test:unit | 95/95 通过，约 1.56 秒 |
| npm.cmd run test:e2e | 141/141 通过，约 3.1 分钟 |
| npm.cmd run build | 通过，Vite 13.90 秒 |

兼容方案：T06 的矩阵工具有 1～8 维限制，不足以承载词表。把原矩阵乘法与有限数校验提取到 tensorMath；T06 保留原尺寸检查后调用共同核心，T07 使用最多 64×64 的规则矩阵。激活、损失、反向、训练逻辑没有另建或改写，旧 XOR 收敛和梯度检查仍在回归中执行。

### 实现与关键文件

- services/language/tokenization.ts：三种真实分词、Unicode 字素、原文来源区间与教学尺寸限制。
- vocabulary.ts：固定四个特殊 Token、稳定双向 ID、UNK、One-Hot、自定义词表校验。
- representation.ts：可编辑 E、教学/固定种子初始化、实际矩阵乘法查表证明、PE、曲线与逐项相加。
- similarity.ts：点积/余弦/欧氏距离，完整维度的真实逐项计算，零向量余弦为 null。
- pipeline.ts：统一一次计算的 tokens/mappings/ids/hot/vectors/pe/input/shapes，版本化真实 JSON 导出。
- services/tensorMath.ts 与 mlp/matrix.ts：共用乘法、有限性/规则矩阵保护，同时保持 T06 API 和限制。
- experiments/language/：LanguageWorkbench、A～G 七个模块、MatrixView、数值草稿与 Token 控件。
- visualizations/language/PositionHeatmap.tsx：实际 PE 值驱动的可访问 SVG 热图；函数曲线复用 CartesianPlot。
- pages/LanguageRepresentationLaboratory.tsx、styles/language-lab.css：独立按需加载路由、安全来源返回、响应式/键盘操作和局部滚动。
- lessons/contents/languageRepresentation.ts：Token/Embedding 与位置编码两节正文、公式/符号解释、生活类比/数值实例、三道练习和实验入口。
- App、实验目录、Laboratory、Lessons、课程目录/正文注册、Header/Sidebar：接入第四座正式实验室，保留旧路由/查询预览。
- tests/unit/language.test.mjs、tests/language.spec.ts：新增 29 项单元与 30 项浏览器验收，package.json 接入现有测试命令，没有新增依赖。
- README、ARCHITECTURE、TASKS、PROJECT_OVERVIEW、本日志：更新用法、纯计算接口/扩展、实际状态；保留以前的开发和计划变更记录。

课程仍为 5 门、9 章、16 个稳定课时 ID。升级 embedding/position-encoding 正文，现有 5 节结构化教材、11 节占位；版本为 2026.10.t07。LearningProvider、progress 存储键、schemaVersion 1、完成/撤销和最近学习机制未改。实验和随堂练习不自动完成课程。

### 数学与流水线实测

默认文本 I love learning、空格分词，词表 V=36，ID=[4,5,6]，d_model=8：

| 中间结果 | 实际形状/数值 |
| --- | --- |
| One-Hot | 3×36；每行恰好一个 1 |
| E | 36×8；未训练教学预设 |
| One-Hot×E 与 Lookup | 全词表 ID 逐项比较一致，整句乘法与查表一致 |
| 句子 Embedding / PE / X_input | 均为 3×8 |
| E[4] | [-0.25,0.25,0.75,-1,-0.5,0,0.5,1] |
| PE(pos=0) | [0,1,0,1,0,1,0,1] |
| X_input 第 0 行 | [-0.25,1.25,0.75,0,-0.5,1,0.5,2] |
| PE(pos=1,d=4) | [sin(1),cos(1),sin(0.01),cos(0.01)] |
| A=[1,2]，B=[2,1] | 点积 4、余弦 0.8、距离 √2，数值容差验证 |
| 零向量余弦 | 未定义，明确显示提示 |
| 空句子 | ID/矩阵均为空数组，显式形状 [0,d]，不制造填充行 |

PE 按原论文 第 3.5 节 的 sin/cos 对计算，列索引 j 对应 i=floor(j/2)，位置从 0 开始，角度弧度。原论文 第 3.4 节 的 Embedding×√d_model 在当前实验中不额外应用，界面/教材/导出明确记录 embeddingScale=1。没有将教学/随机向量宣传为训练得到的语义，未计算 QKV 或 Attention。

默认流水线通过直接运行 TypeScript 核心打印，并在浏览器真实下载的 JSON 中再次核对。每一步可展开输入/输出及类型/形状；上游变化同步重算并重置步骤，无效文本不显示旧序列矩阵。数值草稿与有效参数分开。独立 PE 预览窗口不会使句子相加形状失配。

### 验收修正与专项结果

首轮 124/124 单元通过。浏览器脚本直接引用 node:fs/promises 缺少项目中的 Node 类型声明，改用 Playwright 下载读取流检查真实 JSON，没有为测试引入依赖，严格类型检查通过。

首轮桌面专项 4/10 通过，五项失败是同一个步骤按钮可访问名称缺少空格的定位问题，一项为 Node 与 Chromium 的 cos(0.1) 末位相差约 10⁻¹⁶。定位改为正确的可访问名称，三角函数断言采用 10⁻¹² 级容差，不改变实际数学结果。修正后全部三视口专项 **30/30 通过，47.1 秒**；没有删除、跳过失败场景或忽略浏览器错误。

补充稀疏数组边界：规则矩阵、词表特殊项、ID 序列中的缺失元素均安全拒绝。首轮完整最终验收包含 124 项单元及 171 项浏览器回归；运行结束的 .last-run.json 为 passed、failedTests=[]。期间会话继续后原进程输出无法恢复，因此再次执行全部四个工程命令并保存完整日志，以最后一轮可复查记录作为最终报告。

人工查看桌面与手机的分词、Embedding、位置编码及最终流水线截图，确认原文高亮、矩阵内部滚动、成对曲线/热图和窄屏单列布局。三视口共 12 张截图位于 screenshots/t07/；页面由真实 React/SVG/计算生成，截图不参与网站展示。

### 最终验收

2026-10-13 最后一轮按以下顺序执行，原始结果保存至 [validation/t07/](validation/t07/README.md)。四个命令均退出 0；日志转换为 UTF-8 无 BOM 文本，未改写测试结果。

| 命令 | 实际结果 | 退出码 |
| --- | --- | --- |
| npm.cmd run typecheck | 严格类型检查通过 | 0 |
| npm.cmd run test:unit | 124/124 通过；0 失败、0 跳过，1811.2458ms | 0 |
| npm.cmd run test:e2e | 171/171 通过，约 3.4 分钟 | 0 |
| npm.cmd run build | 通过；Vite 11.89 秒 | 0 |

相对基线新增 29 项单元、30 项浏览器验收，原有 95 项单元与 141 项浏览器回归全部保留并通过。浏览器包含三个项目（桌面/平板/手机）和 T07 每个页签在 320/390/768/1440px 下的整体溢出检查；严重 pageerror/console error 断言通过。路由刷新、教材往返和学习进度持久化通过。语言实验按需加载 JS 34.82kB（gzip 12.92kB），无构建失败或大包提醒；没有新增依赖。

T07 已完成并验证，开发停止，等待下一条任务；未实施 T08。

### 范围与已知限制

本阶段只完成语言表示。文本最多 256 个 Unicode 码点、32 个 Token；词表最多 64 项、d_model 为 2～16 偶数，超限拒绝而不静默截断。Unicode 字素依赖现代浏览器 Intl.Segmenter；没有 BPE/WordPiece/SentencePiece 训练或大型预训练模型。

教学、随机、手工向量都未训练；相似度只说明数学关系。前两维图不能代表完整语义空间。JSON 只导出，不支持导入、状态持久化或自动接入未来 Attention。实验配置离开/刷新重置，页签局部选择重新进入时恢复默认，共同文本/E 在页内切换保留；课时学习进度仍按 T02 持久保存。

移动验收使用 Chromium 模拟 320/390/768/1440px，真实手机、Safari、Firefox 尚未实测。所有数值为 JavaScript 浮点，界面显示舍入，计算和导出保留原精度。现有本地进度的同源/跨设备限制不变。

下一阶段建议仅作为独立 T08 规划：以版本化 [n,d] 输入接口接入 Attention，先定义维度/数值校验和数学测试；另外补充真实设备验收。本任务没有开始这些后续实现。

## T08：Attention 核心机制实验室（2026-10-13，Asia/Shanghai）

### 开发前检查与基线

阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG；检查 T07 exportPipeline/完整流水线、T06 matrix 与共享 tensorMath、实验目录/路由、教材注册表/校验/QuizProvider、既有单元和 Playwright。T07 实际实现与记录一致，无需补建前置模块。原 sources/ 只读，没有重新初始化项目或删除旧课程。

修改前按序运行四个命令，baseline-results.json 退出码均为 0：

| 命令 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过 |
| npm.cmd run test:unit | 124/124，1621.1008ms，无失败/跳过 |
| npm.cmd run test:e2e | 171/171，约 3.4 分钟 |
| npm.cmd run build | 通过，Vite 10.32 秒 |

### 实现与兼容方案

- 共用 tensorMath.matrixProduct/finite/tensorShape，不改写 T06/T07 乘法或训练逻辑。services/attention/math.ts 新增适用于最多 32 Token 的转置/缩放、投影、逐行稳定 Softmax、显式 Mask、贡献、多头/Concat/WO、固定种子初始化与边界检查。
- services/attention/input.ts 直接复用 T07 导出 v1；shape[1] 就是 d_model，不再分词或添加 PE。校验版本/类型、Token/ID/形状/有限值/大小，保存独立最近一份输入。读取坏数据保留原文并提示回退；用户显式操作才写入或清除，未触碰 T02 键。
- experiments/attention/AttentionWorkbench 统一有效配置及 memo 结果，七模块按页签显示；不重复为图形生成另一套矩阵。非法草稿不污染计算。上游修改停止播放、回到第 1 步；改变不兼容维度/Head 会明确重建参数。
- AttentionMatrix/MatrixEditor、QKVExplorer、AttentionSteps、SoftmaxExplorer、ContributionExplorer、MultiHeadExplorer、MaskExplorer：矩阵展开/选中编辑、元素点积、九步、实际分布条形图、Value 分解、多头独立编辑、真实因果遮罩。
- visualizations/attention/AttentionHeatmap.tsx：真实权重 SVG 热图、完整数值 title、点击/键盘选择、Token 连线；与贡献表共用 query/key 和结果。
- neuron/useForwardPlayer 增加可选总步数（默认 6，T08=9），沿用代次/定时器/暂停/速度/卸载清理；T04 六步行为仍由旧测试检查。
- pages/AttentionLaboratory、styles/attention-lab.css、App：按需加载新路由，合法来源课时或 T07 返回；attention 旧预览升级，旧查询兼容仍由目录驱动。其他实验/预览保留。
- T07 PipelineExplorer 最后一步添加传递链接：校验/存储成功才跳转；失败明确提示。JSON 导出原结构不变，T07 原单元和浏览器用例保留。
- lessons/contents/attention.ts：attention-math、attention、multi-head、decoder-mask 四节结构化正文，含中文直觉、类比边界、公式、数值、思考题与入口。最后一个只讲 Mask，不声称完成 Decoder；稳定 ID/contentKey/层级未改。
- challenges.ts 提供六个 QuizBlock，答案由共用数学构造，判定复用 judgeAnswer。独立 QuizProvider 保留页内挑战状态，刷新/离开清空，不自动完成课程。
- Header/Sidebar 阶段标记、实验目录、Lessons 关联入口、README/架构/任务/项目概览/数学文档已接入 T08，没有新增依赖。

仍为 5 门课程、9 章、16 个稳定课时；当前 9 节结构化（含 Mask 引导）、7 节占位，版本 2026.10.t08。LearningProvider、本地 progress 键/schemaVersion 1 及开始/完成/撤销/最近记录保持兼容。

### 数学实测与约定

详细公式、形状与协议见 [ATTENTION_MATH](ATTENTION_MATH.md)。默认 X=[[1,0,1,0],[0,1,0,1],[1,1,0,0]]、单位投影，Scores=[[2,0,1],[0,2,1],[1,1,2]]，缩放因子 1/2。第 0 行权重约 [0.506480391,0.186323723,0.307195886]，输出约 [0.813676277,0.493519609,0.506480391,0.186323723]；单元使用独立指数参考核对。

Softmax 在每行的可见项上减最大值再取指数。概率行和用浮点容差验证；未来权重严格断言等于 0。全 Mask 行抛出明确未定义错误，不制造均匀分布。Masked Scores 用 null 表示排除项并显示 −∞；有限矩阵不含 Infinity。测试还验证平移不变、极端有限分数、溢出拒绝及稀疏数组。

贡献 terms[j][c]=Weight[i,j]×V[j,c]，各项和与同一份 Output 一致。多头 dk=dv=d_model/h，各 Head 独立投影/缩放/Mask，Concat 按列连接，右乘 WO。改变一头的单元测试验证另一头完整结果不变，但组合输出更新。种子初始化与矩阵分配均可重复且独立。这里没有论文真实训练模型、参数梯度、优化器或 Attention 训练。

### 开发中验收与修正

新增 27 项数学/协议/渲染单元。首轮 147/151 通过，4 项失败来自同一教材块：形状题选项 ID 以数字开头，违反原有合法 ID 规则。改为 shape-3x4 等稳定合法 ID；没有放宽旧校验器。之后 151/151 通过，无跳过。

首轮桌面浏览器 10/12 通过。两项为测试断言问题：步骤按钮可访问名称含空格；原 LearningProvider 初始化空 records，不等于完全没有存储键。修正定位和断言，保留实际数学/课程逻辑。随后三项目专项 **36/36，58.1 秒**，没有删除或跳过场景。包含全部模块、真实 T07 输入传递、刷新恢复、课程往返、六项挑战、键盘与 320/390/768/1440px 溢出检查。新增文件为 tests/attention.spec.ts，保留旧全部测试。

人工查看桌面贡献页、手机 QKV/贡献页；矩阵/图形内部滚动，热图、连线和贡献数值一致。截图仅用于 QA，不参与页面展示。

首轮完整工程检查：151/151 单元（1101.6045ms）、207/207 浏览器（4.0 分钟）、类型检查和 Vite 构建（7.01 秒）均通过。视觉 QA 发现未聚焦“跳到主要内容”链接在长元素截图中可见，沿用既有激活实验的 clip-path 隐藏规则到全局样式，聚焦仍正常显示；同时将 decoder-mask 描述明确为仅 Mask 引导。补充 32×16 最大输入、8 Head、320px 局部滚动和挑战页签状态保留测试，最终再跑四个工程命令。

补充后完整检查：151/151 单元、210/210 浏览器（4.2 分钟）、类型检查及构建（6.91 秒）均通过。复核第 5/6 步公式，将关闭缩放时的展示改为恒等变换，Mask 公式明确采用与实际表格一致的 1/0 可见性；增加四种缩放/Mask 配置的 KaTeX 单元核对和浏览器开关公式同步断言。最终固定代码后再按要求顺序执行四个命令，以下方最终记录为准。

### 最终工程验收

固定最终代码后按序实测，四项退出码均为 0：

| 命令 | 最终实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 通过，严格类型检查 |
| `npm.cmd run test:unit` | 151/151，1053.689ms，0 失败、0 跳过 |
| `npm.cmd run test:e2e` | 210/210，4.1 分钟，桌面/平板/手机三项目 |
| `npm.cmd run build` | 通过，Vite 7.15 秒 |

相对基线新增 27 项单元、13 个浏览器场景×3 项目=39 项；原 124 项单元和 171 项浏览器验收保留并通过。覆盖九步/公式同步、QKV 修改、Softmax、热图/贡献、多头独立参数/Concat/WO、Causal 未来权重严格为 0、六挑战、T07 实际导入/刷新、教材往返与 T02 历史记录；还检查最大 32×16 输入/8 Head、键盘与减少动画。320/390/768/1440px 没有整页横向溢出，未捕获严重浏览器运行错误。人工复看更新后的手机贡献截图，跳转链接显示问题已消除。

实际退出码见 [results.json](validation/t08/results.json)，无 ANSI 的 UTF-8 日志与基线见 [验收记录](validation/t08/README.md)，截图在 screenshots/t08/。全部页面继续由组件与真实计算渲染，截图只供 QA。**T08 已实现并验证；完成后停止，T09 未开始。**

### 限制与后续建议

只支持二维、同序列 Self-Attention，不含批量、Padding Mask UI、Cross-Attention、Dropout、完整 Encoder–Decoder 或训练。数学核心支持显式自定义 Mask，界面只开放无 Mask/Causal。随机/教学参数未训练，Heatmap 不能当作词义理解或完整模型解释。

教学上限 n≤32、表示/投影列≤16，T07 输入表示维度为正偶数，h≤8 且整除。单头与多头参数独立；多头始终使用标准缩放。只持久化最近导入的 X，手动编辑/权重/播放/挑战刷新后重置；明确提示恢复或回退，不暗中依赖路由内存。浏览器存储同源/跨设备限制沿用 T02。

浏览器使用 Chromium 模拟视口，真实手机、Safari、Firefox 尚未验证。数值使用 JavaScript 浮点，展示舍入但计算不提前舍入。T09 可复用纯 Attention 接口，在独立任务中先定义残差/归一化/FFN 的形状和数值测试，再组装完整架构；本任务没有开始 T09。

## T09：Transformer 完整架构实验室（2026-10-13，Asia/Shanghai）

### 开发前检查与基线

阅读 README、ARCHITECTURE、TASKS、DEVELOPMENT_LOG，检查 T08 attention/multiHead/Mask/Softmax、T07 表示与流水线、共用 tensorMath、T03 LessonRenderer/内容注册、实验目录/路由及原测试。现有 T01～T08 实际实现存在，前置模块不阻塞。

references/ 不存在 attention_is_all_you_need.pdf，仅有论文链接；通过 arXiv HTML 原文第 3.1～3.5 节核对结构，未虚称读取本地 PDF。记录使用 Post-LN、三子层 Decoder、共享 Embedding/输出投影和 √d_model 缩放；epsilon=1e-5 是本教学明确约定，不推断论文未写明的实现默认值。

修改前依次运行四个命令，baseline-results.json 均为 0：

| 命令 | 实际结果 |
| --- | --- |
| npm.cmd run typecheck | 通过 |
| npm.cmd run test:unit | 151/151，1032.7071ms，无失败/跳过 |
| npm.cmd run test:e2e | 210/210，4.1 分钟 |
| npm.cmd run build | 通过，6.46 秒 |

### 增量实现与兼容

- services/transformer/math.ts：复用 tensorMath/activate/T08 primitives；FFN、逐 Token LayerNorm、残差 Post-LN、矩形 Cross、多层 Encoder/Decoder。
- T08 attention 原接口仍要求等长 Self-Attention；T09 独立适配 crossAttention/multiCross，复用转置/缩放/稳定 Softmax/Concat/乘法。Encoder/Self Decoder 直接用原 multiHead，未改 T06～T08 数学模块。
- model.ts：配置/完整形状校验、独立种子参数、共享 E、T07 Token/Embedding/PE 接入、显式 √d 缩放、完整前向、真实 Top-K、参数白名单与不可变编辑。所有值有限检查，不裁切成假预测。
- flow.ts：同一真实结果派生有序 TensorStep，默认 24 步，可追踪所有层、来源、形状、公式和去向。公式常量复用，保留 FFN/Norm/Attention 内部缓存。
- TransformerWorkbench 与五个视图：A 架构与前向，B 三类 Attention/Head，C FFN/Norm，D 全部参数选择编辑，E 真实 Logits/概率/Top-K。上游编辑停止播放/重置；结构/词表/种子重建参数，非法草稿保留有效值，无效文本隐藏过期结果。
- ArchitectureGraph 据真实 dependencies 绘制分支、残差及最终 Memory→Cross，紫色旁路也包含 PE 等分支，说明文字明确区分；点击或键盘选择模块，图形内部缩放/滚动。矩形 Heatmap 每格来自真实权重，选择展示分数/Mask/贡献。
- pages/TransformerLaboratory、App、catalog：新增 /laboratory/transformer，兼容旧 experiment 查询；来源限定 attention-laboratory 或有效 lessonId，其余安全回退 transformer，不执行外部跳转。T08 新入口返回 T08。刷新恢复默认教学模型并提示。
- lessons/contents/transformer.ts：FFN/Norm、Encoder、Decoder 和完整 Transformer 四节正文，含数值例子、公式、思考题、右移/Teacher Forcing 引导和链接。Decoder 保留原 Mask 块 ID、测验与主 T08 入口，再扩充完整结构；其他三节主关联 T09，原 LessonRenderer 继续渲染。
- 目录版本 2026.10.t09，稳定 16 个课时 ID/顺序不变，当前 12 节结构化、4 节占位。LearningProvider/localStorage 键/schemaVersion 1 均不变；T08 输入缓存也未改。无新依赖、后端、预训练模型或 T10 训练。

### 数学实测

新增 27 项数学/追踪测试首次 27/27（436.1903ms），合并旧回归 178/178（1483.477ms）。覆盖用户要求的全部 25 类：FFN 共享逐位置、ReLU、残差、LayerNorm 总体方差/gamma/beta/零方差、Encoder/Decoder 堆叠、不同长度 Cross、Causal/未来隔离、Embedding 缩放/PE、共享投影、Softmax、固定种子、独立层、非法维度/非有限值及上游重算。

手工 FFN：输入 [1,2] → 第一仿射 [1,4,3] → ReLU 同值 → 输出 [5,6]；输入 [-1,0] → [-1,2,-3] → [0,2,0] → [1,1]。LayerNorm [1,3] 的均值 2、方差 1；零方差 [10,10] 标准化为 [0,0]。T09 等长 multiCross(X,X) 与 T08 multiHead(X) 完整结果相同。

完整默认前向 Source IDs=[4,5,6]、Target IDs=[2,7]，Memory=3×8、Decoder Output=2×8、Logits/Probabilities=2×16；行和 [1,0.9999999999999999]。最后位置 Top-1“我”概率 0.16439207694129057，只是未训练结果，不能解释为正确语言输出。完整实际矩阵和步骤见 [default-forward.json](validation/t09/default-forward.json)。

同模型三层 Encoder/Decoder，比较 [BOS,我,爱] 和 [BOS,我,AI]，前三层前两位置最大绝对差分别 [0,0,0]；18 个未来权重逐个严格为 0。单元还核对延长前缀不改变旧位置，最大 12/12 长度、16 维、4 头、3/3 层、FFN64 的概率有限且归一化。不强制添加 Python/PyTorch 后端或交叉验证依赖。

### 浏览器与视觉修正

新增 13 个场景，桌面首次全部通过（22.5 秒）。截图测试初次引入 Node 文件模块导致缺少 Node 类型声明，改用原有 Playwright 相对路径直接生成截图，没有增加依赖；随后类型检查通过。

首轮全量 178/178 单元（1179.9937ms）、249/249 浏览器（4.6 分钟），类型检查与构建（7.27 秒）通过。截图复核发现某些 JSX 静态 LaTeX 字面量把双反斜线原样传给 KaTeX，虽未报错却产生普通字母/换行。改为统一 TypeScript 公式常量，增加 Attention 分数 MathML、Norm 公式/希腊字母、输出概率公式实际注释断言；公式专项 27/27（522.9218ms）。没有放宽测试或数学判定。

默认 13 个场景覆盖三项目，合计 39 项新浏览器验收；保留原 210 项。包含所有参数/层数/维度、完整/逐步/播放/暂停/上游重置、矩阵/FFN/Norm/三类 Attention、多头、真实概率/Top-K、Mask 隔离、T08/教材往返、历史完成记录、刷新/输入错误、键盘/减少动画、最大教学配置，以及每个模块在 320/390/768/1440px 的整体溢出检查。

### 最终工程验收

按序执行最终四项命令，实际退出码均为 0：

| 命令 | 最终实际结果 |
| --- | --- |
| `npm.cmd run typecheck` | 严格类型检查通过 |
| `npm.cmd run test:unit` | 178/178，1052.2771ms，0 失败/跳过 |
| `npm.cmd run test:e2e` | 249/249，4.6 分钟 |
| `npm.cmd run build` | 通过，Vite 7.21 秒 |

保留原 151 单元和 210 浏览器，新添 27 单元与 13 场景×3 项目=39 浏览器；所有测试均实际执行。新公式的 MathML/注释断言通过，复看更新后的桌面 Attention 与手机概率截图，分数/转置显示正确。图形/矩阵内部滚动，320/390/768/1440px 无整页横向溢出，未捕获严重 pageerror/console error。旧 T01～T08 与学习进度回归通过；最大教学配置、参数更新、未来隔离与权重共享通过。

实际退出码 [results.json](validation/t09/results.json)，基线/最终 UTF-8 日志见 [验收记录](validation/t09/README.md)，实际默认前向矩阵见 [default-forward.json](validation/t09/default-forward.json)。三视口各四张 QA 截图在 screenshots/t09/，网站没有使用截图充当交互。**T09 已完成并验证，开发停止；未实施 T10。**

### 已知限制与下一阶段

仅浏览器二维小矩阵前向。源/目标各 1–12，词表 4–32，模型维度/层数受教学配置限制；空序列/PAD 拒绝，不实现 Padding Mask、批量、不同源/目标词表、权重非共享变体、训练、自动生成或 KV Cache。Dropout 固定 0，默认 ReLU/Post-LN。教学初始化不保证词义或译文正确。

状态只在实验组件内，离开/刷新重置；不保存无限历史。课程完成记录仍由 T02 持久保存。数字为 JavaScript 浮点，显示舍入但计算不舍入；无法表示的中间结果明确报错。移动验收为 Chromium 模拟，真实手机、Safari、Firefox 尚未验证。

T10 建议在独立任务中先约定序列右移、Padding Mask、交叉熵和参数梯度，再做小模型中心差分验证、固定种子训练与受控生成；当前 TensorStep 用于解释前向，不是自动微分图。本次没有实施这些训练功能。
