# DEDAO 战斗 BUFF / DEBUFF 图标 · 对照表（单一事实来源）

> 状态：**已实装**（2026-09-14 图标落地 / 2026-09-15 补 Emoji 字体兜底 + `03-ui` 端到端 DOM 回归），`?v=138 / dedao-v176`。
> 上游方案：`DEDAO_战斗状态图标_方案.md`（含三个既有缺陷的排查过程）。
> 本文档的图标 / 文案 / `tip` **逐字取自 `js/engine.js` 的 `Engine.battleFxList()`**，不是设计稿转抄。

---

## 〇、数据源与渲染口径（看表前必读）

```js
Engine.battleFxList(s, b)  →  { me: [...], foe: [...] }
// 每项：{ icon, label, bad, tip }
```

- **纯派生、不落盘**：列表由战斗态**现场计算**，**不写入 `s.battle`**。
  理由：`s.battle` 会被 `saveState` 整对象序列化，存派生数组会造成「字段与数组不同步」
  （DoT 结算、回合递减都会让数组过期），旧存档也没有该字段。
- **单一真源**：UI 渲染（`ui.renderBuffs`）与「解毒丹」判定共用同一份口径，避免两处各写一套漏字段。
- **渲染结构**（`ui.js renderBuffs`）：
  ```html
  <span class="buff [bad]" title="完整说明">
    <i class="bf-ic">图标</i><b class="bf-tx">名称（含层数/回合）</b>
  </span>
  ```
- **配色**：`.bad` = 对**该侧**不利 → 减益用暗红（`rgba(74,10,10,.42)` 底 / `#ff8a7a` 字），
  增益用金黄（`rgba(0,0,0,.3)` 底 / `#ffd27a` 字）。因此**敌方增益仍是金黄**（对敌方是好事）。
- **层数/回合并入 `label`**：如「灼烧 2 层」「攻击 +12%」——tip 里才含剩余回合数。
  ⚠ 这就是**未采纳**方案里「窄屏隐藏 `.btxt`」的原因：隐藏它会连数值一起丢掉。

---

## 一、我方增益（`.buff`，金黄）

| 图标 | 徽章文案 | 字段 | 触发条件 | `title` 完整说明 |
|---|---|---|---|---|
| ⚔️ | 攻击 +N% | `fxAtkUp {amt,turns}` | `amt > 0` | 攻击提升 N% · 剩 M 回合 |
| 🛡️ | 减伤 N% | `fxDefUp {amt,turns}` | `amt > 0` | 受到的伤害降低 N% · 剩 M 回合 |
| 🎯 | 暴击 +N% | `fxCritUp {amt,turns}` | `amt > 0` | 暴击率提升 N% · 剩 M 回合 |
| ✨ | 伐灾 N 层 | `disasterStacks` / `disasterTurns` / `disasterCap` | `stacks > 0` | 金系伐灾 N 层（每 K 层可抵消一次眩晕/冻结）· 剩 M 回合 |
| 🧱 | 防御 | `guarded` | 为真 | 本回合受到的伤害降低 65% |

> ✨ 的 tip 里 **K = `disasterImmuneCost(b) = min(3, 本档上限)`**（2026-09-15 起按阶取小，黄1/玄2/地3/天3）。

## 二、我方减益（`.buff.bad`，暗红）

| 图标 | 徽章文案 | 字段 | 触发条件 | `title` |
|---|---|---|---|---|
| 💫 | 眩晕 | `pStunNext` + `pStunKind !== 'freeze'` | 为真 | 下一回合无法行动 |
| ❄️ | 冻结 | `pStunNext` + `pStunKind === 'freeze'` | 为真 | 下一回合无法行动 |
| 🔥 | 灼烧 N 层 | `pDotBurn` | `> 0` | 每回合 1 层结算，扣除当前生命 10% |
| ☠️ | 中毒 N 层 | `pDotPoison` | `> 0` | 每回合 1 层结算，扣除当前生命 10% |
| 😵 | 心神失守 | `suppressed` | 为真 | 心神失守：本次出手被空过 |

## 三、敌方减益（`.buff.bad`）

| 图标 | 徽章文案 | 字段 | 触发条件 |
|---|---|---|---|
| 💫 / ❄️ | 眩晕 / 冻结 | `stunNext` + `stunKind` | 为真 |
| 🔥 | 灼烧 N 层 | `dotBurn` | `> 0` |
| ☠️ | 中毒 N 层 | `dotPoison` | `> 0` |
| 🔻 | 攻击 −N% | `fxAtkDown {amt,turns}` | `amt > 0` |

## 四、敌方增益（`.buff`，金黄）

| 图标 | 徽章文案 | 字段 | 触发条件 |
|---|---|---|---|
| 🪨 | 减伤 N% | `fxBossDefUp {amt,turns}` | `amt > 0` |
| 💢 | 狂暴 | `enraged` | 为真（BOSS 气血过半触发） |

**合计 15 枚**（我方 9 = 增益5 + 减益4；敌方 6 = 减益4 + 增益2）。全 BUFF 预览：
`tools/build_battle_preview.js` → `_preview/battle_buffs.html` / `.png`（徽章由真实引擎现算，预览 = 实装）。

---

## 五、明确**不**进徽章的状态

| 状态 | 原因 |
|---|---|
| `b.slow` | **死状态**——全仓库只被读取、从未被置真，且当回合即清，展示窗口为 0 |
| `b.guard` | 遁术的**常驻**减伤（非回合制），已有遁术列表承担展示，重复 |
| `b.mechanic`（summon / thorns / lifesteal / multicast / suppress） | 敌人**固有特性**而非可变状态，更适合放敌人介绍 |
| `heal` / `mpRestore` / `lifesteal` | 瞬发结算，无持续状态 |

---

## 六、眩晕 / 冻结为什么能分开

两者**共用 `stunNext` 字段**（结算逻辑完全一致），靠新增的来源字段区分：

- `b.stunKind` / `b.pStunKind` = `'stun'`（土→💫眩晕）或 `'freeze'`（水→❄️冻结）。
- **仅用于图标与文案，不参与任何结算**。
- 写入点：`applySpellFx` 施控时按 `sp.element === '水'` 写入；`applyPlayerControl` 走可选第 4 参 `kind`；
  `bossCastSpell` 传 `sp.element === '水' ? 'freeze' : 'stun'`。
- 旧存档 / 三参旧签名调用 → 回落 `'stun'` → 图标退为 💫，不影响战斗逻辑。

---

## 七、Emoji 渲染兜底

部分安卓 WebView / 老 iOS 缺彩色 Emoji 字体，会把图标渲染成黑白或方块。已加字体链：

```css
.buff .bf-ic { font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji",
                            "Twemoji Mozilla", "EmojiOne Color", sans-serif; }
```

若仍有端上显示为方块，方案备选是「图标改 CSS 绘制 + 文字保留」——**当前未启用**。

---

## 八、防回退守卫

| 位置 | 守什么 |
|---|---|
| `test/01-static-data.test.js` | 徽章必须由 `Engine.battleFxList` 供数（正则守卫，防再退回读**恒空**的 `s.battle.buffs`）；图标/文字双节点存在；减益底色可区分 |
| `test/11-dead-config.test.js` | 列表覆盖全部 15 项、空状态必须为空、死状态 `slow`/`guard`/`mechanic` 不得进列表；眩晕 💫 与冻结 ❄️ 按五行区分；解毒丹真解负面（旧版 `filter` 恒空 = 静默无效） |
| `test/03-ui.test.js` | 端到端 DOM：进战斗施法后 `#b-me-buffs` 真有徽章且含 emoji；**只给我方挂状态时敌方行为空**（防回退成敌我共用同一数组） |
