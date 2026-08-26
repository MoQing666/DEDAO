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

**Cache busting:** Bump `CACHE` version in `sw.js` (currently `dedao-v12`) after pushing UI changes.

## Testing
No test framework. Tests run in Node.js with mocked DOM/localStorage:
```
node test/dedao_f4_engine_test.js     # engine unit tests
node test/dedao_ui_drive2.js          # UI smoke (title, save/load)
node test/dedao_ui_drive3.js          # UI smoke (alchemy, explore)
node test/dedao_ui_drive4.js          # UI smoke (tech, crafts, battle, year)
node test/dedao_ui_drive5.js          # UI smoke (explore flow, duobao, trib)
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
| xian | 遗世仙踪 | 元婴 | 仙级 (every 10 years, no duobao) |

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
- **Bottom bar** — Fixed at bottom, z-index 50. Contains: 储物袋, 装备, 功法, 结缘, 百艺, 事件
- **Modal** — z-index 250
- **Battle overlay** — z-index 9999 (CSS `!important`)
- **Screen** — `overflow: hidden`, padding-bottom 70px for bottom bar

## Key gotchas
- **Cultivation is once per year.** `cultivate()` checks `s.cultedThisYear`; `endYear()` resets it.
- `equipStats` handles ALL equipment stats including treasures (array). Do NOT add direct `s.wu += it.wu` — it double-counts.
- `treasure` is stored as array `s.equip.treasure = []`, capacity = `bigIdx + 1` (max 4).
- **Sect join** triggers automatically after first breakthrough to 筑基 via `sectJoinFlow()`.
- **Duobao** delays 2 years after getting high-tier equipment.
- **Combat starts with full HP/MP.** `combatStart()` sets `s.hp = s.hpMax; s.mo = s.moMax`.
- **No randomness in combat.** Damage = `atk * spellDmg` (no random multiplier).
- **Slow effect** lasts 1 round only.
- `endYear()` returns `'end'|'fate'|'ok'|'ok|...'`. Resets `cultedThisYear`.
- `validSave` accepts dead/ended saves (`S.dead || S.endReason` returns true early).
- **S.materials** must be initialized: `if (!s.materials) s.materials = {};`
- Tests use `_Spatch(fn)` to mutate `S` state. Test paths are hardcoded `D:/opencode/DEDAO/js/`.
