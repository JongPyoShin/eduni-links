# BUBBLE SHOOTER PHASE 1 — AUDIT + STABILIZATION REPORT

**Verified branch:** `feature/bubble-shooter-audit-fix`
**Verified commit:** `3b97dee1216f2667eea56fb8b1f6dcfc1b485378` (Prompt 21 final verification)
**Base branch:** `feature/eduni-space-mvp`
**Overall:** PASS — MERGE READY

---

## Files Changed

| File | Change |
|------|--------|
| `nice-gui-1-1-7/app.py` | Fixed `afterTurn(addBubble)` parameter, generation counter, stale callback guard |
| `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js` | New: shared pure-logic module |
| `nice-gui-1-1-7/tests/bubble_shooter_logic.test.mjs` | New: 19 JS unit tests |
| `nice-gui-1-1-7/tests/test_bubble_shooter_integration.py` | New: 11 Python integration tests |

---

## Original Defects Found

### 1. Correct answer does not reduce bubble count (HIGH)
**Before:** `afterTurn()` always called `addBackRowBubble()`. A correct hit removed one bubble but immediately added one back, making correct answers feel like no progress.
**After:** `afterTurn(addBubble)` — correct hits call `afterTurn(false)`, misses call `afterTurn(true)`.

### 2. No stale callback protection (MEDIUM)
**Before:** `showPraise()` used `window.setTimeout` without generation tracking. Restarting during praise could corrupt the new game.
**After:** `state.generation` counter incremented on `startGame()`, checked in praise timeout callback.

### 3. No automated tests for game logic (MEDIUM)
**Before:** Only route existence assertion (`assertIn("@ui.page('/bubble-shooter')", src)`).
**After:** 19 JS unit tests + 11 Python integration tests covering the full game contract.

---

## Game Contract After Fix

### Correct shot
- Remove exactly the target bubble
- +100 score exactly once
- Show praise feedback
- **No pressure bubble added**
- Next target from remaining live bubbles

### Wrong shot / miss
- No score
- Target remains (if hit wrong bubble)
- Exactly one pressure bubble added
- Game continues unless danger line crossed

### State safety
- One resolution per shot
- One score mutation per correct answer
- At most one pressure-row mutation per turn
- Generation counter prevents stale praise callback after restart

---

## Web/Android Differences

| Aspect | Web | Android |
|--------|-----|---------|
| Correct: pressure? | **No** (fixed) | No (already correct) |
| Miss: pressure? | Yes | Yes |
| Correct delay | 980ms (praise anim) | 520ms (text only) |
| Score per hit | +100 | +100 |
| Questions source | Server JSON | Hardcoded 64 pairs |
| Praise display | Character image + text | Text message only |

**Remaining difference:** Question data source (JSON vs hardcoded). Documented for future Phase 2 data unification.

---

## Automated Test Results

| Suite | Count | Result |
|-------|-------|--------|
| `bubble_shooter_logic.test.mjs` | 19 | 19/19 PASS |
| `test_bubble_shooter_integration.py` | 11 | 11/11 PASS |
| `test_routes.py` | 7 | 7/7 PASS |
| `validate_content.py` | — | VALID |
| `git diff --check` | — | Clean |
| `discover -s tests` (full) | 120 | 115/120 (5 pre-existing cp949) |

---

## Browser QA Results

### Desktop (1280×800) — 9/9 PASS
- Page loads with canvas ✅
- Score display shows 0 ✅
- Status prompt exists ✅
- Restart button exists ✅
- Sound toggle exists ✅
- Shot interaction works ✅
- Restart resets score ✅
- No console errors ✅
- No horizontal overflow ✅

### Portrait Mobile (360×800) — 9/9 PASS
- All checks pass ✅
- No horizontal scroll ✅

### Landscape Mobile (800×360) — 9/9 PASS
- All checks pass ✅
- Game remains playable ✅

### Route Smoke — 4/4 PASS
- `/` → 200 ✅
- `/bubble` → 200 ✅
- `/bubble-shooter` → 200 ✅
- `/portal` → 200 ✅

### Restart Race Test — SKIP
- Automated random shots did not hit a correct bubble within 8 attempts
- No stale callback errors observed ✅
- Manual verification recommended

---

## Console Errors

Zero new console/runtime errors across all viewports.

---

## Remaining Risks

1. **Restart race test not fully automated** — the praise timeout guard is implemented and tested at the unit level, but the browser-level race condition was not triggered by random automated shots. Recommend manual spot-check.
2. **Android question data** — native uses hardcoded pairs while web uses server JSON. Phase 2 candidate for data unification.
3. **Android praise delay** — 520ms vs web 980ms. Cosmetic difference, not a bug.

---

## Recommendation

**MERGE READY**

All Phase 1 acceptance criteria met:
- Correct answers visibly reduce bubble count ✅
- Misses increase pressure exactly once ✅
- Score changes exactly once per correct answer ✅
- Target always maps to a live visible bubble ✅
- Restart cannot be corrupted by stale delayed callbacks ✅
- Web Bubble Shooter has focused automated logic tests ✅
- Android core progression semantics verified and aligned ✅
- `/bubble-shooter` and existing routes remain compatible ✅
- Desktop + portrait + landscape browser QA pass ✅
- No new console/runtime errors ✅
- No unrelated broad refactor ✅

---

## Runtime/Test Alignment Closure

**Tested commit:** `3b97dee` (Prompt 21 final verification, after base sync)

### Base sync result
```
base HEAD:       4a37891
feature HEAD:    3b97dee
merge-base:      4a37891
ahead_by:        1 (merge commit)
behind_by:       0
mergeable:       clean
```

### How the shared JS is injected/loaded

1. `shooter_html()` calls `_load_shooter_logic_js()` which reads `portal_app/static_games/eduni_bubble_shooter_logic.js` from disk at serve-time (cached in `_SHOOTER_LOGIC_JS`).
2. The file contents are wrapped in `<script id="eduni-shooter-logic">...</script>`.
3. The template placeholder `__SHOOTER_LOGIC_SCRIPT__` is replaced with this script tag, which appears **before** the inline game `<script>`.
4. The inline script assigns `const L = window.EDUNIBubbleShooterLogic;` at IIFE entry, making the shared module available for decision delegation.
5. If the shared file cannot be loaded, the placeholder is replaced with empty string, and all inline fallback paths activate (fail-safe).

### Exact shared functions used by live runtime

| Function | Inline call site | Purpose |
|----------|-----------------|---------|
| `resolveShot` | `handleHit()` | Correct/miss/clear outcome, score delta, pressure decision |
| `isDanger` | `afterTurn()` | Danger line check after pressure add |
| `selectTarget` | `chooseCurrent()` | Front-row target selection |
| `pointerToCss` | `pointerPoint()` | Pointer event to CSS-pixel coordinates |
| `cssToLogical` | (passthrough contract) | Future-proofing coordinate pipeline |
| `isGenerationValid` | `showPraise()` timeout | Stale callback prevention after restart |

### Deterministic restart-race result (Prompt 21)

**Test method:** Playwright `page.mouse` API fires real pointer events to achieve correct hit (score +100), then immediately clicks restart via JS. Waits 1.5 seconds (exceeding 980ms praise delay). Verifies score remains 0 and new target is valid.

| Round | Correct hit | Score after restart | New target valid | Score stable | Console errors |
|-------|-------------|--------------------|-----------------|--------------|----------------|
| 1 | Yes (+100) | 0 | Yes | 0 | 0 |
| 2 | Yes (+100) | 0 | Yes | 0 | 0 |

**Verdict:** Stale praise callback does NOT corrupt restarted game. Generation guard (`isGenerationValid`) works as designed.

### Automated test counts

| Suite | Count | Result |
|-------|-------|--------|
| `bubble_shooter_logic.test.mjs` | 19 | 19/19 PASS |
| `test_bubble_shooter_integration.py` | 15 | 15/15 PASS |
| `test_routes.py` | 7 | 7/7 PASS |
| `validate_content.py` | — | VALID |
| `discover -s tests` (full) | 124 | 119/124 (5 pre-existing cp949) |
| `git diff --check` | — | Clean |

### Browser counts by viewport

| Viewport | Checks | Result |
|----------|--------|--------|
| Desktop 1280x800 | 16 | 16/16 PASS |
| Portrait 360x800 | 16 | 16/16 PASS |
| Landscape 800x360 | 16 | 16/16 PASS |
| **Total** | **48** | **48/48 PASS** |

Key browser checks verified:
- `window.EDUNIBubbleShooterLogic` global exists with all 6 functions
- `const L = window.EDUNIBubbleShooterLogic` present in inline script
- Runtime calls `L.resolveShot`, `L.isDanger`, `L.selectTarget`, `L.pointerToCss`
- No console/runtime errors across all viewports
- No horizontal overflow

### Console error count
Zero across all viewports.

### PR mergeability state
PR #63 is mergeable. Branch is up to date with base (behind_by = 0).

### Remaining risks
1. **Android uses separate implementation** — `NativeBubbleShooterActivity.java` is independent; question-data unification deferred to Phase 2.
2. **`cssToLogical` is a passthrough** — exists as an explicit contract for future DPR handling changes; no behavioral difference.

### Recommendation
**PASS — MERGE READY**

- Node tests and `/bubble-shooter` execute the same decision implementation (`EDUNIBubbleShooterLogic` shared module)
- Integration tests prove actual generated-page wiring (15 tests covering script injection, L delegation, and function presence)
- Correct/miss progression matches Prompt 14
- **Deterministic restart-race browser test PASSES** (2 rounds, correct hit -> immediate restart -> 1.5s wait -> score stable at 0)
- Mobile aiming passes across all viewports
- Latest base is integrated cleanly (behind_by = 0)
- Verified SHA is correct (`3b97dee`)
- Full validation is acceptable
- PR #63 is mergeable
