# EDUNI Baduk — PR #62 AI-Turn Restore Fix Verification

## Purpose

Independently verify the HIGH finding from Prompt 12 is fixed on `feature/baduk-save-resume` and that the fix introduces no regressions.

Repository: `JongPyoShin/eduni-links`

PR: #62 — `WIP: add Baduk local save and resume`

Implementation fix commit: `b5d143afb37b7c5ea8015c9d524b73ca55442562`

Read first:

- `.agent/PROMPT_EDUNI_BADUK_SAVE_RESUME_11.md`
- `.agent/PROMPT_EDUNI_BADUK_SAVE_RESUME_VERIFY_12.md`
- `BADUK_PROMPT11_SAVE_RESUME_REPORT.md`
- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_persistence.js`
- `nice-gui-1-1-7/tests/test_baduk_persistence_integration.py`
- `nice-gui-1-1-7/tests/baduk_persistence.test.mjs`

## Defect that must be closed

Prompt 12 found that restoring a saved AI-mode game with `currentPlayer === WHITE (2)` restored the board but never resumed the AI turn.

The fix adds this guard inside `_eduniRestore()` after `updateHud();render();`:

```javascript
if(s.mode==='ai'&&s.currentPlayer===2&&typeof scheduleAi==='function')scheduleAi();
```

A Python integration regression test also asserts this restore scheduling guard is injected exactly once.

## Required verification

### 1. Static/runtime alignment

Confirm the served `/baduk` response contains the AI-turn restore scheduling guard exactly once and that it is inside the same IIFE where `scheduleAi()` is defined.

FAIL if the test checks a different implementation from the served runtime.

### 2. Actual browser AI-turn restore — blocker test

Use a real browser/runtime, not only static inspection.

Create or inject a valid saved AI-mode position with:

- `mode === 'ai'`
- `currentPlayer === 2`
- valid board/level/capture/move state

Reload `/baduk`.

Required result:

1. saved board/state restores correctly;
2. AI turn starts automatically without a human click;
3. AI places exactly **one** white move;
4. turn returns to black/human;
5. move count increases by exactly one;
6. no second/duplicate AI move occurs after waiting long enough for another scheduled timer;
7. resulting state is persisted normally;
8. no console error.

Any zero AI moves or more than one AI move => FAIL.

### 3. Human-turn restore regression

Restore AI mode with `currentPlayer === 1`.

Required:

- no automatic AI move;
- human can make a move normally;
- then AI responds once through the normal path.

### 4. Local two-player restore regression

Restore `mode === 'local'` for both black-turn and white-turn states.

Required:

- no AI scheduling;
- restored current player is preserved;
- normal local move flow continues.

### 5. Reset/new-game interaction

After an AI-turn restore has triggered its one AI response, start a new game.

Confirm:

- saved old game is cleared/replaced appropriately;
- no stale delayed AI callback places a stone into the new game;
- board remains valid.

### 6. Board-size coverage

Run the AI-turn restore scenario at minimum on 9×9 and one of 13×13/19×19. Confirm level/board size restore and one-AI-response behavior.

### 7. Focused automated tests

From `nice-gui-1-1-7` run at minimum:

```powershell
python -m unittest tests.test_baduk_persistence_integration
node --test tests/baduk_persistence.test.mjs
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
python -m unittest tests.test_baduk_v2_integration
python scripts/validate_content.py
```

Also run:

```powershell
git diff --check
```

Report exact counts. Pre-existing Windows cp949 failures may be reported separately only if unchanged from the known baseline.

### 8. Mobile smoke

At 360×800, verify a restored game remains usable and the automatic AI response does not cause overflow, frozen controls, or broken coach UI.

## Scope

Verification only. Do not refactor, redesign persistence, add dependencies, change scoring/AI strength, or modify unrelated files.

If a new defect is found, report it with severity and exact reproduction. Do not silently fix it unless explicitly instructed.

## Verdict

Return one of:

- `PASS — MERGE READY`
- `CONDITIONAL PASS` with exact remaining non-blocking findings
- `FAIL` with blocker(s)

The PR is merge-ready only if the actual browser AI-turn restore produces exactly one AI response and all focused regressions pass.
