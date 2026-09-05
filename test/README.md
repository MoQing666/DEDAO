# DEDAO 自动化测试

> 目标：在不引入打包器/构建链（契合 `AGENTS.md` 约定）的前提下，对《得道》做全量自动化测试。
> 测试对象：主版本 `DEDAO/`（原 `DEDAO_test/` 经核查为损坏副本，data.js / audio.js 含 11381 个 U+FFFD 损坏字符、语法不可解析，故以主版本为准）。

## 一、测试框架选型（联网调研，2026-09）

| 框架 / 方案 | 适用测试层 | 关键特点 | 本项目是否采用 |
|---|---|---|:--:|
| **Playwright**（`@playwright/test`） | E2E · 视觉回归 · 性能(FPS) | 需游戏暴露 `window.__TEST__` 测试缝 + 确定性模式(种子RNG/固定步长)；断言玩家可见行为而非像素 | 暂未采用（可作为后续增强） |
| **Jest + jsdom** | 纯逻辑单元 | 需 babel 转译浏览器脚本 | 未采用 |
| **Vitest + jsdom** | 纯逻辑单元（Vite 生态） | 启动快、DX 好，支持 node/jsdom/browser 多模式 | 未采用 |
| **Mocha + Chai + jsdom** | 经典逻辑单测 | 组合成熟，需手动桩浏览器 API | 未采用 |
| **Node `vm` + jsdom（自研轻量）** | 逻辑层 + DOM 层 | 零构建链直接 `vm.runInContext` 加载浏览器脚本，UI 层用 jsdom 注入 `index.html` | ✅ **采用** |

**选型理由**：DEDAO 是原生 JS + 无打包器，按 2026 社区共识「选最便宜的层覆盖对应缺陷类」——
- 逻辑层（境界/战斗/存档/数值）用 `vm` 直接加载 `data.js`/`engine.js` 跑单元 + 长时模拟，最快最稳；
- DOM 层用 jsdom 注入 `index.html` 做加载冒烟与交互回归；
- 全量无需为测试引入任何构建步骤，符合项目约定。

## 二、测试套件与覆盖

| 套件 | 用例数 | 覆盖内容 |
|---|---:|---|
| `01-static-data` 静态一致性 & 数据完整性 | 16 | JS 语法可解析、无编码损坏、DOM 引用一致、资源存在、SW 缓存版本；境界/功法/天赋/配方/事件/宗门/灵根/装备数据合法性 |
| `02-engine-sim` 引擎单元 & 长时模拟 | 15 | 开局、行动点、修炼、突破、战斗终止、装备、存档往返、丹药、年份推进；**100 局随机全流程模拟**（不变量 + 无 NaN）+ 数值平衡抽样 |
| `03-ui` UI / DOM 层（jsdom） | 7 | 页面加载无报错、标题页、开局流程（轮回→起名→主界面）、行动按钮点击、底部弹窗、轮回塔、localStorage 存档 |

## 三、运行结果

| 套件 | 通过 | 失败 | 风险 |
|---|---:|---:|---:|
| 01 静态一致性 & 数据完整性 | 16 | 0 | 0 |
| 02 引擎单元测试 & 长时模拟 | 15 | 0 | 0 |
| 03 UI / DOM 层（含弹窗回归） | 8 | 0 | 0 |
| **合计** | **39** | **0** | **0** |

> 结果：**全量 39 用例通过，0 风险**。详见 `reports/test-report-*.md` 最新一份。

## 四、本次发现并修复的缺陷（P0）

| 缺陷 | 位置 | 影响 | 修复 |
|---|---|---|---|
| `showXuelian is not defined` | `js/ui.js` 主行动栏「锻体」按钮 `btn-arts` 的 onclick | 点击「锻体」直接抛 `ReferenceError`，按钮功能完全失效（空桩残留，对应注释「锻体系统UI（未实装）」） | 新增 `actArts()`，复用游戏中已存在的 inline 锻体逻辑（消耗 1 行动点、体魄 +0.5、刷新存档），并将 onclick 改为 `actArts()` |
| 原生 `alert`/`confirm` 阻塞线程（WebView 发布阻断） | `js/ui.js` 的清档/读档/覆盖存档/轮回点提示共 6 处 | 浏览器下可用，但**WebView 内嵌（抖音/华为/TapTap）时原生弹窗会阻塞宿主线程；且 4119/4184 的 `typeof confirm` 守卫在 WebView 下反而变成"默认确认"，有覆盖存档的数据风险** | 新增 `uiAlert()` / `uiConfirm()`（`Promise` 化、基于独立 `#dialog-overlay` 浮层、不阻塞线程）；6 处全部改为 `async/await` 调用；顺带清理 3 处旧布局死代码分支 |

## 五、已清零的风险项

| 原风险 | 状态 | 处理 |
|---|---|---|
| 守护式死代码（`btn-bag`/`btn-gear`/`btn-settings` 旧分支） | ✅ 已清理 | 实际功能已由 `btn-bag-bottom` / `btn-settings-bottom` 等真实按钮接管，删除无影响 |
| 原生 `alert`/`confirm` 阻塞 WebView | ✅ 已替换为 `uiAlert`/`uiConfirm` | 见第四节；静态扫描已归零 |

## 六、如何运行

```bash
# 1. 安装隔离依赖（jsdom），仅测试需要，不影响游戏本体
cd /c/Users/Lenovo/.workbuddy/binaries/node/workspace
npm install jsdom --no-audit --no-fund

# 2. 运行全量测试
cd /d/opencode/DEDAO
NODE_PATH="/c/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules" \
  node test/automated/run.js

# 可选：测试其它副本
DEDAO_ROOT=/d/opencode/DEDAO_test node test/automated/run.js
```

报告自动生成至 `test/reports/test-report-<时间戳>.md`。

## 七、后续建议

1. **补 Playwright E2E 缝**：在 `index.html` 暴露 `window.__TEST__`（`state()` / `seed()` / `ready`），可一键跑"开局→修炼→突破"关键流与截图回归，进一步防回归。
2. **~~清掉死代码与替换原生弹窗~~**：✅ 已完成（见第四/五节），WebView 内嵌的弹窗阻塞风险已清零。
3. **接入 CI**：把 `run.js` 挂到 Git push 钩子 / 平台 CI，每次提交自动回归。
