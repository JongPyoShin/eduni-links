# EDUNI Baduk — Save / Resume with localStorage

## Role

Implement a lightweight, browser-only save/resume feature for EDUNI Baduk.

Preserve all behavior already verified and merged through PR #60 and PR #61, especially:

- shared coach runtime integration;
- local two-player factual post-move explanation;
- 9×9 / 13×13 / 19×19 level behavior;
- 19×19 global AI strategy;
- existing routes and portal integration.

Do not redesign unrelated game code.

---

## Repository / baseline

Repository: `https://github.com/JongPyoShin/eduni-links.git`

Baseline branch: `feature/eduni-space-mvp`

Expected baseline HEAD at instruction creation:

`e4f397d2dde2dfdb03712022c1622b80d0f0155e`

Before work, fetch the latest branch and record the actual starting SHA.
If the branch moved, use the newest remote HEAD and report it.

Create a dedicated working branch, suggested:

`feature/baduk-save-resume`

Do not work directly on `feature/eduni-space-mvp` except for this instruction file.

---

## Read first

Read only the minimum relevant files first:

```text
AGENTS.md
nice-gui-1-1-7/AGENTS.md
.agent/PROMPT_EDUNI_BADUK_BEGINNER_REALTIME_COACH_06.md
.agent/PROMPT_EDUNI_BADUK_19X19_AI_09.md
.agent/PROMPT_EDUNI_BADUK_19X19_AI_VERIFY_10.md
nice-gui-1-1-7/portal_app/baduk.py
nice-gui-1-1-7/portal_app/baduk_v2_integration.py
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_v2.html
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_ai_strategy.js
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js
nice-gui-1-1-7/tests/test_baduk_v2_integration.py
nice-gui-1-1-7/tests/baduk_board_levels.test.mjs
nice-gui-1-1-7/tests/baduk_19x19_ai.test.mjs
```

Avoid broad repository exploration.

---

# Goal

A user should be able to leave `/baduk`, close or refresh the browser, return later, and continue the most recent unfinished game on the same browser/device.

This is a local convenience feature only.

No account, server API, cloud sync, analytics, child profile, identity, or personal data should be added.

Use browser `localStorage` only.

---

# Product behavior

## 1. Automatic save

Automatically persist the current playable game state after meaningful game-state changes.

Save after at least:

- confirmed human move;
- AI move;
- local two-player move;
- pass;
- level-changing reset/new game only after the new game state is initialized;
- mode change only when a new game/reset is intentionally created.

Do not save temporary coach preview state or ghost stones.

Do not write repeatedly during canvas render or pointer movement.

---

## 2. Resume on load

When `/baduk` loads and a valid unfinished save exists, restore it safely.

Restore enough state that the game behaves exactly as before reload.

At minimum restore:

- schema version;
- board size / level id;
- board position;
- current player;
- previous position / ko state needed for simple ko;
- captures;
- move count;
- consecutive passes;
- last move;
- game mode (`ai` or local two-player);
- coach enabled/disabled preference if appropriate to existing UI behavior;
- game-over flag only if preserving completed games is intentionally supported.

Prefer **not** to resume a completed/resigned game as an active game.

If a save represents a completed game, either clear it or treat it as non-resumable and start a fresh game.
Document the chosen behavior and test it.

---

## 3. AI-turn recovery

This is critical.

If an AI-mode save is restored while it is White/AI's turn, the page must not become stuck.

After restore:

- render the restored board first;
- then schedule the AI response exactly once;
- prevent duplicate AI moves if initialization or restore hooks run twice;
- do not save an inconsistent half-transition state.

Example:

```text
User confirms Black move
→ save state
→ page closes before AI responds
→ user reopens page
→ restored position shows Black's move
→ AI makes exactly one White move
```

Add regression coverage for this scenario.

---

## 4. New game / reset behavior

The user must have a clear way to intentionally discard the current saved game and start fresh.

Reuse the existing new-game/reset control if one already exists.
Do not add redundant buttons unless necessary.

When a new game is intentionally started:

- clear or replace the previous persisted game immediately;
- board is empty;
- captures reset;
- move count reset;
- current player reset correctly;
- ko/previousPosition reset;
- consecutive passes reset;
- gameOver reset;
- lastMove reset;
- selected level/mode follows the intended UI selection.

A later reload must not resurrect the discarded game.

---

## 5. Level isolation

Saved state must preserve the correct board level.

Verify:

- 9×9 save restores as 9×9;
- 13×13 save restores as 13×13;
- 19×19 save restores as 19×19;
- changing level via intentional new-game flow does not overlay an old board of another size;
- malformed board dimensions are rejected rather than partially restored.

---

## 6. Mode isolation

Save and restore the active game mode.

Verify both:

### AI mode

- current turn correct;
- AI resumes correctly if needed;
- coach still works after restore;
- 19×19 strategy still works after restore.

### Local two-player mode

- current turn correct;
- no AI is scheduled;
- local factual explanation still appears on future moves;
- restored state does not infer or recreate old coach popups.

---

# Storage design

## Storage key

Use one explicit namespaced key, for example:

```text
eduni.baduk.v1
```

or another equally clear EDUNI-specific key.

Do not use generic names such as `game`, `state`, or `save`.

---

## Versioned schema

Persist a versioned JSON object.

Suggested shape:

```javascript
{
  version: 1,
  savedAt: 0,
  levelId: 'beginner' | 'intermediate' | 'standard',
  boardSize: 9 | 13 | 19,
  mode: 'ai' | 'local',
  board: [...],
  currentPlayer: 1 | 2,
  previousPosition: ...,
  captures: {1: 0, 2: 0},
  moveCount: 0,
  consecutivePasses: 0,
  lastMove: null | {row, col, color},
  gameOver: false,
  coachEnabled: true | false
}
```

Adapt field names to the actual runtime state rather than forcing this exact object.

Do not persist derived/transient state if it can be recalculated.

Do not persist:

- canvas dimensions;
- DOM state;
- coach card visibility;
- ghost/preview move;
- `aiThinking` as a durable truth;
- random score jitter;
- timers;
- user identifiers;
- personal information.

---

# Validation / corruption safety

Never trust localStorage JSON blindly.

Restore only if all critical fields are valid.

At minimum validate:

- JSON parse succeeds;
- supported schema version;
- supported board size;
- level id matches board size;
- board is a square array of expected dimensions;
- each intersection contains only allowed stone values;
- current player valid;
- mode valid;
- captures are finite non-negative integers;
- move count and pass count are finite non-negative integers;
- lastMove is null or within board bounds;
- previousPosition/ko representation matches the engine's expected shape;
- game is not obviously inconsistent.

If any critical validation fails:

- do not partially restore;
- discard/ignore the invalid save;
- start a clean game;
- do not crash;
- do not block `/baduk` startup.

If `localStorage.getItem`, `setItem`, or `removeItem` throws because storage is blocked/quota-limited, the game must continue normally without persistence.

Persistence is enhancement-only, never required for play.

---

# Architecture

Prefer a small pure/shared JavaScript persistence helper rather than adding more large inline code to `eduni_baduk_v2.html`.

Suggested file:

```text
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_persistence.js
```

Responsibilities may include:

- schema/version constant;
- serialize/save;
- parse/validate/load;
- clear;
- pure state validation.

Wire it through the existing v2 runtime integration so the same implementation tested by Node is the one served by `/baduk`.

Do not repeat the previous mistake where tests exercise a separate implementation from production runtime.

If integration markers drift, fail safe: serve the already-working game without persistence rather than a partially patched/broken page.

---

# UI / UX

Keep UI minimal.

The feature should not create modal-heavy UX.

Preferred behavior:

- seamless automatic resume;
- small unobtrusive indication such as `지난 대국을 이어서 시작했어요` only if appropriate;
- existing reset/new-game action discards saved state.

Do not require the user to press a manual Save button.

Do not show technical terms such as `localStorage`, JSON, schema, or browser storage to children.

Do not show a resume prompt on every page load if seamless restore is safe.

---

# Required regression tests

Add focused Node tests for the persistence helper.

Prove at least:

1. Valid 9×9 state serializes and restores.
2. Valid 13×13 state serializes and restores.
3. Valid 19×19 state serializes and restores.
4. Board contents, captures, turn, move count, last move, and ko state survive round trip.
5. AI/local mode survives round trip.
6. Unsupported schema version is rejected.
7. Malformed JSON is rejected safely.
8. Wrong board dimension is rejected.
9. Invalid stone value is rejected.
10. Out-of-range last move is rejected.
11. Storage exception does not break game startup/play.
12. New-game clear prevents old state from returning.
13. Preview/ghost state is not persisted.
14. AI-turn restored state schedules exactly one AI move.
15. Local-mode restored state schedules zero AI moves.
16. 19×19 restored game still uses `EDUNIBadukAiStrategy` on subsequent AI moves.

Add/update Python integration tests proving the served `/baduk` response actually injects and uses the persistence helper.

Keep existing tests green:

```text
baduk_coach_logic.test.mjs
baduk_board_levels.test.mjs
baduk_19x19_ai.test.mjs
test_baduk_v2_integration.py
test_baduk_19x19_ai.py
test_baduk_game.py
```

Pre-existing Windows cp949 failures may be reported separately if unchanged.

---

# Browser acceptance

Test on real browser if available.

## Desktop flow

### AI 9×9

```text
Start game
→ make Black move
→ allow AI move
→ refresh page
→ same board restored
→ correct next player
→ continue normally
```

### AI interrupted before AI reply

```text
Start game
→ confirm Black move
→ reload/close immediately before White reply
→ reopen
→ Black move restored
→ AI makes exactly one reply
```

### Local two-player

```text
Play several moves
→ refresh
→ exact board + next player restored
→ continue
→ no AI move occurs
```

### Level coverage

Repeat persistence smoke for:

- 9×9
- 13×13
- 19×19

### New game

```text
Have saved position
→ choose new/reset game
→ empty board
→ reload
→ old position does not return
```

### Corrupt save

Manually place malformed/unsupported JSON in the storage key.
Reload `/baduk`.
Expected: clean game loads, no fatal console error.

---

## Mobile 360×800

Verify:

- save/resume does not introduce overflow;
- any resume indicator is readable and non-blocking;
- reset/new-game remains usable;
- coach card remains usable;
- 19×19 board still fits as previously verified.

---

# Route / regression smoke

Verify:

```text
/baduk
/baduk/
/games/eduni-baduk
/portal
```

No changes should be required to unrelated routes.

Do not modify:

- Bubble;
- Omok;
- Hanja;
- Space game;
- Facto;
- Docker/deployment configuration;
- public launcher behavior;
- unrelated portal layout.

---

# Privacy / safety requirements

Persistence must stay entirely in the user's browser.

Do not:

- send game state to the server;
- add API endpoints;
- add cookies for this feature;
- add analytics/events;
- add account identifiers;
- store child name, age, profile, or other personal information;
- add external libraries or network calls.

The saved object should contain only technical board/game state.

---

# Validation commands

Run focused tests first, then full repo validation.

```powershell
cd nice-gui-1-1-7

node --test tests/baduk_persistence.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_board_levels.test.mjs

python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_game

python scripts/validate_content.py
python -m unittest discover -s tests

cd ..
git diff --check
```

Report exact pass/fail counts.

Do not hide skips or pre-existing failures.

---

# Completion criteria

This task is complete only when:

- runtime and test persistence implementation are the same;
- valid unfinished games resume after reload;
- AI-turn restore cannot freeze or double-move;
- local mode cannot accidentally schedule AI;
- reset/new game removes the old persisted game;
- invalid/corrupt saves fail safely;
- 9×9/13×13/19×19 all restore correctly;
- coach behavior remains intact;
- 19×19 strategy remains intact;
- existing Baduk rules remain intact;
- no network/server persistence added;
- focused tests pass;
- repository validation completes with only documented pre-existing failures;
- desktop and 360×800 browser QA pass.

---

# Final report format

Use this structure:

```text
BADUK SAVE/RESUME VERIFICATION

Branch:
Commit:

Overall:
PASS / CONDITIONAL PASS / FAIL

1. Storage schema / validation
2. Runtime integration
3. 9×9 restore
4. 13×13 restore
5. 19×19 restore
6. AI-turn recovery
7. Local two-player restore
8. New-game clear
9. Corrupt/blocked storage safety
10. Coach regression
11. 19×19 AI regression
12. Automated tests
13. Browser QA
14. Route smoke
15. Findings
16. Remaining risks
17. Recommendation
```

Do not merge automatically.
