# DEDAO 得道 — Agent Guide

## What this is
A single-page browser game (修仙 life sim). Pure vanilla JS/HTML/CSS — no framework, no bundler, no npm.

## Architecture
- `js/data.js` — All game data (SECTS, EVENTS, TECHNIQUES, EQUIPS, FORMULAS, LINGGEN_POOL, BACKGROUNDS, TALENTS, EASTER_EGGS, REINCARNATION, ACHIEVEMENTS, TRIBULATION_TEXTS, EQUIP_SLOTS). Uses `E()` helper to register events.
- `js/engine.js` — All game logic. Wrapped in IIFE, exposes single `Engine` global. Exports ~70 functions.
- `js/ui.js` — All DOM/rendering. Wrapped in IIFE, boots via `DOMContentLoaded`. Single `S` variable holds current game state.
- `index.html` — All screens (title/game/rebirth/ending/settlement/gear/crafts), overlays, modals.
- `css/style.css` — Single stylesheet, pixel-art theme, mobile-first (max-width 520px).
- Files load via `<script>` tags in order: data → engine → ui. They share globals through the page scope.

## Run the game
```
node serve.js        # default port 8000
node serve.js 3000   # custom port
```

## Testing
No test framework. All tests run in Node.js `vm` module with mocked DOM/localStorage.
Tests live in `test/`. Run from repo root:
```
node test/dedao_f4_engine_test.js     # engine unit tests (~91 checks, flaky due to RNG)
node test/dedao_ui_drive2.js          # UI smoke (title, save/load)
node test/dedao_ui_drive3.js          # UI smoke (alchemy, explore)
node test/dedao_ui_drive4.js          # UI smoke (tech, crafts, battle, year)
node test/dedao_ui_drive5.js          # UI smoke (explore flow, duobao, trib)
node test/dedao_smoke2.js             # engine smoke
node test/dedao_auto_test.js          # 50-battle AI simulation
node test/dedao_cut_test.js           # sect/combat integration
```
Syntax check: `node --check js/data.js && node --check js/engine.js && node --check js/ui.js`

**No lint, no typecheck, no formatter configured.**

## Key gotchas
- `requireNeed` is defined in data.js but used as `Engine.requireNeed()` in ui.js — it MUST be exported from engine.js or ui.js breaks silently.
- `equipStats` handles ALL equipment stats including treasures (array). Do NOT add direct `s.wu += it.wu` in equip/unequip paths — it double-counts. `refreshStats` calls `equipStats` → `calcHpMax`/`calcAtk`.
- `treasure` is stored as an **array** `s.equip.treasure = []`, capacity = `bigIdx + 1` (max 4). Use `maxTreasure(s)` to check. `gainEquip`/`wearEquip`/`sellEquip` do NOT modify `s.wu`/`s.ti` directly.
- Mining (`digMine`) costs 1 action point. Check `canAction(S, 1)` and call `spend(S, 1)` in the UI handler.
- `openModal('arts')` costs 1 action point on entry; operations inside (alchemy/forge/land) are free. Mining has its own AP cost outside the modal.
- Breakthrough flow: `breakInfo()` → if trib needed → `dujieFlow()` → 人劫 (choice) → 天劫 (battle) → `dujieWin()`/`dujieFail()`. 飞升 triggers at 元婴中期 (idx 10).
- `dujieFail` clears `s.trib` and reduces qi by 20% of `requireNeed(s)` on survival. Player must re-do 人劫→天劫 on next attempt.
- `dujieWin` handles 飞升: sets `s.idx=15, s.realm='仙', s.endReason='飞升'`. Returns `{ok:true}`.
- Settlement flow: `endLifeFlow()` computes achievements/points via `earnPoints`/`settlePoints`, shows `screen-settlement`. Does NOT clear save. Only settlement buttons (`settle-reborn`/`settle-title`) call `clearState()`.
- Loading a dead save (`doLoadSlot`/`actContinue`) shows log buttons (查看结算/重入轮回), does NOT auto-trigger `endLifeFlow`.
- `validSave` accepts dead/ended saves (`S.dead || S.endReason` returns true early).
- `logLife(s, type, text, pts)` records major life events in `s.lifeLog[]` (persisted in save).
- All combat goes through `doAct('atk'|'spell'|'guard'|'flee')` in ui.js. Spell button opens a spellbar inside the battle overlay (z-index 110). "跳过战斗" calls `Engine.combatAuto()`.
- Tests use `_Spatch(fn)` (injected into ui.js scope) to directly mutate `S` state from outside. This is the only way tests can set up game state mid-flow.
- Test harness uses hardcoded `D:/opencode/DEDAO/js/` paths — won't work if moved.
- `endYear()` advances age, resets hp/mo/actions, pays sect stipend. Returns 'end'|'fate'|'ok'|'ok|...'.
