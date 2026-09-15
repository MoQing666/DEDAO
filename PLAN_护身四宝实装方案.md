# 护身三宝 · 秘境掉落实装记录（2026-09-14）

> 状态：**已实装**（v151 / `?v=113`）。
> 前一份《PLAN 护身四宝实装方案》里「四条硬约束」有 **3 条是错的**，本文先更正，再记实装。

---

## 一、更正：我上一版搞错的三条

| # | 我之前的说法 | 实际情况 |
|---|---|---|
| ❌ 1 | 「秘境永远不会掉宝物，`randomEquip()` 只滚 weapon/head/body/accessory」 | **秘境会掉法宝，只是掉的是 `ARTIFACTS`。** `randomEquip()` 那条只对**普通装备**成立；法宝走另一条管道 `advBossBonus()`（engine.js:3146）：BOSS「秘藏二选一」，随机池只遍历 `ARTIFACTS`，按 `grade` 匹配 `BOSS_TREASURE_BAND`，**每层最多 3 件普通法宝**（灵物豁免上限）。 |
| ❌ 2 | 「`EQUIPS.treasure` 只认 5 个属性键，想加属性没门」 | 5 键限制**只针对 `EQUIPS.treasure`**（走 `equipStats()`）。`ARTIFACTS` 的 `effect{}` 支持 30+ 键（`hpMax`/`atk`/`wu`/`def`/`critPct`/`atkPct`/`modeBonus`…），走 `artifactStats()`，宽得多。 |
| ✅ 3 | 宝物入法宝囊，需手动穿戴才生效，占 `maxTreasure()` 名额（炼气 3 个） | 这条**是对的**，且对 `ARTIFACTS` 同样成立。 |
| ❌ 4 | 「每件必须有非宗门途径，散修才拿得到」 | 前提就错了——**秘境掉落本来就不依赖宗门**。三件挂进 `ARTIFACTS` 后，散修打秘境一样能掉。 |

**一句话总结**：`ARTIFACTS` = 秘境可掉 + 属性键丰富；`EQUIPS.treasure` = 固定装备型宝物 + 秘境永不触及。想让东西被秘境掉出来，就得挂 `ARTIFACTS`。

---

## 二、实装内容

### 2.1 三件迁入 `ARTIFACTS`（新增 J 组 · 护身类）

```js
/* —— J 护身类（3）→ 秘境 BOSS 随机掉落 —— */
gutang_pinganpai:  { name: '古檀平安牌', type: '守', grade: '黄', desc: '老檀木所刻，讨个吉利。', effect: { hpMax: 15 } },
zhenhun_moyu:      { name: '镇魂墨玉',   type: '守', grade: '玄', desc: '墨玉一枚，静心凝神。',   effect: { hpMax: 40, atk: 16 } },
jingang_xiangmoyin:{ name: '金刚降魔印', type: '攻', grade: '地', desc: '万佛铸印，降魔护身。',   effect: { hpMax: 90, atk: 26, wu: 1 } },
```

数值**原样搬运**，未做调整。`type` 只影响 UI 标签（辅/攻/守），不影响数值。

### 2.2 `EQUIPS.treasure` 同步清理

删掉全部四件（三件迁走 + 太极八卦佩按需求删除），只剩有明确发放口的两件：
`xuantie`（玄铁甲·内门商店）、`jinylv`（金缕衣·剧情/商店）。并加注释说明「该槽不进秘境随机池」。

### 2.3 掉落落点（按 `BOSS_TREASURE_BAND`）

`rollArt` 的档位倾向是 **上位 80% / 下位 20%**：

| 秘境阶位 | band | 三件的落点 |
|---|---|---|
| 黄级 | 黄 / 玄 | 古檀平安牌占下位 20% 档（**目前唯一黄阶普通法宝，该档必出它**）；镇魂墨玉在上位 80% 玄档里与静室玉牌、锻骨池等 6 件竞争 |
| 玄级 | 玄 / 地 | 镇魂墨玉在下位 20% 玄档；金刚降魔印在上位 80% 地档 |
| 地级 | 地 / 天 | 金刚降魔印在下位 20% 地档 |

> 顺带更正了 data.js 里那句「ARTIFACTS 无黄阶法宝」的注释——现在有了。

---

## 三、守卫（防再犯）

1. **`tools/pool-audit.js`**
   - 孤儿判定加两类豁免：灵物、以及「非灵物且 `grade` 落在任一 `BOSS_TREASURE_BAND` 内」。孤儿现在=无字面引用**且**秘境也掉不出。
   - 新增「秘境 band 档位覆盖」：某档若一件候选都没有会 warn（`rollArt` 会静默回退，玩家抽不到那一档）。
2. **`test/automated/01-static-data.test.js`**
   - 法宝总数 44 → **47**（剧情26 + 商店13 + 山河1 + 灵物4 + 秘境3）。
   - 新增断言：三件必须存在于 `ARTIFACTS` + 非灵物 + `grade` 在 band 内；四件都不许再留在 `EQUIPS.treasure`。

---

## 四、验收

- `node test/automated/run.js` → **223/223**（源码与 dist 副本双跑）
- `node tools/pool-audit.js` → 错误 **0**、警告 **0**（上一版那 4 条「无字面引用」全部消失）
- 装备 58 件 / 法宝 47 件；秘境 band 覆盖 `huang[黄/玄] xuan[玄/地] di[地/天] tian[天/仙] xian[天/仙]` 五档均有候选

## 五、版本

- `sw.js`：`dedao-v150` → **`dedao-v151`**
- `index.html` / `index_pc.html`：`?v=112` → **`?v=113`**
- `dist/DEDAO_release`（`bash tools/build_release.sh` 重建）+ `dist/taptap/dedao` 均已同步

---

## 六、留给以后（未做）

- 三件的数值（尤其古檀平安牌 `hpMax+15`）相对同阶法宝偏弱；黄级秘境下位档已必出它，新手第一件法宝只有 +15 血。要调的话说一声。
- 太极八卦佩已删；若以后想补一件天阶悟性法宝，记得挂 `ARTIFACTS`（`effect: { wu: 2 }`），别再挂 `EQUIPS.treasure`。
