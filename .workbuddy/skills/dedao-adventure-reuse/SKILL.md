---
name: dedao-adventure-reuse
description: DEDAO 项目专用。新增"复用横版 DAG 秘境路线"的内容类型（试炼/考验/劫数/特殊副本）时的标准落地模式。当用户说"新增一个秘境式玩法/复用秘境地图/加一条 boss 路线/做一个试炼"时使用。覆盖 data.js 配置、engine.js 启动与 Boss 生成、ui.js 渲染与结算的 a.trial 分支约定。
agent_created: true
---

# DEDAO 秘境路线复用模式

## 何时用
当你要在 DEDAO（修仙放置 H5，根目录 `D:\opencode\DEDAO\`）里新增一种"走横版 DAG 地图、节点为敌人/精英/静室、尽头一个大 Boss"的内容（试炼、考验、劫数、特殊副本等）时，**不要从零写地图与战斗 UI**——复用 `genAdvMap` + 现有 `renderAdvMap`/`fightBoss`/`advFinish` 框架，按 `a.trial` 分支扩展。

入宗考验（`sect`）与死劫（`death`）已是用此模式实现的范本，新内容以它们为模板。

## 架构前提（三层）
- `js/data.js`：数据/配置（`ADVENTURE_CONFIG`、`ADVENTURE_GRADE`、`MONSTER_POOL`、`ADV_NODES`、`genAdvMap`）。
- `js/engine.js`：Engine IIFE。秘境逻辑集中在 `startAdventure`/`startTrial`/`advResolve`/`advCanFightBoss` 等。
- `js/ui.js`：IIFE。地图渲染 `renderAdvMap`、Boss 战 `fightBoss`、收尾 `advFinish`、`startTrialFlow`/`fightTrialBoss`/`handleTrialAbort`。

## 核心区分机制（必须理解）
两种用途共用同一套 DAG 生成器 `genAdvMap`：
1. **常规秘境**：`s.advType` = 等级 key（`huang/xuan/di/tian/xian`），`s.adv.grade` = 同 key。
2. **试炼路线**：`s.advType = 'trial'`、`s.adv.grade = 'trial'`、`s.adv.trial = <kind>`（`'sect'`/`'death'`/你的新 kind）。
   - **`a.trial`（truthy）是 UI/引擎统一的"走试炼分支"开关**，所有简化流程（无探索度门槛、Boss 文案"大敌当前"、撤退/结算差异）都靠它判定。

## 新增一种内容类型的标准步骤

### 1. data.js — 配置加项
- `ADVENTURE_CONFIG` 加条目（即使复用 trial 地图也建议加，便于标题/掉落区分）：
```js
trial_mykind: {
  name: 'XX试炼',
  grade: '试',
  realmReq: 0,
  desc: '...',
  monsters: MONSTER_POOL.huang,
  boss: { name: 'XX之主', line: '...', mechanic: null },
  drops: { herb: 'herb_huang', iron: 'iron_huang' }
}
```
- `ADVENTURE_GRADE` 加 key→品级数字（决定掉落品级，试炼通常 0，即黄级）：
```js
trial_mykind: 0
```
- 如需特殊 Boss 缩放，定义数据表（如死劫的 `DEATH_SCALES`/`DEATH_EVENTS`）在 engine 里引用。

### 2. engine.js — 启动 + Boss 生成
- 复用 `genAdvMap(key, { types, cols })`。试炼用 `types`/`cols` 限定节点类型与列数：
```js
const map = genAdvMap('trial_mykind', { types: ['combat','elite','rest'], cols: 5 });
```
  - `opts.types`：限定节点类型（内部加权 bag：combat:4 / elite:3 / rest:2）。
  - `opts.cols`：普通列数（试炼 5，常规 9）；最后一列大概率是 combat/elite/rest。
  - 返回 `{ cols, boss, byId, startId, normalCols, stepCost }`，是所有秘境共用的地图结构。
- 启动函数（仿 `startTrial`）：设 `s.advType='trial'`、`s.adv.grade='trial'`、`s.adv.trial='mykind'`、`s.adv.trialTitle`；`exploreMax:1`（试炼无需探索度门槛，Boss 恒可达）；`staminaMax` 自定义；预存 Boss 规格：
```js
s.adv.trialBoss = trialBossMyKind(s);
```
- Boss 生成（仿 `trialBossSect`/`trialBossDeath`）：返回 `{name,line,atk,hp,loot,bi,dunSpeed,portrait,mechanic}`，数值按境界 `JIE_DATA[s.jie].diff` 与专属缩放乘子计算：
```js
function trialBossMyKind(s) {
  const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
  const atk = Math.max(1, Math.round((s.atk || 10) * 1.4 * jd));
  const hp = Math.max(1, Math.round((s.hpMax || 180) * 2.0 * jd));
  return { name: 'XX之主', line: '...', atk: atk, hp: hp, loot: {}, bi: 0, dunSpeed: 1, portrait: 'foe', mechanic: null };
}
```
- 战果落地函数（仿 `applySectTrial`）：签名 `(s, win)`，处理 rank/奖励/标记通关等，返回结果对象；注意加"同年只一次"防重（`s.lastXxxYear === s.year` 拦截）。
- 导出：在 Engine 导出对象里补 `startMyKind: startMyKind, trialBossMyKind: trialBossMyKind, applyMyKind: applyMyKind`。

### 3. ui.js — 渲染与结算分支
- 入口函数（仿 `startTrialFlow`）：调用 `Engine.startMyKind(S, opts)`，切 `.explore-mode`/`.explore-active` 类，弹 `showChapter` 介绍后 `renderAdvMap`。
- `renderAdvMap`（约 827–937 行）：已用 `a.trial` 分支处理标题(`a.trialTitle`)、探索度恒满、Boss 文案"大敌当前"、提示文案、卡死兜底直开 Boss 门。**新增 kind 一般无需改这里**，除非要特殊节点/UI。
- `fightBoss`（约 1011 行）：已有 `if (a && a.trial) { fightTrialBoss(bossNode); return; }` 分流。**无需改**。
- `fightTrialBoss`（约 1049 行）：已有 `const kind = a.trial;`。仿 `if (kind === 'sect') {...} else {...}` 增加 `else if (kind === 'mykind')` 分支处理胜/败结算（调用 `Engine.applyMyKind`）。
- `advFinish` / `handleTrialAbort`（约 1477 / 1100 行）：已 `if (a && a.trial) { handleTrialAbort(a); return; }`。在 `handleTrialAbort` 内按 `a.trial` 分支处理中途退出（注意死劫"不可退=陨落"、入宗"可退=仅记日志"的差异，按你的内容定）。

### 4. 入口接线
- 在触发点（按钮/年末/主线）调用你的 `startTrialFlow('mykind', { title, ... })` 即可复用整条 UI 链路。

## 关键约定（易错点）
- **不要**为每种试炼单独写 `renderAdvMap`/`fightBoss`/`openBossGate`——全部走 `a.trial` 分支复用。
- 掉落品级由 `s.advType` 经 `ADVENTURE_GRADE` 决定（`advResolve` 内 `gi = ADVENTURE_GRADE[advType]||0`），试炼默认黄级。
- 探索度：`a.trial` 时 `advCanFightBoss` 恒 true（引擎 `if (a.trial) return true` + `exploreMax:1`）。
- `once`/`weight`/`min`/`max` 是**事件池（EVENTS/NPCS）**字段，与秘境路线无关，别混用。
- 测试：新增后务必在 `test/automated/` 补用例，跑 `NODE_PATH="C:/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules" "C:/Users/Lenovo/.workbuddy/binaries/node/versions/22.22.2-2/node.exe" test/automated/run.js` 确认全绿。

## 反例（不要做）
- ❌ 复制整套 `renderAdvMap` 写 `renderMyKindMap`。
- ❌ 在 `fightBoss` 里加 `if (a.mykind)` 特判却不走 `fightTrialBoss`（会丢失 Boss 规格预存逻辑）。
- ❌ 忘记在 `ADVENTURE_GRADE` 注册 key，导致掉落品级 undefined。
- ❌ 给试炼加 `exploreMax:100` 又没改 `advCanFightBoss`，导致卡死看不到 Boss。
