# DEDAO 战斗 BUFF / DEBUFF 图标 · 方案（PLAN · 待执行）

> 状态：**已定稿待执行**（2026-09-14 PLAN 轮）。三项决策已由用户拍板，见第 2 节。
> 上一轮 PLAN：`DEDAO_黄阶法术特殊效果_方案.md`（两者都改 `applyPlayerControl`，执行顺序见第 11 节）。

---

## 1. 背景与现状（这排徽章目前是空的）

战斗层 DOM 与渲染函数**早就写好了**，但**数据源从未被写入**：

```html
<!-- index.html：战斗板里已存在两个容器 -->
<div class="buffs" id="b-me-buffs"></div>       <!-- 我方 -->
<div class="buffs" id="b-enemy-buffs"></div>    <!-- 敌方 -->
```

```js
// js/ui.js:531-532
renderBuffs('b-enemy-buffs', bb.buffs);          // bb === S.battle
renderBuffs('b-me-buffs', S.battle.buffs);       // ← 与上一行是同一个对象
```

```js
// js/engine.js:唯一引用 s.battle.buffs 的地方（解毒）
if (eff.cure && s.battle && s.battle.buffs) {
  s.battle.buffs = (s.battle.buffs || []).filter(function (bf) { return !bf.bad; });
  lines.push('负面状态已解除');
}
```

**全仓库检索 `.buffs`，只有这 4 处，没有任何一处写入。** 因此存在三个既有缺陷：

| # | 缺陷 | 后果 |
|---|---|---|
| 1 | `s.battle.buffs` 恒为 `[]` | 战斗界面的增益/减益徽章**永远不显示**——玩家完全看不到眩晕、灼烧、中毒、伐灾、减伤等状态 |
| 2 | 敌我两行读的是**同一个对象**（`bb === S.battle`） | 即便未来填了数据，敌我面板也会显示同一份，注定错位 |
| 3 | 解毒丹（`data.js:52` `adv:{cure:true}`）靠 `filter(!bf.bad)` 解毒 | 列表空 → **解负面状态完全无效**；而且即使填了数组，`filter` 派生数组也**清不掉** `pDotBurn`/`pDotPoison` 这些真实字段，属于「假实现」 |

所以本轮的实质是：**先建状态数据源（单一真源、派生不落盘）→ 再挂图标 → 顺带把 2、3 两个缺陷修掉。**

---

## 2. 已确认的三项决策

| # | 决策点 | 结论 |
|---|---|---|
| 1 | 展示形态 | **图标 + 名称 + 回合/层数**（如「🔥 灼烧 2层」「🛡 减伤 18% 2回」），沿用现有金黄/暗红配色 |
| 2 | 图标形式 | **Emoji**（与底部栏 👤📦🐾、图鉴分卷 ⚔️☯️🌟📜 的既有做法一致） |
| 3 | 眩晕 / 冻结 | **区分**：❄️ 冻结 / 💫 眩晕（引擎需多记一个来源字段） |

---

## 3. 状态清单与图标对照表

### 3.1 我方增益（`.buff`，金黄）

| 状态 | 字段 | 图标 | 徽章文案 | 数值后缀 |
|---|---|---|---|---|
| 攻击提升 | `fxAtkUp {amt,turns}` | ⚔️ | 攻击 +12% | `3回` |
| 受伤减免 | `fxDefUp {amt,turns}` | 🛡️ | 减伤 18% | `2回` |
| 暴击提升 | `fxCritUp {amt,turns}` | 🎯 | 暴击 +12% | `2回` |
| 伐灾 | `disasterStacks / disasterTurns` | ✨ | 伐灾 | `2层`（tip 注明「每 3 层免控一次」） |
| 防御姿态 | `guarded`（当回合） | 🧱 | 防御 | `1回` |

### 3.2 我方减益（`.buff.bad`，暗红）

| 状态 | 字段 | 图标 | 徽章文案 | 数值后缀 |
|---|---|---|---|---|
| 眩晕 | `pStunNext` + `pStunKind='stun'` | 💫 | 眩晕 | `1回` |
| 冻结 | `pStunNext` + `pStunKind='freeze'` | ❄️ | 冻结 | `1回` |
| 灼烧 | `pDotBurn` | 🔥 | 灼烧 | `2层` |
| 中毒 | `pDotPoison` | ☠️ | 中毒 | `2层` |
| 扰神（心魔） | `suppressed` | 😵 | 心神失守 | `1回` |

### 3.3 敌方减益（`.buff.bad`）

| 状态 | 字段 | 图标 | 徽章文案 | 数值后缀 |
|---|---|---|---|---|
| 眩晕 / 冻结 | `stunNext` + `stunKind` | 💫 / ❄️ | 眩晕 / 冻结 | `1回` |
| 灼烧 | `dotBurn` | 🔥 | 灼烧 | `2层` |
| 中毒 | `dotPoison` | ☠️ | 中毒 | `2层` |
| 攻击削弱 | `fxAtkDown {amt,turns}` | 🔻 | 攻弱 25% | `2回` |

### 3.4 敌方增益（`.buff`）

| 状态 | 字段 | 图标 | 徽章文案 | 数值后缀 |
|---|---|---|---|---|
| BOSS 减伤 | `fxBossDefUp {amt,turns}` | 🪨 | 减伤 30% | `2回` |
| 狂暴（BOSS 半血触发） | `enraged` | 💢 | 狂暴 | — |

> **配色口径**：`.bad` 表示「对**该侧**不利」。因此敌方增益（BOSS 减伤 / 狂暴）用**金黄**（对敌方是好事）。
> 若你更希望「从玩家视角看，敌方增益也是威胁」，把这两项改成 `bad: true` 即可（暗红），一个字段的事。

### 3.5 明确**不**进徽章的状态

| 状态 | 原因 |
|---|---|
| `b.slow` | 全仓库只被读取、**从未被置真**（死状态），且当回合即清，展示窗口为 0 |
| `b.guard` | 遁术的常驻减伤（非回合制），已有遁术列表承担展示，重复 |
| `b.mechanic`（summon/thorns/lifesteal/multicast/suppress） | 是敌人**固有特性**而非可变状态，更适合放敌人介绍而非徽章 |
| `heal` / `lifesteal` | 瞬发结算，无持续状态 |

---

## 4. 数据源设计：派生列表，不落盘

**关键决定**：徽章列表是**纯派生数据**，由战斗态现场计算，**不写入 `s.battle`**。

理由：
- `s.battle` 会被 `saveState` 整对象序列化。把派生数组存进去，会产生「字段与派生数组可能不同步」的隐患，还要处理旧存档缺失字段。
- 派生函数可以被 UI（渲染）与引擎（解毒）**共用**，天然避免"两处各算一遍"。

```js
// js/engine.js 新增（紧邻 ensureBattleFx）
/* 战斗状态列表（派生于 b 的各效果字段，不落盘）：me = 我方、foe = 敌方。
   每项：{ key, ico, label, num, unit, bad, tip } */
function battleFxList(s, b) {
  ensureBattleFx(b);
  const me = [], foe = [];
  // ---- 我方增益 ----
  if (b.fxAtkUp.amt)   me.push({ key:'atkUp', ico:'⚔️', label:'攻击 +' + b.fxAtkUp.amt + '%', num:b.fxAtkUp.turns,   unit:'回', bad:false });
  if (b.fxDefUp.amt)   me.push({ key:'defUp', ico:'🛡️', label:'减伤 ' + b.fxDefUp.amt + '%', num:b.fxDefUp.turns,   unit:'回', bad:false });
  if (b.fxCritUp.amt)  me.push({ key:'critUp',ico:'🎯', label:'暴击 +' + b.fxCritUp.amt + '%',num:b.fxCritUp.turns,  unit:'回', bad:false });
  if (b.disasterStacks)me.push({ key:'disaster',ico:'✨',label:'伐灾',                        num:b.disasterStacks,  unit:'层', bad:false,
                                 tip:'每 3 层抵消一次眩晕 / 冻结' });
  if (b.guarded)       me.push({ key:'guarded',ico:'🧱', label:'防御',                        num:1,                 unit:'回', bad:false });
  // ---- 我方减益 ----
  if (b.pStunNext)     me.push(b.pStunKind === 'freeze'
                          ? { key:'pFreeze', ico:'❄️', label:'冻结', num:1, unit:'回', bad:true }
                          : { key:'pStun',   ico:'💫', label:'眩晕', num:1, unit:'回', bad:true });
  if (b.pDotBurn)      me.push({ key:'pDotBurn',  ico:'🔥', label:'灼烧', num:b.pDotBurn,  unit:'层', bad:true });
  if (b.pDotPoison)    me.push({ key:'pDotPoison',ico:'☠️', label:'中毒', num:b.pDotPoison,unit:'层', bad:true });
  if (b.suppressed)    me.push({ key:'suppressed',ico:'😵', label:'心神失守', num:1, unit:'回', bad:true });
  // ---- 敌方减益 ----
  if (b.stunNext)      foe.push(b.stunKind === 'freeze'
                          ? { key:'freeze', ico:'❄️', label:'冻结', num:1, unit:'回', bad:true }
                          : { key:'stun',   ico:'💫', label:'眩晕', num:1, unit:'回', bad:true });
  if (b.dotBurn)       foe.push({ key:'dotBurn',   ico:'🔥', label:'灼烧', num:b.dotBurn,   unit:'层', bad:true });
  if (b.dotPoison)     foe.push({ key:'dotPoison', ico:'☠️', label:'中毒', num:b.dotPoison, unit:'层', bad:true });
  if (b.fxAtkDown.amt) foe.push({ key:'atkDown', ico:'🔻', label:'攻弱 ' + b.fxAtkDown.amt + '%', num:b.fxAtkDown.turns, unit:'回', bad:true });
  // ---- 敌方增益 ----
  if (b.fxBossDefUp.amt) foe.push({ key:'bossDefUp', ico:'🪨', label:'减伤 ' + b.fxBossDefUp.amt + '%', num:b.fxBossDefUp.turns, unit:'回', bad:false });
  if (b.enraged)         foe.push({ key:'enraged', ico:'💢', label:'狂暴', num:0, unit:'', bad:false });
  return { me: me, foe: foe };
}
```

> 允许徽章带多行：`.buffs` 已是 `flex-wrap`，窄屏自动换行。

---

## 5. 引擎改动清单（`js/engine.js`，3 处）

### 5.1 记录控制来源（区分 ❄️ / 💫）

`pStunNext` / `stunNext` 目前不记来源元素，无法区分眩晕与冻结。新增两个字段：

```js
// ensureBattleFx 内补默认（旧存档兼容）
if (typeof b.stunKind  !== 'string') b.stunKind  = '';   // 'stun' | 'freeze'，空串回落 💫
if (typeof b.pStunKind !== 'string') b.pStunKind = '';
```

写入点两处：

| 位置 | 改动 |
|---|---|
| `applySpellFx` 的 `sp.stun` 命中分支（`b.stunNext = true` 处） | 同时 `b.stunKind = (sp.element === '水') ? 'freeze' : 'stun';`（与日志文案同一判据） |
| `applyPlayerControl(s, b, chance)` | 新增**可选第 4 参** `kind`，命中时 `b.pStunKind = kind`；调用方（`bossCastSpell`）传 `sp.element === '水' ? 'freeze' : 'stun'` |

> 第 4 参可选 → 既有测试 `E.applyPlayerControl(s, s.battle, 1.0)` 调用不受影响（回落 `''` → 💫）。

### 5.2 新增 `battleFxList(s, b)`（第 4 节代码），并从 `Engine` 导出

便于测试直接断言列表内容（`E.battleFxList(s, s.battle)`）。

### 5.3 解毒丹「真修」

把假实现（filter 派生数组）换成清真实字段：

```js
// 原：s.battle.buffs = (s.battle.buffs || []).filter(bf => !bf.bad);   ← 清不掉任何状态
// 改：
if (eff.cure && s.battle) {
  const b = s.battle;
  const cured = [];
  if (b.pDotBurn > 0)   { b.pDotBurn = 0;   cured.push('灼烧'); }
  if (b.pDotPoison > 0) { b.pDotPoison = 0; cured.push('中毒'); }
  if (b.pStunNext)      { b.pStunNext = false; b.pStunKind = ''; cured.push('控制'); }
  lines.push(cured.length ? '负面状态已解除（' + cured.join('、') + '）' : '并无负面状态');
}
```

> `b.buffs` 字段**保留不删**（避免与并发会话撞车），但改造后不再被读写在逻辑路径上。

### 5.4 明确不改的部分

- 各效果的产生/结算/递减逻辑**一行不动**，只新增「只读派生 + 两个来源字段 + 解毒真修」。
- 不减不增任何数值平衡。

---

## 6. UI 改动清单（`js/ui.js`，3 处）

### 6.1 `renderBuffs` 支持图标与数值后缀

```js
function renderBuffs(elId, list) {
  const el = $(elId); if (!el) return;
  el.innerHTML = '';
  (list || []).forEach(function (x) {
    const s = document.createElement('span');
    s.className = 'buff' + (x.bad ? ' bad' : '');
    s.innerHTML = '<i class="bico">' + x.ico + '</i>'
                + '<span class="btxt">' + x.label + '</span>'
                + (x.num ? '<em class="bnum">' + x.num + x.unit + '</em>' : '');
    if (x.tip) s.title = x.tip;
    el.appendChild(s);
  });
}
```

> 这里用 `innerHTML` 整体重建，**不涉及事件绑定**（与「`el.innerHTML +=` 销毁已绑事件」的坑无关），安全。

### 6.2 调用点改为派生列表（顺带修「敌我共用同一对象」）

```js
// js/ui.js:531-532
const fx = Engine.battleFxList(S, bb);
renderBuffs('b-me-buffs',    fx.me);
renderBuffs('b-enemy-buffs', fx.foe);
```

### 6.3 其余

`renderBattle()` 每回合都会调用（`refresh` 链路内），无需额外触发点。

---

## 7. CSS 改动清单（`css/style.css:363-365`）

```css
.buffs { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; min-height: 16px; margin-top: 3px; }
.buff {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; padding: 1px 5px; border-radius: 3px; line-height: 1.5;
  border: 1px solid #6a5a90; color: #ffd27a; background: rgba(0,0,0,.3);
}
.buff .bico { font-style: normal; font-size: 12px; line-height: 1; }
.buff .bnum { font-style: normal; font-size: 10px; opacity: .85; }
.buff.bad { color: #ff8a7a; border-color: #8a4a4a; }
```

- Emoji 字体兜底（部分安卓 WebView 会渲染成黑白/方块）：
  `.buff .bico { font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }`
- 可选紧凑模式：窄屏（`max-width: 380px`）隐藏 `.btxt`，只留图标 + 数值（保留 `title` 提示）。

---

## 8. 测试计划

| 套件 | 用例 | 断言要点 |
|---|---|---|
| `11-dead-config` | 新增：派生列表分类正确 | 挂 `fxAtkUp` → 出现在 `me` 且 `bad=false`；挂 `fxAtkDown` → 出现在 `foe`；`me` 与 `foe` 不可互相污染 |
| | 新增：图标与文案对照 | 灼烧 → `ico==='🔥'`、`label==='灼烧'`、`unit==='层'`；伐灾 → `✨`；五种 DoT/控制逐一校验 |
| | 新增：眩晕 / 冻结 图标区分 | stub 沙箱 `Math.random=0` → 落石术(土) 命中 → `stunKind==='stun'`、`ico==='💫'`；凝霜诀(水) → `'freeze'`、`❄️` |
| | 新增：**解毒丹真解负面** | 挂 `pDotBurn/pDotPoison/pStunNext` → `useAdvElixir('jiedu')` → 三字段全清、`battleFxList().me` 不再含 bad 项。**旧实现下此例必红** |
| `03-ui` | 新增：端到端徽章渲染 | 进战斗 → 施放岩甲术/火球术 → `#b-me-buffs .buff` 数量 > 0 且含 `.bico`（emoji 非空） |
| | 新增：敌我两行**不相同** | 只给我方挂状态 → `#b-me-buffs` 有内容、`#b-enemy-buffs` 为空（防回退成共用同一数组） |
| `12-boss-element` | 新增：敌方施控记来源 | `b.spells=[{id:'shuang_han'}]` stub → `pStunKind==='freeze'`，`me` 侧图标 ❄️ |

### 非空转验证（必做）

1. 把 6.2 改回 `renderBuffs('b-enemy-buffs', bb.buffs)`（空数组）→ 「端到端徽章渲染 / 敌我不同」应转红。
2. 把 5.3 解毒改回 `filter(bf => !bf.bad)` → 「解毒丹真解负面」应转红。
3. 去掉 `stunKind` 写入 → 「眩晕冻结区分」应转红。

---

## 9. 文档与交付

### 文档同步

| 文档 | 改动 |
|---|---|
| 新建 `DEDAO_战斗状态图标对照表.md` | 第 3 节三类对照表 + 「不进徽章的状态」清单 + Emoji 字体兜底说明 |
| `DEDAO_法术效果全等级大表.md` | 加一行链接指向图标对照表 |
| `AGENTS.md` | 变更日志条目（第 51 条），记录「徽章列表恒空 / 敌我共用对象 / 解毒丹假实现」三个既有缺陷 |

### 交付清单（执行时按序）

1. `js/engine.js`（`stunKind` 字段 + `battleFxList` + 解毒真修 + 导出）、`js/ui.js`、`css/style.css`。
2. 测试新增（第 8 节），先跑主仓库全量。
3. 非空转验证（回退 → 确认转红 → 还原）。
4. 文档与 `AGENTS.md`。
5. bump `index.html` / `index_pc.html` 的 `?v=`、`sw.js` 的 `CACHE`。
6. 同步两份 dist（`git show HEAD:<file>` 取**已提交版**，避免带入并发会话在途改动）。
7. 主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑测试。
8. commit / push（并发会话在场时按 hunk 精准暂存；必要时用独立 worktree 验证 HEAD）。

---

## 10. 风险与备选

| # | 风险 | 说明 | 备选 |
|---|---|---|---|
| 1 | Emoji 跨端渲染差异 | 少数安卓 WebView / 老 iOS 可能显示为黑白或方块 | 已在 CSS 里加 Emoji 字体链兜底；仍不行则退为「图标用 CSS 绘制 + 文字保留」 |
| 2 | 徽章撑高战斗板 | 我方最多 5 枚 + 敌方最多 5 枚，窄屏换行后战斗板变高，可能挤压立绘 | `.buffs` 已 `flex-wrap`；备选：窄屏隐藏 `.btxt`（只留图标+数值） |
| 3 | `enraged` / `guarded` 展示窗口短 | 狂暴是持续状态（OK）；防御姿态仅当回合（可接受，玩家主动触发） | 若嫌闪，可把 `guarded` 移出徽章 |
| 4 | 新增 `stunKind` / `pStunKind` 字段影响旧存档 | 缺失回落 `''` → 图标退为 💫，不影响战斗逻辑 | 已在 `ensureBattleFx` 补默认值 |
| 5 | 与上一轮 PLAN 撞同一函数 | 黄阶 PLAN 也要改 `applyPlayerControl`（免控按阶取小），且其日志文案硬编码 `DISASTER_IMMUNE_COST` | 见第 11 节：先做黄阶，再做图标 |

---

## 11. 与上一轮 PLAN 的执行顺序

两轮都触及 `applyPlayerControl(s, b, chance)`：

| 轮次 | 对该函数的改动 |
|---|---|
| 黄阶机制 PLAN | 免控门槛由固定 3 → `min(3, disasterCap || 3)`；并修 `bossCastSpell` 里硬编码 `DISASTER_IMMUNE_COST` 的日志 |
| 本轮图标 PLAN | 新增可选第 4 参 `kind`，命中时记 `pStunKind` |

**建议顺序：先执行黄阶 PLAN，再做本轮图标 PLAN。** 这样 `applyPlayerControl` 只被改一轮、一次改到位，
且两者的回归（`11-dead-config` 的「新机制⑤」免控用例 / 「眩晕冻结区分」用例）不会交叉干扰。
若本轮先行，则黄阶 PLAN 落地的 `disasterCap` 需要在这版签名上再改一次。
