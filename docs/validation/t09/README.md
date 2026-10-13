# T09 验收记录

日期：2026-10-13，Asia/Shanghai；命令在 frontend 执行。

开发前重新实测：typecheck 通过，151/151 单元（1032.7071ms），210/210 浏览器（4.1 分钟），Vite 构建 6.46 秒。baseline-results.json 四个退出码均为 0。

新增 27 项数学测试首次全部通过（436.1903ms），与旧测试合计 178/178 通过。桌面新增 13 个浏览器场景全部通过（22.5 秒）；测试截图辅助人工检查，页面本身使用真实 React/SVG 数值。

开发中的类型检查发现新增截图测试引用 Node 模块但项目不含对应类型，改为沿用原测试的 Playwright 相对输出路径，没有添加无用依赖；之后类型检查通过。

视觉复核发现 JSX 字面量公式重复反斜线造成静默排版错误，改为共用 TypeScript 公式常量，并增加分数 MathML、LayerNorm 希腊字母/公式注释与概率公式断言。修正后重新执行最终全量工程检查，以最终日志为准。

最终按序运行四项工程命令：

| 命令 | 实际结果 | 日志 |
| --- | --- | --- |
| `npm.cmd run typecheck` | 退出 0，严格检查通过 | [typecheck.txt](typecheck.txt) |
| `npm.cmd run test:unit` | 退出 0，178/178，1052.2771ms，0 失败/跳过 | [unit.txt](unit.txt) |
| `npm.cmd run test:e2e` | 退出 0，249/249，4.6 分钟 | [e2e.txt](e2e.txt) |
| `npm.cmd run build` | 退出 0，通过，7.21 秒 | [build.txt](build.txt) |

退出码：[results.json](results.json)；基线：[baseline-results.json](baseline-results.json)、[类型](baseline-typecheck.txt)、[单元](baseline-unit.txt)、[浏览器](baseline-e2e.txt)、[构建](baseline-build.txt)。

旧 151 项单元/210 项浏览器完整保留；新增 27 项单元和 13 场景×3 项目=39 项浏览器。所有公式修正断言、完整前向、FFN/Norm、不同长度 Cross、共享投影、固定种子/独立层、未来隔离、课程/进度兼容均通过。320/390/768/1440px 无整页横向溢出，键盘和减少动画检查通过，未捕获严重浏览器运行错误。

实际默认矩阵、形状、Top-K 和三层隔离数值：[default-forward.json](default-forward.json)。默认两行概率和为 1 和 0.9999999999999999；同参数改动未来 Token 后各层前两位置最大差为 [0,0,0]，18 项未来权重严格为 0。随机 Top-1 不能解释为正确翻译。

日志 .txt 已移除 ANSI 并转为 UTF-8，.log 是运行输出。QA 截图位于 ../../screenshots/t09/，三项目共 12 张，不参与网站展示。移动端为 Chromium 模拟，真实设备、Safari、Firefox 尚未验证。T09 已完成并停止，未实施 T10。
