# REPORT JUNGLE WATERFALL REWARD FINALIZE — 07

## Summary

Finalized the Waterfall reward flow with real-input E2E verification. Fixed a production bug where quiz panel DOM never re-rendered after closing, rewrote E2E detection to use DOM observers + `getState()` (no panel accessor), and verified the full `rewardComplete:true` flow end-to-end including codex persistence across reload.

## Production Bug Fixed

### Quiz panel DOM not updating after close

**Files:** `src/game.js:320`, `src/sky_ridge_game.js:221`

**Root cause:** After a quiz answer, `setTimeout(() => panel.closePanel(), 600)` closes the panel internally but never calls `updateUi()`. The DOM `#modal` stays visible with stale content. This caused:
- E2E quiz panels appearing "stuck open"
- Subsequent `moveTo` calls could be blocked by stale modal DOM
- `readModalVisible()` returning stale `true`

**Fix:**
```js
// Before (broken)
setTimeout(() => panel.closePanel(), 600);
updateUi();  // called immediately, not after 600ms

// After (fixed)
setTimeout(() => { panel.closePanel(); updateUi(); }, 600);
```

## E2E Architecture Change

### DOM-based detection (no panel accessor needed)

**Discovery:** `__eduniJungleGame` is a frozen object (game.js:86-100) that does NOT expose `panel` or `sequences` closures. `readPanelPayload()` and `readSequences()` always return `null`.

**Solution:** Replaced with DOM observers + `getState()`:

| Old (broken) | New (working) |
|---|---|
| `readPanelPayload(p).kind` | `readModalTitle(p)` → `#modal-title` text |
| `readPanelPayload(p).revealReady` | `readConfirmVisible(p)` → `#modal-confirm` display |
| `readSequences(p).rewardShown` | Poll `readConfirmVisible(p)` until `true` |
| N/A | `readHintText(p)` → `#modal-hint` text |

### Waterfall reward flow (5-step sequence)

```
[1] A → open lookout panel (title="폭포 전망대")
[2] A → confirm lookout → auto-opens kingfisher
[3] A → confirm kingfisher encounter (title="물총새를 만났어!")
[4] Wait for revealReady (poll #modal-confirm visibility, ~2200ms timer)
[5] A → confirm reward → rewardComplete:true
```

**Key timing:** `REVEAL_REVEAL_MS = 2200ms` in `sequence_controller.js`. After kingfisher confirmation, `advanceSequences()` sets `revealReady: true` after this delay. The E2E polls `readConfirmVisible()` every 100ms.

### Quiz flow pattern

```
pressA(p) → open quiz panel
wMod(p) → wait for #modal visible
pickAnswer0(p) → ArrowUp + Enter, wait 600ms
← panel closes via setTimeout (with the fix, DOM now updates)
```

## E2E Results

### Full real-input regression (`jungle_real_input_e2e.mjs`)

| Stage | Result | Notes |
|---|---|---|
| Camp pass | ✅ | 3/3 clues, score=3, bluebird captured, codex persisted |
| Camp fail | ✅ | 0/3 score, bird not captured (correct) |
| Waterfall | ✅ | 3/3 clues, score=3, kingfisher captured, `rewardComplete:true`, codex persisted |
| Sky Ridge | ✅ | 3/3 clues, score=3, sky hawk captured, `rewardComplete:true`, codex persisted |
| 5-stage comparison | ✅ | 69 screenshots, 0 page errors |

### Waterfall reward debug (`wf_reward_debug.mjs`)

| Check | Result |
|---|---|
| All 3 quizzes complete (score=3/3) | ✅ |
| Lookout confirm → kingfisher → reward | ✅ |
| `rewardComplete: true` via real A key | ✅ |
| Codex persists across reload | ✅ |
| Waterfall state resets on reload | ✅ (session-only by design) |

### Unit tests

**190/190 pass, 0 fail**

## Files Changed

| File | Change |
|---|---|
| `src/game.js:320` | `setTimeout(() => { panel.closePanel(); updateUi(); }, 600)` |
| `src/sky_ridge_game.js:221` | Same fix |
| `tools/browser/jungle_real_input_e2e.mjs` | Replaced `readPanelPayload`/`readRewardComplete` with DOM readers; rewrote waterfall lookout→kingfisher→reward flow; fixed sky ridge bridge gate order |
| `tools/browser/wf_reward_debug.mjs` | Complete rewrite v3 — DOM-only detection, no panel accessor |

## Key Technical Findings

1. **`__eduniJungleGame` is frozen** — no `panel` or `sequences` access from E2E. DOM is the only reliable observer.
2. **Quiz panel close needs `updateUi()`** — `closePanel()` alone doesn't trigger DOM re-render.
3. **Non-quiz interactions need 2 A presses** — first A opens panel, second A confirms (panel blocks movement).
4. **Kingfisher reward reveal takes ~2200ms** — the E2E must poll `#modal-confirm` visibility, not check once.
5. **Codex persists to localStorage; waterfall state is session-only** — `createWaterfallState()` runs fresh on every page load.

## Commit

Current HEAD: `217e4cf` → pending commit with all changes.
