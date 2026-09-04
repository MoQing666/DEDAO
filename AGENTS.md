# DEDAO 得道 — Agent Guide

## What this is
Single-page browser game (修仙 life sim). Pure vanilla JS/HTML/CSS, no framework, no bundler, no npm. PWA with service worker. GitHub Pages deployment.

## Architecture
Load order matters — all share globals via page scope:
1. `js/data.js` — Game data constants. Key globals: `STAGES`, `SECTS`, `EVENTS`, `TECHNIQUES`, `EQUIPS`, `FORMULAS`, `ELEMENT_COUNTER`, `ADVENTURE_CONFIG`, `ADVENTURE_GRADE`, `SPIRIT_ITEMS`, `REINCARNATION`, `FIELD_SEEDS`, `DESTINIES`. Event registration via `E(tag, ev)`.
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

**Cache busting:** Bump `CACHE` version in `sw.js` (currently `dedao-v57`) after pushing UI changes. Also bump CSS version query in `index.html` (currently `?v=34`).

## Testing
No test framework. Tests run in Node.js with mocked DOM/localStorage:
```
node test/dedao_f4_engine_test.js     # engine unit tests
node test/dedao_ui_drive2.js          # UI smoke (title, save/load)
node test/dedao_ui_drive3.js          # UI smoke (alchemy, explore)
node test/dedao_ui_drive4.js          # UI smoke (tech, crafts, battle, year)
node test/dedao_ui_drive5.js          # UI smoke (explore flow, trib)
```
Syntax check (PowerShell): `node --check js/data.js; if ($?) { node --check js/engine.js; if ($?) { node --check js/ui.js } }`

## Six Dimensions (六维) & Combat Formulas

### Core Attributes
| Attr | Key | Affects | Formula |
|------|-----|---------|---------|
| 悟性 | `wu` | Cultivation speed | `cultGain`: `(60 + wu*10) * (1 + 0.3*CULT_REALM) * techMult * ...` |
| 体魄 | `ti` | HP max, defense | `calcHpMax`: `80 + ti*tiMulti + bigRealm*80`, tiMulti=[20,25,30,35] by realm |
| 遁速 | `dun` | Dodge rate | `dodgeRate = dun * 0.005 + destinyBonus` |
| 神识 | `shen` | Crit rate | `critRate = shen * 0.01 + destinyBonus` |
| 道心 | `dao` | Tribulation success | Higher dao = easier tribulations |
| 福源 | `fu` | Event triggers, loot | Higher fu = more lucky events |

### Combat Stats
| Stat | Formula |
|------|---------|
| Attack | `(10 + bigRealm*15) * talentMult * linggenMult * destMult * allMult + extraAtk + equipAtk` |
| Defense | `Math.round(ti * 0.5 * destDefMul)` |
| HP Max | `80 + ti*tiMulti + bigRealm*80 + linggenHp + artHp + sectHp + hpBonus + equipHp + ti*10 + destTi*10` |
| Crit Rate | `shen * 0.01 + destCritRate` |
| Dodge Rate | `dun * 0.005 + destDodgeRate` |
| Cultivation | `(60 + wu*10) * realmMult * techMult * linggenMult * talentMult * reincMult * equipMult * destMult` |

### Destiny Effects (命格)
- `getDestinyAttrBonus(s, attr)` — flat attribute bonuses from destinies
- `getDestinyAttrMult(s, attr)` — multiplier bonuses (atkMul, defMul)
- `getDestinyBonus(s, type)` — combat effect bonuses (critRate, dodgeRate, lifesteal, thorns, etc.)

## Five Elements System (五行)
Core combat mechanic. Defined in `ELEMENT_COUNTER`:
```
金 → 木 → 土 → 水 → 火 → 金
```
- Counter: damage ×1.5
- Countered: damage ×0.7
- No relation: damage ×1.0

Each spell has `element` property. Each heart technique has `element` or `sect` property.

## Action System (行动)
- Base actions: 3 per year
- +1 at realm index ≥3 (筑基+)
- +1 at realm index ≥7 (金丹+)
- +1 at realm index ≥11 (元婴+)
- **百艺 (Baiyi)**: costs 0 action points, unlocked after joining a sect

## Adventure System (秘境)
4 tiers + 1 special:
| Key | Name | Realm | Drops |
|-----|------|-------|-------|
| huang | 匪徒营寨 | 炼气 | 黄级 |
| xuan | 大黑山 | 筑基 | 玄级 |
| di | 洞天福地 | 金丹 | 地级 |
| tian | 魔道祖地 | 元婴 | 天级 |
| xian | 遗世仙踪 | 元婴 | 仙级 (every 10 years) |

Config: `ADVENTURE_CONFIG[key]`, grade: `ADVENTURE_GRADE[key]`.

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

## UI Structure
- **Bottom bar** — Fixed at bottom, z-index 50. Contains: 储物袋, 装备, 功法, 结缘, 百艺
- **Modal** — z-index 250
- **Battle overlay** — z-index 9999 (CSS `!important`)
- **Screen** — `overflow: hidden`, padding-bottom 70px for bottom bar
- **Year button** — Always visible, shows confirmation if actions remain
- **Character page** — Full-screen (`screen-char`), tabs: 属性/装备/法宝/功法
- **Baiyi page** — Full-screen (`screen-crafts`), shows 炼丹/炼器/灵田
- **Attribute panel** — Modal in game, shows 六维+战斗属性+命格详情

## Key gotchas
- **Cultivation is once per year.** `cultivate()` checks `s.cultedThisYear`; `endYear()` resets it.
- `equipStats` handles ALL equipment stats including treasures (array). Do NOT add direct `s.wu += it.wu` — it double-counts.
- `treasure` is stored as array `s.equip.treasure = []`, capacity = `bigIdx + 1` (max 4).
- **Sect join** triggers automatically after first breakthrough to 筑基 via `sectJoinFlow()`.
- **Combat starts with full HP/MP.** `combatStart()` sets `s.hp = s.hpMax`.
- **No randomness in combat.** Damage = `atk * spellDmg` (no random multiplier).
- **Slow effect** lasts 1 round only.
- `endYear()` returns `'end'|'fate'|'ok'|'ok|...'`. Resets `cultedThisYear`.
- `validSave` accepts dead/ended saves (`S.dead || S.endReason` returns true early).
- **S.materials** must be initialized: `if (!s.materials) s.materials = {};`
- Tests use `_Spatch(fn)` to mutate `S` state. Test paths are hardcoded `D:/opencode/DEDAO/js/`.
- **Duobao mechanism removed.** Equipment drops directly now.
- **Screen lifecycle:** `showScreen(name)` hides all `.screen` then shows `#screen-{name}`.
- **Destiny lock** (`destiny_lock` talent): reroll keeps locked destinies, sorts them to front.
- **BACKGROUNDS** have `flavor` with stat bonuses: `{ stone: N, ti/wu/shen/dao: N }`.
- **Social pool** now includes `EVENTS.jiyuan` (机缘 events merged into 游历).
- **Baiyi (百艺)**: 0 action cost, unlocked after sect join. Shows 炼丹/炼器/灵田.
- **loadState** silently swallows errors via try-catch. If save fails to load, check console for errors.

## Recent Changes (last session)
- UI redesign: stats panel with 六维 2×3 grid + combat stats 4×2 grid
- Destiny cards with specific bonus descriptions
- Attribute panel (modal) with full六维+combat+destiny details
- Character page attribute tab redesigned with六维 grid and combat formulas
- Merged 机缘 into 游历 pool
- Replaced 机缘 button with 百艺 (0 cost, sect-locked)
- 百艺 full-screen page with 炼丹/炼器/灵田
- SW bumped to v57, CSS version v34
