# Transformer Learning Lab

面向神经网络零基础学习者的 Transformer 交互式学习实验室。

当前已实现并验证 **T09：Transformer 完整架构实验室**。保留 5 门课程、9 个章节、16 个稳定课时 ID 与 T02 本地进度；12 节接入结构化教材，其余 4 节仍为占位。新增真实 Post-LN Encoder–Decoder 前向、FFN、LayerNorm、矩形 Cross-Attention、共享 Embedding/输出投影与概率检查。T01～T08 功能保留，没有新增依赖；没有实施 T10 Transformer 训练、自动微分、任意代码执行或后端。无账号、Docker、付费服务或外部字体依赖；安装完成后，本地页面可离线运行，论文外链除外。实际测试结果见开发日志。

## Windows 本地启动

准备 Node.js 22.12+（22 系列）或 Node.js 24+、npm，以及可选的 VS Code。推荐 Node.js 24 LTS。使用普通用户终端，无需管理员权限。

在 `Transformer-Learning-Lab` 目录打开终端：

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

首次安装需要连接 npm 仓库。浏览器访问终端显示的地址，默认 http://127.0.0.1:5173 。端口占用时 Vite 会选择下一个端口。按 Ctrl+C 停止。

如果 PowerShell 提示禁止运行 `npm.ps1`，将命令中的 `npm` 改成 `npm.cmd`，无需修改执行策略或管理员权限。

### 手机在局域网中访问

电脑和手机连接同一个可信 Wi-Fi。在 `frontend` 目录运行：

```powershell
npm.cmd run dev:lan
```

手机打开终端中显示的 `Network` 地址，例如 `http://电脑的局域网IPv4地址:5173/`，不要使用 `127.0.0.1`、`localhost` 或 `0.0.0.0`。端口以终端输出为准；电脑地址可用 `ipconfig` 查看当前 Wi-Fi 网卡的 IPv4 地址。

启动后保持电脑、终端和网络连接开启。如果 Windows 弹出 Node.js 防火墙提示，在可信网络上允许“专用网络”访问。仍无法连接时，检查访客 Wi-Fi 的设备隔离、VPN 和防火墙设置；不要关闭整个防火墙。开发服务器用于本地和可信局域网调试，不需要配置公网端口转发。

## 检查、构建与预览

均在 `frontend` 目录运行：

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

构建产物在 `frontend/dist`。预览默认 http://127.0.0.1:4173 。使用 HTTP 服务器运行，不直接双击 `dist/index.html`。

开发服务器与 Vite 预览服务器支持单页应用路径回退，因此 `/lessons` 等地址可直接访问和刷新。未来使用其他静态服务器时，需将未知文件请求回退到 `index.html`，交由 React Router 显示页面或 404。

## 当前功能

| 路由 | 页面 | 功能 |
| --- | --- | --- |
| `/` | Dashboard | 欢迎区、继续学习、模块卡片、课程进度 |
| `/lessons` | Lessons | 课程列表、章节树、课时状态、按层级展开目录 |
| `/lessons/:lessonId` | Lesson | 结构化教材或兼容占位内容、本节目录、先修关联、上一节/下一节、手动完成与撤销 |
| `/laboratory` | Laboratory | 神经元、激活与梯度、神经网络训练、语言表示、Attention 与 Transformer 架构入口，其他实验占位预览 |
| `/laboratory/neuron` | Neuron Laboratory | 1～5 个输入、动态图形、逐步计算、激活曲线与三项挑战 |
| `/laboratory/activation` | Activation & Gradient Laboratory | 非线性、切线、1～8 层标量链式法则、同步比较与四项挑战 |
| `/laboratory/neural-network` | Neural Network Training Laboratory | 小型 MLP、矩阵前向、手写反向传播、SGD、XOR、损失曲线与决策边界 |
| `/laboratory/language-representation` | Language Representation Laboratory | Unicode 分词、词表/ID、One-Hot、可编辑 Embedding、向量相似度、PE 与八步输入矩阵流水线 |
| `/laboratory/attention` | Attention Mechanism Laboratory | QKV 投影、九步计算、缩放/Softmax、热图/贡献、多头 Concat/WO、Causal Mask 与六项挑战 |
| `/laboratory/transformer` | Transformer Architecture Laboratory | 真实 Post-LN Encoder–Decoder、FFN/Norm 检查、独立参数编辑、张量流/架构图、三种 Attention 与输出概率 |
| `/paper` | Paper | 论文简介、目录、原文链接、交互区域预留 |
| `/progress` | Progress | 总体与各课程完成率、已完成/待学习课时、最近访问与完成时间 |
| 其他 | 404 | 说明及返回首页 |

旧课程链接 `/lessons?lesson=embedding` 会跳转到 `/lessons/embedding`，保留 T01 的六个课时 ID。直接访问或刷新合法课时可正常加载；无效课时显示友好的错误页，不产生学习记录。实验预览仍支持 `?experiment=vector`；`/laboratory?experiment=neuron`、`?experiment=activation` 与 `?experiment=neural-network` 跳转到对应正式实验并保留合法来源课时。无效实验 ID 提供友好提示与返回入口。

进度使用 React Context 与 localStorage，首次从 0 开始，不再使用 T01 的假进度。打开课时记录为“学习中”，只有手动标记才会完成；可以撤销完成，刷新与重新打开同一浏览器均保留记录。“继续学习”回到最近访问的课时，无记录时进入第一课。

存储键为 `transformer-learning-lab.progress`，采用 `schemaVersion: 1` 和独立课程版本字段。元数据与学习记录分开；会过滤无效 ID、错误状态和日期，损坏 JSON 会恢复为空白进度并显示提示。暂不支持的未来版本保留原数据，不覆盖。浏览器拒绝存储或空间不足时显示保存限制，页面仍可使用。

记录限定于当前浏览器和站点来源：不同设备、浏览器、IP、域名或端口的记录不互通。例如 `localhost:5173` 与 `127.0.0.1:5173` 属于不同存储空间。清理浏览器站点数据会删除记录；没有账号或云同步。课时预计时长仅为目录规划，不是学习计时。

桌面侧栏常驻，平板/手机使用抽屉导航。支持键盘焦点反馈、Escape 关闭、焦点返回、跳转主要内容和减少动态效果偏好。

## 目录

```text
Transformer-Learning-Lab/
├─ frontend/
│  ├─ src/
│  │  ├─ components/      # Sidebar、Header、Navigation、ProgressBar 等
│  │  ├─ layouts/         # 通用应用布局
│  │  ├─ pages/           # 主页面、教材/实验详情与 404
│  │  ├─ lessons/         # 类型、层级目录、独立正文、校验与查询索引
│  │  ├─ experiments/     # 神经元、激活、MLP、language/、attention/、transformer/ 的交互
│  │  ├─ visualizations/  # SVG 神经元/网络结构、函数/梯度/损失与决策边界
│  │  ├─ services/        # 共用数学、mlp/language/attention/transformer 纯计算与版本化存储
│  │  ├─ store/           # 学习状态与持久化接入
│  │  ├─ styles/          # Tailwind 及响应式样式
│  │  ├─ App.tsx          # 路由声明
│  │  └─ main.tsx         # 应用入口
│  ├─ index.html
│  ├─ package.json
│  ├─ package-lock.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  └─ playwright.config.ts
├─ backend/               # 仅预留说明
├─ references/            # 论文链接
├─ docs/                  # 验收与工程说明
├─ tests/                 # Node 单元测试与浏览器验收
├─ .gitignore
└─ README.md
```

## 技术与依赖

React 19、TypeScript 5.9（strict）、Vite 7、Tailwind CSS 4（Vite 插件）、React Router 7、Lucide React。T03 新增 KaTeX 0.19.0 和 PrismJS 1.30.0，分别用于本地数学排版与 Python/C 高亮。开发测试使用 Playwright、Node 内置测试器和 tsx 4.23.15；tsx 只用于加载单元测试中的 TypeScript/TSX，不参与页面运行。具体版本以 `frontend/package.json` 为准，`package-lock.json` 锁定完整依赖树。所有文件使用 UTF-8。

公共组件只负责展示与基础交互，课程/实验目录独立维护，学习状态集中管理。`services` 没有虚假后端 API；后端目录不包含可执行服务。

新增课时须在 `src/lessons/catalog.ts` 添加稳定 ID 的元数据，在 `src/lessons/content.ts` 注册对应 `contentKey` 的正文资源，并保持先修依赖无循环。正文可为独立结构化文件或旧占位格式。显示顺序由每一层的正整数 `order` 决定，不由 ID 或数组位置决定。详细规则及内容块、符号注释、测验与交互组件的扩展步骤见 `docs/ARCHITECTURE.md`。

## 阅读 T03 示范教材

开发服务器启动后打开 http://127.0.0.1:5173/lessons/neuron-forward ，或在课程目录中选择《神经元是什么？从一个数学公式开始》。原课时 ID 保持为 `neuron-forward`，T02 的完成记录继续有效。

- 数学公式由 KaTeX 排版；支持行内、独立公式、矩阵、分数、上下标、希腊字母和多行表达式。点击或用 Tab 聚焦公式下方的符号按钮查看解释，Escape 关闭。
- 调整 x、w、b 的滑块或数字输入，实时计算 y = wx + b。默认 2、3、1 得到 7；范围为 -10～10。非法草稿会显示说明并保留上次有效结果；可恢复默认值。
- Python/C 标签可点击或使用方向键切换，展示语法高亮与行号。复制按钮提供明确反馈；剪贴板不可用时显示手动复制文本框。同 Wi-Fi 手机通过普通 HTTP 访问时可能没有剪贴板权限，可使用该回退方式。
- 三道随堂题包含单选、多选和带绝对误差容限的数值题，提交后显示反馈与解析，支持重做。答题记录由独立 QuizProvider 按课时/内容块 ID 管理，在页面内切换课时后仍保留，刷新后清空。课时完成状态仍由 LearningProvider 保存至 localStorage，答对或答错都不会自动完成课时。

示范正文位于 `frontend/src/lessons/contents/neuron.ts`，包含学习目标、生活类比、公式解释、参数演示、代码、向量扩展、三道练习和总结。该示范课时不执行代码或训练模型；训练在独立 T06 实验页进行。

## 使用 T04 神经元实验室

启动后打开 http://127.0.0.1:5173/laboratory/neuron ，或在实验室列表点击“进入神经元实验室”。示范课时下方的“进入完整神经元实验室”携带课时 ID，实验中的“返回原课时”可返回教材；刷新仍可加载该地址。端口以实际启动输出为准。

- 设置 1～5 个输入，每项输入、权重和偏置均可通过滑块或数字框修改，范围 -10～10。非法草稿保留上次有效计算并显示说明。可以恢复默认 2 × 3 + 1 = 7、填入教学示例，或用整数种子重复生成参数。
- SVG 展示输入、权重及乘积、加权求和与偏置、激活和输出。正/负/零权重分别使用蓝色、橙色、灰色虚线；点击、Tab 聚焦或 Enter/空格选择节点查看解释。图形支持 100%～200% 缩放，手机采用纵向布局，放大后仅图形区域滚动。
- 通过上一步/下一步或自动播放观察六步前向传播，高亮与当前公式同步；支持暂停、重置和 0.5×/1×/2× 速度。修改参数会立即停止播放并回到第 1 步。系统“减少动态效果”设置会关闭图形动效，仍可查看所有计算步骤。
- 切换 Linear、ReLU、Sigmoid、Tanh；曲线使用同一数学核心真实采样，当前点显示 z 与 y。计算保留浮点精度，界面最多显示 6 位小数。
- 三项挑战分别预测线性输出、预测负值的 ReLU 输出，以及调整固定输入的权重/偏置使输出接近 6。目标和判定保存在独立数据模块；只有“提交检查”会判定，探索区操作不会完成挑战。反馈包含数学解释，支持重新挑战。

实验参数与挑战状态仅保留到离开实验页或刷新前；课程完成状态继续使用原 LearningProvider/localStorage，挑战不会修改学习进度。T03 的轻量演示和完整实验调用共同的纯数学核心，没有重复计算实现。扩展激活函数、示例和挑战的方法见 `docs/ARCHITECTURE.md`。本次没有新增依赖。

## 使用 T05 激活与梯度实验室

启动后打开 http://127.0.0.1:5173/laboratory/activation ，或从实验列表点击“进入激活与梯度实验室”。课程 `/lessons/gradients-backprop` 的“学习关联”也提供入口；来源通过 `?from=gradients-backprop` 保留，点击“返回原课时”可返回教材。课时 ID 和原学习记录不变。

- **A 非线性**：调整两次仿射变换的权重、偏置和验证输入，对比等效一层的真实输出；可加入 ReLU，观察曲线形状。参数退化时也可能重合，不把非线性等同于一定更好。
- **B 导数与切线**：选择 Linear/ReLU/Sigmoid/Tanh，滑块、数字框和可暂停扫描联动函数值、导数、当前点与切线。可切换导数曲线。ReLU 在零点显示“未定义”和左右斜率，不绘制唯一切线、不使用优化器次梯度约定。减少动态效果时禁用自动扫描，保留手动操作。
- **C 梯度传播**：设置 1～8 层标量复合函数，每层可修改权重、偏置；查看 z、h、局部导数、局部因子与累计输入梯度。预设包含 Sigmoid/Tanh 饱和、ReLU 负半轴、Linear 对照，以及 Sigmoid 权重补偿。曲线高度表示绝对值，颜色区分正负；可切换线性/对数幅度，精确零单独标记，不计算 log(0)。点击或键盘选择梯度点查看该层。
- **D 同步比较**：勾选一个或多个函数，共用输入区间和坐标尺度，切换函数值/导数，查看范围、饱和区、不可导点与梯度特点。
- **E 四项挑战**：预测输出、预测导数、判断饱和区、比较链式梯度；显式提交、中文解析、浮点容限和重试复用 T03 测验模块。

T05 复用 T04 的 `activate` / `computeNeuron`，没有第二套函数值实现。计算使用完整浮点值，界面将极小量显示为科学记数；导数与连乘的下溢保留符号、对数幅度并明确标识。若局部导数未定义，提示链式公式条件不足，不据此断言整个复合函数不可导。数学定义、扩展规则见 `docs/ARCHITECTURE.md`。

实验参数与挑战在离开页面或刷新后重置；挑战使用独立 QuizProvider，不修改课程完成状态。仅计算输出对输入的标量导数，没有损失求导、参数梯度、自动微分或训练。手机纵向布局，曲线、公式和表格必要时在各自区域滚动；没有新增运行依赖。

## 使用 T06 神经网络训练实验室

启动开发服务器后访问 http://127.0.0.1:5173/laboratory/neural-network 。也可从实验列表或 `/lessons/loss-training` 的“进入神经网络训练实验室”打开；`/lessons/gradients-backprop` 后半节的关联实验同样保留来源，点击“返回原课时”可返回。端口以终端输出为准。

- **结构配置**：二维输入、单输出；1～2 个隐藏层，每层 1～8 个神经元。选择隐藏/输出激活、损失及整数随机种子；查看所有权重连接，点击或 Tab + Enter/空格选中节点/连接，检查输入、z、a、b、权重和单样本梯度。
- **前向与反向**：按层展开输入列向量、W、b、z、a 及形状。当前模型计算与图形共用缓存；反向面板区分单样本 delta 与真实训练批平均 dW/db，展开参数更新前后矩阵、损失定义和链式法则。
- **训练控制**：单步、连续、暂停、继续、停止、重置；修改学习率、批量和更新上限会暂停并保留模型，结构、种子或损失变更会明确提示并重新初始化。无效数字草稿保留上次有效设置。计算溢出时停止，保留最后提交的有效状态，不伪造收敛。
- **真实记录**：曲线记录更新后的全 XOR 平均损失，保留最近 300 点，鼠标或滑块可查看。详细快照保留最近 12 步，也可固定额外一份查看；当前模型、历史曲线和选中快照独立标识。清空曲线不重置模型。二维边界由当前模型在 25×25 网格上前向采样，最多每 150ms 更新一次；不适用的输出类型明确提示。
- **梯度检查**：暂停后点击“运行数值梯度检查”，比较每个参数的手写梯度与中心差分；ReLU 零点/跨零扰动跳过普通检查。T05 的 ReLU 数学导数仍为未定义；T06 训练单独采用零点次梯度 0。

默认 XOR 预设为 **2→4→1、隐藏 Tanh、输出 Sigmoid、BCE、种子 42、Xavier uniform 权重/零偏置、学习率 0.5、批量 4、2000 次 SGD 更新**。批量按固定顺序循环取样；一个 Step 是一次参数更新，一个 Epoch 是完整处理四个样本。默认 full batch 下两者相同。已实际验证默认配置可以收敛；其他种子、结构和超参数不保证成功。

MSE 定义为单输出 `(ŷ−y)²`，不乘 1/2；批量损失和梯度均取平均。BCE 与 Sigmoid 组合，以 logit 的稳定 softplus 表达式计算损失，合并求导与损失定义一致。数学模块复用 T04 的激活值和 T05 的解析导数，没有自动微分或深度学习框架。

模型、训练曲线和快照不跨刷新/离开保存；T02 课时进度持久化保持原样。训练分批让出主线程，可随时暂停/停止，卸载取消任务；没有位移动画，尊重现有减少动态效果设置。手机单列布局，网络图、矩阵和表格必要时仅自身区域滚动。张量约定、公式、扩展方法及实际测试结果见 `docs/ARCHITECTURE.md` 和 `docs/DEVELOPMENT_LOG.md`。

## 浏览器验收

在 `frontend` 目录执行：

```powershell
npx.cmd playwright install chromium
npm.cmd run test:unit
npm.cmd run test:e2e
# 或一次运行所有测试
npm.cmd test
```

首次需要下载免费测试浏览器，无需安装系统依赖或管理员权限。测试会自动启动本地开发服务器，或复用 5173 端口的已有服务器。覆盖桌面 1440×1000、平板 768×1024、手机 390×844，检查全部页面、刷新、横向溢出、运行错误、课时路由、课程导航、持久化状态、存储恢复、实验入口与 404。每项浏览器测试有独立存储，不会重置日常使用的浏览器记录。

T03 浏览器验收进一步覆盖公式排版、符号键盘操作、真实参数计算与边界输入、三种测验、Python/C 切换、实际剪贴板复制及失败回退、T02 历史记录兼容和 320px 窄屏溢出检查。测试详情与实际结果见 `docs/DEVELOPMENT_LOG.md`。历史 T01 验收保留在 `docs/T01-acceptance.md`；截图位于 `docs/screenshots/t02/` 与 `docs/screenshots/t03/`，网站使用 React 组件渲染，不用截图代替页面。

T04 增加数学边界、稳定激活函数、SVG 数据与采样精度、固定挑战目标及浮点容限的单元测试；浏览器覆盖参数同步、六步播放/暂停/重置、挑战、教材往返、旧查询兼容、减少动画、键盘与缩放。实验截图位于 `docs/screenshots/t04/`。

2026-10-11 T04 最终验证：`npm.cmd run typecheck` 通过；按要求连续执行两次 `npm.cmd run test`，每次均为 **55 项单元 + 81 项浏览器验收全部通过**，浏览器部分各约 1.6 分钟；`npm.cmd run build` 通过，Vite 6.38 秒，无大包提醒。包含 T01～T03 回归、新增 14 项单元和 27 项浏览器验收。未发现阻碍 T04 使用的已知问题；移动验收使用 Chromium 模拟视口，尚未验证真实手机、Safari 或 Firefox。实际使用需自行启动并保持开发服务器运行。

T05 新增 18 项数学/数据/渲染单元测试和 30 项浏览器验收，检查解析导数的中心差分验证、ReLU 零点、极端输入、仿射等价性、链式梯度符号/零值/下溢、挑战、课程往返及 320/390/768/1440px 无整体横向溢出。截图位于 `docs/screenshots/t05/`，仅用于验收。T05 最终完整结果见 `docs/DEVELOPMENT_LOG.md`。

2026-10-12 T05 最终验证：`npm.cmd run typecheck` 通过；连续两次 `npm.cmd run test` 均为 **73 项单元 + 111 项浏览器验收全部通过**，浏览器各约 1.8 分钟；`npm.cmd run build` 通过，Vite 4.48 秒。未发现阻碍当前功能使用的问题；实验状态不跨刷新保存，移动端验收仍使用 Chromium 模拟，真实手机及其他浏览器尚待验证。T05 完成后停止，未实施 T06。

2026-10-12 T06 最终验证：按序执行 `npm.cmd run typecheck`、`npm.cmd run test:unit`、`npm.cmd run test:e2e`、`npm.cmd run build`，均通过；**95/95 单元、141/141 浏览器验收**，浏览器约 2.9 分钟，Vite 构建 7.77 秒。包含 T01～T05 全部回归，新增 22 项单元和 30 项浏览器验收。默认 XOR 训练 2000 步后 BCE 为 **0.001360731**、四样本分类全对；初始网络 17 参数中心差分最大绝对误差 **1.39214×10⁻¹¹**。训练快速往返的更新警告已修复，三视口各重复三次专项也全部通过。320/390/768/1440px 无整体横向溢出，截图位于 `docs/screenshots/t06/`。历史修正过程和完整结果见开发日志。

T06 没有已知阻碍验收功能使用的问题。范围仍限定二维输入、单输出的小型 MLP；模型/快照不跨刷新保存，其他超参数不保证收敛。真实手机、Safari、Firefox 尚未验证。下一阶段建议在独立任务中开展 T07 Token/Embedding，并补充真实设备验收；本次完成后停止，未实施 T07。

## 使用 T07 语言表示实验室

以上 T01～T06 验收与阶段边界作为历史保留。T07 在现有工程中增量加入，访问：

- 实验：`http://127.0.0.1:5173/laboratory/language-representation`。
- Token/Embedding 教材：`/lessons/embedding`。
- 位置编码教材：`/lessons/position-encoding`。

两个课时均保留原稳定 ID，通过原 LessonRenderer 渲染。点击“进入语言表示实验室”携带来源课时，实验的“返回原课时”可以返回；刷新正常。学习进度键和 schemaVersion 1 不变，实验不会自动完成课时。

七个页签支持点击、方向键、Home/End：

| 模块 | 操作与计算 |
| --- | --- |
| A 文本分词 | 输入短句、英文/中文预设，比较空格、Unicode 字素和固定最长匹配子词；选 Token 高亮原文片段 |
| B 词表与 ID | 每行编辑一项词表，双向查找、高亮句子使用项，明确显示 UNK；空表保留四个特殊 Token，重复项拒绝 |
| C One-Hot | 选择 ID 查看真正的指示向量、长度、非零位置与条形图 |
| D Embedding | 选择 Token/维度编辑元素，检查 V×d 的矩阵及句子表示，验证 One-Hot×E 与查表一致；固定种子初始化/恢复教学矩阵 |
| E 向量比较 | 点积、余弦和欧氏距离，逐项计算与前两维投影；零向量余弦明确未定义 |
| F 位置编码 | 设置独立预览长度、pos、列索引，比较两个位置，查看公式、真实曲线、热图、矩阵及当前句子的逐元素相加 |
| G 完整流水线 | 八步查看输入/运算/输出/类型/形状，前后切换或直达，最终可导出真实 JSON |

上方文本、Tokenizer、d_model 与词表/Embedding 是共同计算配置；修改后立即重算下游并回到流水线第 1 步。非法数字草稿保留上次有效值；文本超限时隐藏不可用的下游序列结果，不显示旧矩阵。应用新词表或更改 d_model 会明确重建教学 E；预览 PE 长度与句子长度分开，句子相加始终使用相同形状。数值计算不提前舍入，界面显示约 6 位小数。

默认句子 `I love learning`，词表大小 V=36，ID=[4,5,6]，d_model=8。One-Hot 为 3×36、E 为 36×8，句子 Embedding/PE/最终输入均为 3×8。位置 0 的最终行是 `[-0.25,1.25,0.75,0,-0.5,1,0.5,2]`，来自真实 E 第 4 行加 `[0,1,0,1,0,1,0,1]`。JSON 导出包含 schemaVersion=1、Token 顺序、ID、shape、完整精度 values、positionStart 与 embeddingScale；没有导入功能。

PE 严格采用[原论文第 3.5 节](https://arxiv.org/html/1706.03762v7#S3.SS5)的成对 sin/cos。原论文第 3.4 节还将 Embedding 乘 √d_model；本实验为观察可编辑数值，不额外缩放 E，界面、教材和导出均标明。教学/随机/手工编辑矩阵均未训练，向量相似度不代表词义关系。空格分词不适用于所有语言；固定子词教学规则不是 BPE/WordPiece/SentencePiece。

尺寸上限：256 个 Unicode 码点、32 个 Token、64 项词表（含四特殊项）、2～16 正偶数维度。空句子产生 0 行矩阵。所有计算在浏览器本地完成，没有大模型、后端或远程 API；没有新增依赖。矩阵和图形内部滚动，支持键盘和减少动态效果。实验配置在离开/刷新时重置，各页签局部选择在重新进入该页签时回到默认值，共同数据仍保留到离开页面。

扩展说明见 `docs/ARCHITECTURE.md`；T07 实际测试、修正及已知限制见 `docs/DEVELOPMENT_LOG.md`。验收截图位于 `docs/screenshots/t07/`，只用于 QA。T08 及后续仍未开发。

2026-10-13 T07 最终验证：按序执行 `npm.cmd run typecheck`、`npm.cmd run test:unit`、`npm.cmd run test:e2e`、`npm.cmd run build`，退出码均为 0。**124/124 单元通过（无跳过）、171/171 浏览器验收通过（约 3.4 分钟）**，Vite 构建 **11.89 秒**。新增 29 项单元与 30 项浏览器用例，包含旧功能全回归；320/390/768/1440px 无整页横向溢出，无严重浏览器运行错误。完整 UTF-8 日志和退出码见 `docs/validation/t07/`。没有已知阻碍 T07 使用的问题；真实手机、Safari、Firefox 尚未验证，其他限制见上文。T07 完成后停止，未实施 T08。

## 使用 T08 Attention 核心机制实验室

以上阶段停止说明保留为历史。T08 增量开发，新增 `http://127.0.0.1:5173/laboratory/attention`，或从实验列表点击“进入 Attention 实验室”。独立打开无保存输入时使用 `I love AI` 的 3×4 教学 X。

| 模块 | 操作 |
| --- | --- |
| A Q/K/V | 展开三套权重、点击元素/按行列索引编辑；点击 Q/K/V 元素检查输入行与参数列的真实点积 |
| B 逐步计算 | 九步查看 X、投影、Kᵀ、分数、缩放、Mask、逐行 Softmax、Value 混合和输出；上/下一步、播放、暂停、重置与速度 |
| C Softmax/缩放 | 编辑分数与 dk，比较缩放前后分布；也可查看当前 Query 的原始分数 |
| D 注意力/贡献 | 选择 Query、点击或键盘选择 Heatmap，查看权重来源、Token 连线及逐项 Weight×Value 求和 |
| E Multi-Head | 选择头数/Head，独立编辑投影，查看各头 QKV、热图、输出、Concat 与可编辑 WO 的投影 |
| F Causal Mask | 实际排除未来 Key，核对 Mask、Masked Scores 和严格为 0 的未来权重 |
| G 挑战 | 六道数值/多选/形状题，浮点容差、解析、重试；与课时完成状态分离 |

全局可调 d_model、单头 dk/dv、种子、单头缩放与全局 Causal。维度/头数改变会明确重建不兼容参数；上游修改暂停播放并回到第 1 步。非法输入草稿保留上次有效结果。多头每头按标准 √dk 缩放，和单头的缩放对照开关分开。

T07 的“完整流水线”第 8 步新增“将当前矩阵传入 Attention 实验室”：复用原导出 v1，校验后保存 Token 顺序、ID、shape（含 d_model）和真实 X 到独立 localStorage。T08 刷新恢复 X 并提示投影参数/步骤重置。也可在 T08 粘贴已导出的 JSON；损坏、未知版本、无效形状或存储受限明确提示，不覆盖当前有效输入。无缓存/读取失败时回退默认。空 T07 序列不能计算 Attention。

只保存最近一份导入输入，最多 32×16、偶数表示维度、JSON 65536 字符，输入元素绝对值≤10000。页面内手动修改 X/参数不自动覆盖导入缓存。恢复默认输入会显式清除导入键。课程进度继续使用原 T02 存储，挑战不完成课时。存储只在当前浏览器同源内有效。

教材入口：`/lessons/attention-math`、`/lessons/attention`、`/lessons/multi-head`、`/lessons/decoder-mask`。四节保持原 ID；最后一节仅升级 Mask 引导，完整 Decoder 未开发。教材使用原 LessonRenderer，可进入实验并返回来源课时。从 T07 进入可返回语言表示页，T07 配置仍按原设计离开后重置。

数学、形状、Softmax/Mask 与协议详见 [ATTENTION_MATH](docs/ATTENTION_MATH.md)，扩展和测试说明见架构/开发日志。所有计算在浏览器本地完成，没有新增依赖、训练、自动微分、远程 API 或完整 Encoder–Decoder。教学/随机权重未训练，不能用热图宣称已经理解词义，也不能把 Attention 权重直接等同于完整解释。T09 尚未实施。

2026-10-13 T08 最终验收：按序执行 `npm.cmd run typecheck`、`npm.cmd run test:unit`、`npm.cmd run test:e2e`、`npm.cmd run build`，退出码均为 0。**151/151 单元测试（1053.689ms）、210/210 浏览器测试（4.1 分钟）全部通过**，无失败或跳过；Vite 构建 7.15 秒。包含原 124 项单元与 171 项浏览器回归，以及新增 27 项单元、39 项浏览器验收；检查 320/390/768/1440px、键盘、减少动画、最大 32×16 输入/8 Head、T07 传递刷新、T02 进度兼容。实际日志见 [T08 验收记录](docs/validation/t08/README.md)。移动端为 Chromium 模拟，真实手机、Safari、Firefox 尚未验证；手动权重/步骤/挑战不跨刷新保存。**T08 完成并停止，T09 未开始。**

## 使用 T09 Transformer 架构实验室

以上 T08 范围/停止说明保留为历史状态。按新任务在原工程增量接入 T09，访问 [Transformer 架构实验室](http://127.0.0.1:5173/laboratory/transformer)。从实验列表、T08 顶部或教材可进入，返回原来源页面；刷新恢复默认教学模型，并明确提示。页面不需要先访问 T07/T08。

默认：**Encoder 1 层、Decoder 1 层、d_model=8、Heads=2、d_k=d_v=4、d_ff=16、ReLU、Post-LN、epsilon=1e-5、Dropout=0、种子 42**。Source 为 `I love AI`，Target Prefix 为 `[BOS] 我`；源长度 3、目标长度 2，教学共享词表 V=16。

| 页签 | 使用方式 |
| --- | --- |
| A 架构与前向 | 24 个默认真实张量步骤；点击模块或选择步骤、上/下一步、完整前向、播放/暂停/速度/重置，查看输入/输出、形状、公式与去向 |
| B 注意力 | 选择层、Encoder Self / Decoder Masked Self / Cross 及 Head；查看矩形热图、QKV/分数/Mask/权重/贡献/Concat |
| C FFN 与 Add & Norm | 展开两次仿射与 ReLU、点击 FFN 输出元素检查点积；查看残差、均值、方差、标准化与 gamma/beta |
| D 参数编辑 | 选矩阵/向量、选元素编辑，所有层/Head/Norm 独立；共享 E 编辑同时影响源、目标和输出投影 |
| E 输出概率 | 逐位置 Logits/概率、完整目标词表、Top-K、最后前缀位置及概率行和 |

层数各 1–3，d_model=4/8/16，Heads=1/2/4，FFN=8/16/32/64。Source/Target 用空格分隔各 1–12 个 Token，未知词使用 UNK；教学词表最多 32 项，拒绝 PAD。可修改词表、固定种子重新初始化、恢复默认。结构/词表/种子改变会明确重建参数，上游变化立即暂停播放并重置步骤；非法草稿保留有效值，无效文本隐藏过期结果。

源/目标共用 E，前向显式乘 √d_model 后加 T07 PE；输出投影为实时 Eᵀ。T07 原未缩放演示不变。Encoder Memory 来自真实堆叠输出；Cross 的 Q 来自目标隐藏状态、K/V 来自 Memory，支持不同序列长度。Decoder 有三个子层和三个 Post-LN，未来位置权重严格为 0。

教材：`/lessons/ffn-residual-norm`、`/lessons/encoder`、`/lessons/decoder-mask`、`/lessons/transformer`。FFN、Encoder、完整 Transformer 三节由占位升级为正文，Decoder 在原 Mask 引导后补充完整结构；原 ID/顺序与 T02 存储不变。Decoder 保留主 T08 入口，在正文新增 T09 链接；其他三节提供主 T09 入口。

数学、形状、权重共享、Tensor Flow 及扩展方法见 [Transformer 架构说明](docs/TRANSFORMER_ARCHITECTURE.md)。实验只保留当前配置，离开/刷新重置，课时进度仍持久保存。没有 Transformer 训练、自动生成、Padding Mask、KV Cache 或预训练模型；随机概率不能当作正确翻译。实际测试结果见 [T09 验收记录](docs/validation/t09/README.md)。

2026-10-13 T09 最终按序执行 `npm.cmd run typecheck`、`npm.cmd run test:unit`、`npm.cmd run test:e2e`、`npm.cmd run build`，四项退出码均为 0。**178/178 单元（1052.2771ms）、249/249 浏览器（4.6 分钟）通过**，无失败/跳过，Vite 构建 7.21 秒。保留原 151 项单元与 210 项浏览器回归，新增 27 项单元与 39 项浏览器验收。三层 Decoder 未来隔离每层最大差 [0,0,0]；320/390/768/1440px 无整页横向溢出，未捕获严重运行错误。真实手机、Safari、Firefox 尚未验证。完整默认矩阵见 [default-forward.json](docs/validation/t09/default-forward.json)。**T09 完成并停止，等待下一条任务，T10 未实施。**
