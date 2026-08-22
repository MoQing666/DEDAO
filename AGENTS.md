# DEDAO 得道 — Agent Guide

## What this is
A single-page browser game (修仙 life sim). Pure vanilla JS/HTML/CSS — no framework, no bundler, no npm. Deployed to GitHub Pages.

## Architecture
- `js/data.js` — All game data (SECTS, EVENTS, TECHNIQUES, EQUIPS, FORMULAS, LINGGEN_POOL, BACKGROUNDS, TALENTS, EASTER_EGGS, REINCARNATION, ACHIEVEMENTS, TRIBULATION_TEXTS, EQUIP_SLOTS). Uses `E()` helper to register events.
- `js/engine.js` — All game logic. Wrapped in IIFE, exposes single `Engine` global. Exports ~70 functions.
- `js/audio.js` — Audio management module. Handles BGM and SFX playback with Web Audio API fallback. Exposes `AudioManager` global.
- `js/ui.js` — All DOM/rendering. Wrapped in IIFE, boots via `DOMContentLoaded`. Single `S` variable holds current game state.
- `index.html` — All screens (title/game/rebirth/ending/settlement/gear/crafts), overlays, modals.
- `css/style.css` — Single stylesheet. Font: `'YuYang'` (站酷仓耳渔阳体) for everything.
- Files load via `<script>` tags in order: data → engine → audio → ui. They share globals through the page scope.

## Audio System
- `generate-audio.js` — Run `node generate-audio.js` to generate placeholder WAV files
- `assets/audio/bgm/` — Background music files (title.wav, game.wav, battle.wav, peaceful.wav, sect.wav, adventure.wav, ending.wav)
- `assets/audio/sfx/` — Sound effect files (click.wav, good.wav, win.wav, bad.wav, break.wav, attack.wav, spell.wav, hit.wav, miss.wav, levelup.wav, item.wav, money.wav, heal.wav, explore.wav, battle_start.wav, battle_end.wav)
- `AudioManager` global API: `playBgm(name)`, `playSfx(name)`, `stopBgm()`, `pauseBgm()`, `resumeBgm()`, `setBgmVolume(vol)`, `setSfxVolume(vol)`, `enableBgm(enabled)`, `enableSfx(enabled)`
- BGM switches automatically: title→game→battle→ending based on screen/state
- Settings panel includes BGM/SFX toggles and volume sliders
- Falls back to Web Audio synthesis if audio files fail to load

## Run / Deploy
```
node serve.js        # local dev, default port 8000
git push             # deploys to GitHub Pages automatically
```
**Cache busting:** After pushing UI changes, bump `CACHE` version in `sw.js` (e.g. `'dedao-v6'` → `'dedao-v7'`). Otherwise users see stale cached files.

## Testing
No test framework. All tests run in Node.js `vm` module with mocked DOM/localStorage.
Tests live in `test/`. Run from repo root:
```
node test/dedao_f4_engine_test.js     # engine unit tests (~91 checks, flaky due to RNG)
node test/dedao_ui_drive2.js          # UI smoke (title, save/load)
node test/dedao_ui_drive3.js          # UI smoke (alchemy, explore)
node test/dedao_ui_drive4.js          # UI smoke (tech, crafts, battle, year)
node test/dedao_ui_drive5.js          # UI smoke (explore flow, duobao, trib)
```
Syntax check: `node --check js/data.js && node --check js/engine.js && node --check js/ui.js`

**No lint, no typecheck, no formatter configured.**

## Key gotchas
- **Cultivation is once per year.** `cultivate()` checks `s.cultedThisYear`; `endYear()` resets it. UI disables button and shows "今年已修炼".
- `equipStats` handles ALL equipment stats including treasures (array). Do NOT add direct `s.wu += it.wu` in equip/unequip paths — it double-counts.
- `treasure` is stored as an array `s.equip.treasure = []`, capacity = `bigIdx + 1` (max 4).
- Mining (`digMine`) costs 1 action point in the UI handler.
- `openModal('arts')` costs 1 AP on entry; alchemy/forge/land inside are free.
- Breakthrough: `breakInfo()` → trib needed → `dujieFlow()` → 人劫 → 天劫 → `dujieWin()`/`dujieFail()`. 飞升 at 元婴中期 (idx 10).
- `dujieFail` clears `s.trib` and reduces qi by 20% of `requireNeed(s)` on survival.
- `dujieWin` for 飞升: sets `s.idx=15, s.realm='仙', s.endReason='飞升'`.
- Settlement: `endLifeFlow()` does NOT clear save. Only settlement buttons call `clearState()`.
- Loading a dead save shows log buttons (查看结算/重入轮回), does NOT auto-trigger `endLifeFlow`.
- `validSave` accepts dead/ended saves (`S.dead || S.endReason` returns true early).
- Combat: `doAct('atk'|'spell'|'guard'|'flee')`. Spellbar is inside battle overlay (z-index 110).
- `endYear()` returns `'end'|'fate'|'ok'|'ok|...'`. Resets `cultedThisYear`.
- Tests use `_Spatch(fn)` to mutate `S` state. Test paths are hardcoded `D:/opencode/DEDAO/js/`.
