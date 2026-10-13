# T07 最终验证记录

日期：2026-10-13（Asia/Shanghai）。在现有 frontend 目录顺序运行四个工程命令；结果均为真实执行输出。

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| npm.cmd run typecheck | 通过，退出 0 | [typecheck.txt](typecheck.txt) |
| npm.cmd run test:unit | 124/124 通过，无跳过，约 1.81 秒，退出 0 | [unit.txt](unit.txt) |
| npm.cmd run test:e2e | 171/171 通过，约 3.4 分钟，退出 0 | [e2e.txt](e2e.txt) |
| npm.cmd run build | 通过，Vite 11.89 秒，退出 0 | [build.txt](build.txt) |

机器可读退出码见 [results.json](results.json)。日志为 UTF-8，移除了终端颜色转义，不删改结果。单元包含旧 95 项及 T07 新增 29 项；浏览器包含旧 141 项及 T07 新增 30 项。浏览器使用 Chromium 模拟桌面、平板、手机，T07 另覆盖 320/390/768/1440px；未宣称真实设备或其他浏览器已验证。

开发基线、数学实测、修正过程和限制见 [开发日志](../../DEVELOPMENT_LOG.md)。截图位于 [screenshots/t07](../../screenshots/t07/)；它们仅用于 QA，不参与产品页面。
