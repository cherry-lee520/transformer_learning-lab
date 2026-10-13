# T08 验收记录

日期：2026-10-13，Asia/Shanghai。所有命令在 frontend 运行。

开发前基线：typecheck 通过，124/124 单元通过（1621.1008ms），171/171 浏览器通过（3.4 分钟），Vite 构建 10.32 秒；baseline-results.json 中退出码均为 0。

开发中：新增数学测试及旧回归共 151/151 通过。首轮桌面浏览器 10/12，通过后修正两项断言（步骤名称空格、进度初始化空记录），三项目专项 36/36 通过（58.1 秒）。详见 DEVELOPMENT_LOG。

最终固定代码后按序执行，实际结果：

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `npm.cmd run typecheck` | 退出 0，通过 | [typecheck.txt](typecheck.txt) |
| `npm.cmd run test:unit` | 退出 0，151/151，1053.689ms，0 失败/跳过 | [unit.txt](unit.txt) |
| `npm.cmd run test:e2e` | 退出 0，210/210，4.1 分钟 | [e2e.txt](e2e.txt) |
| `npm.cmd run build` | 退出 0，Vite 7.15 秒 | [build.txt](build.txt) |

退出码原始记录：[results.json](results.json)。基线日志：[类型](baseline-typecheck.txt)、[单元](baseline-unit.txt)、[浏览器](baseline-e2e.txt)、[构建](baseline-build.txt)；[基线退出码](baseline-results.json)。

新增 27 项单元及 13 场景×3 项目=39 项浏览器验收；全部旧回归保留。数学参考、稳定性/Mask/贡献/多头/导入、教材与进度兼容、键盘/减少动画、320/390/768/1440px 无整体横向溢出均通过，未捕获严重浏览器运行错误。最大 32×16 输入和 8 Head 也已验收。移动端为 Chromium 模拟，真实设备及 Safari/Firefox 尚未验证。

日志 .txt 为移除终端颜色的 UTF-8 副本，.log 为运行输出。QA 截图位于 ../../screenshots/t08/，不参与网站展示。T08 已完成并停止，未实施 T09。
