# DEDAO 得道 — Agent Guide

## What this is
Single-page browser game (修仙 life sim). Pure vanilla JS/HTML/CSS, no framework, no bundler, no npm. PWA with service worker. GitHub Pages deployment.

## Architecture
Load order matters — all share globals via page scope:
1. `js/data.js` — Game data constants. Key globals: `STAGES`, `SECTS`, `EVENTS`, `TECHNIQUES`, `EQUIPS`, `FORMULAS`, `ELEMENT_COUNTER`, `ADVENTURE_CONFIG`, `ADVENTURE_GRADE`, `SPIRIT_ITEMS`, `REINCARNATION`. Event registration via `E(tag, ev)`.
2. `js/engine.js` — All game logic. IIFE exposing single `Engine` global (~80 functions). Key: `startLife`, `combatStart`, `startAdventure`, `cultivate`, `endYear`, `breakthrough`, `perfectBreakthrough`, `normalBreakthrough`.
3. `js/audio.js` — Audio manager. `AudioManager` global. Real audio files with Web Audio synthesis fallback.
4. `js/ui.js` — All DOM/rendering. IIFE, boots via `DOMContentLoaded`. `S` variable = current game state.
5. `index.html` — All screens, overlays, modals. Single file.
6. `css/style.css` — Single stylesheet. Font: `'YuYang'` for everything.

## Run / Deploy
```
node serve.js        # local dev, port 8000
git push             # deploys to GitHub Pages
```
`serve.js` is a minimal static server (29 lines, no npm).

**Cache busting:** Bump `CACHE` version in `sw.js` (currently `dedao-v17`) after pushing UI changes.

## Testing
No test framework. Tests run in Node.js with mocked DOM/localStorage:
```
node test/dedao_f4_engine_test.js     # engine unit tests
node test/dedao_ui_drive2.js          # UI smoke (title, save/load)
node test/dedao_ui_drive3.js          # UI smoke (alchemy, explore)
node test/dedao_ui_drive4.js          # UI smoke (tech, crafts, battle, year)
node test/dedao_ui_drive5.js          # UI smoke (explore flow, trib)
```
Syntax check: `node --check js/data.js && node --check js/engine.js && node --check js/ui.js`

## Five Elements System (五行)
Core combat mechanic. Defined in `ELEMENT_COUNTER`:
```
金 → 木 → 土 → 水 → 火 → 金
```
- Counter: damage ×1.5
- Countered: damage ×0.7
- No relation: damage ×1.0

Each spell has `element` property. Each heart technique has `element` or `sect` property.

## Adventure System (秘境)
4 tiers + 1 special:
| Key | Name | Realm | Drops |
|-----|------|-------|-------|
| huang | 匪徒营寨 | 炼气 | 黄级 |
| xuan | 大黑山 | 筑基 | 玄级 |
| di | 洞天福地 | 金丹 | 地级 |
| tian | 魔道祖地 | 元婴 | 天级 |
| xian | 遗世仙踪 | 元婴 | 仙级 (every 10 years)

Config: `ADVENTURE_CONFIG[key]`, grade: `ADVENTURE_GRADE[key]`.

**Adventure Nodes:**
- `combat` — 普通战斗
- `elite` — 精英怪，胜利后有宝箱奖励
- `treasure` — 宝箱，随机掉落装备/功法/灵材/灵石
- `herb` / `iron` — 灵草/灵矿，按境界给予对应等级材料
- `shop` — 坊市，可购买物品
- `event` — 残魂传承事件，可学习功法或挑战考验

**Remnant Soul Event (残魂传承):**
- Offers 2 random techniques from pools (法术/心法/遁术)
- Player can learn 1 directly, or fight to learn both
- Win: get both techniques; Lose: get only first technique

**Technique Pools by Adventure Tier:**
| Tier | 法术池 | 心法池 | 遁术池 |
|------|--------|--------|--------|
| 黄/玄 | 金刃术、藤蔓术、水弹术、火球术、落石术、御火诀、凝霜诀、雷音引、剑气诀 | 金刚诀、青木功、玄水诀、赤火功、厚土诀、天罡诀、长春功、太阴诀、纯阳功、坤元诀 | 逍遥步、影遁术 |
| 地 | 金光剑、木灵治愈、寒冰刺、烈焰斩、落岩术、金光护体、生机缠绕、水灵术、火盾术、岩甲术 | 庚金诀、乙木诀、癸水诀、丙火诀、戊土诀、太玄经 | 缩地成寸 |
| 天/仙 | 万剑归宗、生机盎然、玄冰阵、天火焚城、山岳镇压、破天一击、万木回春、冰封千里、焚天灭地、大地守护 | 白虎诀、青龙诀、玄武诀、朱雀诀、麒麟诀、混沌诀 | — |

**Drop rates:**
- Treasure chest: 30% equipment, 25% technique, 20% materials, 25% spirit stones
- Elite: 40% technique drop
- Boss: 80% technique drop

## Breakthrough System (突破)
Three modes:
1. **Perfect** (`perfectBreakthrough`) — Uses spirit item, 100% success, special effect
2. **Normal** (`normalBreakthrough`) — Uses elixir, base chance, HP bonus
3. **Direct** (`normalBreakthrough(s, null)`) — No item, base chance

Spirit items: `SPIRIT_ITEMS` — one per realm, dropped by bosses.
Elixir grades: `ELIXIR_GRADE_HP = { '黄': 50, '玄': 100, '地': 300, '天': 500 }`

## Material System (灵材)
Graded materials: `herb_huang/xuan/di/tian`, `iron_huang/xuan/di/tian`.
Old `s.herb`/`s.iron` migrated to `s.materials` on load.
Display shows totals across all grades.

## Herb Planting System (灵田种植)
- Initial field count: 1 (can be increased with 随身灵田 talent or unlocking with spirit stones)
- Unlock 2nd field: 100 spirit stones
- Unlock 3rd field: 200 spirit stones
- Each field can plant 1 or 3 plants per grade
- Growth times: 黄1年, 玄2年, 地3年, 天4年
- 小绿瓶 talent reduces growth time by 1 year per level (min 1 year)

## UI Structure
- **Bottom bar** — Fixed at bottom, z-index 50. Contains: 储物袋, 装备, 功法, 结缘, 百艺, 事件
- **Modal** — z-index 250
- **Battle overlay** — z-index 9999 (CSS `!important`)
- **Screen** — `overflow: hidden`, padding-bottom 70px for bottom bar
- **Year button** — Always visible, shows confirmation if actions remain

## Key gotchas
- **Cultivation is once per year.** `cultivate()` checks `s.cultedThisYear`; `endYear()` resets it.
- `equipStats` handles ALL equipment stats including treasures (array). Do NOT add direct `s.wu += it.wu` — it double-counts.
- `treasure` is stored as array `s.equip.treasure = []`, capacity = `bigIdx + 1` (max 4).
- **Sect join** triggers automatically after first breakthrough to 筑基 via `sectJoinFlow()`.
- **Combat starts with full HP/MP.** `combatStart()` sets `s.hp = s.hpMax; s.mo = s.moMax`.
- **No randomness in combat.** Damage = `atk * spellDmg` (no random multiplier).
- **Slow effect** lasts 1 round only.
- `endYear()` returns `'end'|'fate'|'ok'|'ok|...'`. Resets `cultedThisYear`.
- `validSave` accepts dead/ended saves (`S.dead || S.endReason` returns true early).
- **S.materials** must be initialized: `if (!s.materials) s.materials = {};`
- Tests use `_Spatch(fn)` to mutate `S` state. Test paths are hardcoded `D:/opencode/DEDAO/js/`.
- **Duobao mechanism removed.** Equipment drops directly now.

## New Talents (轮回天赋)
- **小绿瓶** (`lvling_bottle`): 3轮回点, 灵草成长-1年/级, max 3级
- **随身灵田** (`extra_field`): 3轮回点, 初始灵田+1块/级, max 3级
- **五行灵体** (`wuxing_body`): 5轮回点, 修炼五行心法速度+10%/级, max 3级

## Blood Refining System (血炼)
Currently placeholder. UI shows locked state with "血炼之法尚未习得".
