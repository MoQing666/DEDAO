# DEDAO 得道 — Agent Guide

## What this is
Single-page browser game (修仙 life sim). Pure vanilla JS/HTML/CSS, no framework, no bundler, no npm. PWA with service worker. GitHub Pages deployment.

## Architecture
Load order matters — all share globals via page scope:
1. `js/data.js` — Game data constants (`SECTS`, `EVENTS`, `TECHNIQUES`, `EQUIPS`, `FORMULAS`, `LINGGEN_POOL`, `BACKGROUNDS`, `TALENTS`, `EASTER_EGGS`, `REINCARNATION`, `ACHIEVEMENTS`, `TRIBULATION_TEXTS`, `EQUIP_SLOTS`). Event registration via `E(tag, ev)`. Also defines utility functions used everywhere: `bigIdxOf()`, `safeStage()`, `requireNeed()`.
2. `js/engine.js` — All game logic. IIFE exposing single `Engine` global (~70 functions).
3. `js/audio.js` — Audio manager. `AudioManager` global. Real audio files with Web Audio synthesis fallback.
4. `js/ui.js` — All DOM/rendering. IIFE, boots via `DOMContentLoaded`. `S` variable = current game state.
5. `index.html` — All screens, overlays, modals. Single file.
6. `css/style.css` — Single stylesheet. Font: `'YuYang'` (站酷仓耳渔阳体) for everything.

## Run / Deploy
```
node serve.js        # local dev, port 8000
git push             # deploys to GitHub Pages
```
`serve.js` is a minimal static server (29 lines, no npm). Only handles `.html/.css/.js/.ttf/.png/.json` MIME types — add entries for `.mp3/.wav/.woff2` if needed.

**Cache busting:** Bump `CACHE` version in `sw.js` (currently `dedao-v7`) after pushing UI changes. `sw.js` ASSETS list includes `js/audio.js` and the BGM file.

## Testing
No test framework. All tests run in Node.js `vm` module with mocked DOM/localStorage. Tests live in `test/`. Run from repo root:
```
node test/dedao_f4_engine_test.js     # engine unit tests (~91 checks, flaky due to RNG)
node test/dedao_ui_drive2.js          # UI smoke (title, save/load)
node test/dedao_ui_drive3.js          # UI smoke (alchemy, explore)
node test/dedao_ui_drive4.js          # UI smoke (tech, crafts, battle, year)
node test/dedao_ui_drive5.js          # UI smoke (explore flow, duobao, trib)
```
Syntax check: `node --check js/data.js && node --check js/engine.js && node --check js/ui.js`

**No lint, no typecheck, no formatter configured.**

## Audio System
- `AudioManager` global: `playBgm(name)`, `playSfx(name)`, `stopBgm()`, `pauseBgm()`, `resumeBgm()`, `setBgmVolume(vol)`, `setSfxVolume(vol)`, `enableBgm(enabled)`, `enableSfx(enabled)`
- Real audio files: `assets/audio/bgm/` and `assets/audio/sfx/`
- BGM: 场景使用 `求道一两风_minimax_free.mp3`，战斗使用 `仙魔浩劫_watermark.mp3`
- Falls back to Web Audio synthesis if files fail to load
- `generate-audio.js` — run `node generate-audio.js` to regenerate placeholder WAV files

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
- **Sect join is NOT a random event.** It triggers automatically after first breakthrough to 筑基 via `sectJoinFlow()` in ui.js. Removed from `E('jiyuan', ...)`.
- **Duobao (夺宝) delays 2 years.** After getting high-tier equipment, `pendingDuobaoYear = S.year + 2`. Checked in `actYearEnd()`.
- **Adventure (秘境) has 2 tiers.** `advType=1` (炼气-筑基, yellow/xuan gear), `advType=2` (金丹-元婴, di/tian gear). Selected via `openAdvSelect()` modal. `startAdventure(s, advType)` enforces tier restrictions.
- **Equip tier ranges:** `REALM_TIER_RANGE = [[1,2],[1,2],[3,4],[3,4]]` — lianqi/zhuji get tier 1-2, jindan/yuanying get tier 3-4.
- **Formula grades:** `FORMULAS` entries have `needRealm` (0-3) and `grade` ('黄'/'地'/'天') fields.
- `randomEquip(bi, depth)` — `bi` clamps equip tier via `REALM_TIER_RANGE[bi]`.
- Tests use `_Spatch(fn)` to mutate `S` state. Test paths are hardcoded `D:/opencode/DEDAO/js/`.
