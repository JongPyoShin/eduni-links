# EDUNI Baduk PR #62 — Save / Resume Final Verification

## Role

You are the final verification agent for Baduk PR #62 (`feature/baduk-save-resume`).

This is a **verification-only** task. Do not refactor unrelated code. Do not merge PR #62. If you find a defect, report it first; only fix it when explicitly asked.

The implementation has already passed focused Python/JS tests and browser QA once. Your job is to independently verify the committed branch and especially the real persistence lifecycle in a browser.

If an item cannot be executed, mark it `NOT VERIFIED`; never infer PASS from source inspection alone.

---

## Repository / PR

Repository: `https://github.com/JongPyoShin/eduni-links.git`

Verification branch: `feature/baduk-save-resume`

Base branch: `feature/eduni-space-mvp`

Pull Request: `#62 — WIP: add Baduk local save and resume`

Expected implementation commit before this verification prompt: `69abe7662c9fdf3b24813668641d672abce50caf`

At the start:

```bash
git fetch origin
git checkout feature/baduk-save-resume
git pull --ff-only origin feature/baduk-save-resume
git rev-parse HEAD
git status --short
```

Record the actual HEAD you verify. Because this prompt itself adds one commit after `69abe766...`, verify the latest remote branch HEAD and report it exactly.

Do not merge PR #62.

---

## Read first

Read only the minimum relevant files:

```text
AGENTS.md
nice-gui-1-1-7/AGENTS.md
.agent/PROMPT_EDUNI_BADUK_SAVE_RESUME_11.md
BADUK_PROMPT11_SAVE_RESUME_REPORT.md
nice-gui-1-1-7/portal_app/baduk.py
nice-gui-1-1-7/portal_app/baduk_v2_integration.py
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_persistence.js
nice-gui-1-1-7/tests/baduk_persistence.test.mjs
nice-gui-1-1-7/tests/test_baduk_persistence_integration.py
nice-gui-1-1-7/tests/test_baduk_v2_integration.py
```

Do not scan or modify unrelated portal/game code unless needed to reproduce a failure.

---

## Verification goals

Verify all of the following:

1. `/baduk` serves the persistence integration in the real runtime.
2. Only browser-local `localStorage` is used; no server persistence/network upload is introduced.
3. A committed move is automatically saved.
4. Browser reload restores the exact board state and metadata.
5. AI mode restore behaves correctly for both human turn and AI turn.
6. If restored on AI turn, exactly one AI response occurs — no duplicate move/timer loop.
7. Local two-player mode restores current player and board correctly.
8. 9×9, 13×13, and 19×19 saved games restore with the correct board size/level.
9. New game/reset clears the prior saved game so stale state does not reappear on reload.
10. Malformed, partial, incompatible, or old saved data fails safely and does not break `/baduk`.
11. Capture counts, move count, pass count, last move, current player, mode, level, and ko-related state remain consistent where stored.
12. Existing coach, AI, board-level, and 19×19 strategy behavior do not regress.
13. Desktop and 360×800 mobile remain usable.
14. No blocking console/runtime errors occur.

---

## Phase 1 — Environment / startup

Use the repository's existing documented startup method. Do not add dependencies or change deployment/network configuration.

Record:

- OS
- Python version
- Node version
- browser/runtime used
- exact verified git SHA
- `git status --short`
- startup command
- host/port

Prefer the same app path used in previous Baduk verification.

---

## Phase 2 — Runtime injection

With the real running app, verify `/baduk` loads successfully.

Confirm in the served runtime/browser that:

- `EDUNIBadukPersistence` exists;
- persistence integration is actually wired to the current v2 game;
- persistence code is inside the same runtime/IIFE scope where required helpers are available;
- save/restore calls are runtime-used, not merely present in unused source;
- there are no duplicate persistence script injections.

Source-only presence is insufficient for PASS.

---

## Phase 3 — Fresh-state baseline

Before persistence tests:

1. Clear the Baduk localStorage key(s).
2. Reload `/baduk`.
3. Confirm a clean new game appears.
4. Confirm no exception occurs when no saved state exists.

Record the exact storage key used.

---

## Phase 4 — Auto-save after move

Use AI mode, beginner 9×9 unless another mode is needed for reproducibility.

1. Start from empty storage.
2. Commit one legal human move through the normal UI flow.
3. Let the move fully commit.
4. Inspect localStorage.
5. Confirm saved payload exists immediately after the committed move.
6. Confirm the payload represents the actual current game state.

Verify at minimum where applicable:

- schema/version
- board size / level
- board contents
- mode
- current player
- move count
- captures
- consecutive passes
- last move
- previous/ko state if persisted
- game-over flag if part of schema

A save function existing without automatic invocation is FAIL.

---

## Phase 5 — Reload / exact restore

Create a small non-trivial game state, then reload the page.

Before reload, record:

- board coordinates of all stones or enough evidence to compare exactly;
- current player;
- captures;
- move count;
- selected level;
- selected mode;
- last move.

After reload, confirm the state matches.

The restored game must not be reset to a fresh board by `resetGame()` or other initialization.

If the UI displays a restore/resume indicator, verify it is coherent; such an indicator is not required unless implemented.

---

## Phase 6 — AI-turn restore: exactly one AI reply

This is a merge-blocking persistence check.

Construct or inject a valid saved AI-mode state where it is WHITE/AI's turn.

Then reload `/baduk` and observe:

1. saved position is restored;
2. AI responds automatically;
3. AI makes **exactly one** move;
4. after that move, turn returns to the human normally;
5. no second AI move appears after waiting longer than the normal AI delay;
6. no duplicate timer/schedule loop occurs;
7. localStorage is updated to the post-AI state.

Count stones/moveCount before and after to prove exactly one AI move occurred.

If the environment cannot practically create an AI-turn saved state, mark this phase `NOT VERIFIED`; do not infer it from code.

---

## Phase 7 — Human-turn AI-mode restore

Save an AI-mode state where it is BLACK/human's turn, reload, and confirm:

- no automatic AI move occurs;
- human can continue normally;
- coach preview/confirm still works;
- after the next human move, AI replies once as usual.

---

## Phase 8 — Local two-player restore

Switch to local two-player mode.

1. Make at least 3 moves so the side to move is unambiguous.
2. Reload.
3. Confirm exact board restoration.
4. Confirm the correct next player is restored.
5. Make one more move and verify alternation continues correctly.
6. Confirm local factual coach text (`이 수로 바뀐 점`) still works when coach is enabled.

No human-intent guessing should be introduced by persistence changes.

---

## Phase 9 — Board sizes / level restore

Verify persistence independently for:

- beginner 9×9
- intermediate 13×13
- standard 19×19

For each level:

1. select level;
2. commit at least one move;
3. reload;
4. confirm correct board size/grid;
5. confirm saved stone(s) are in the correct coordinates;
6. confirm level selector/text matches restored state;
7. confirm a subsequent move works.

There must be no 9/13/19 cross-level leakage.

For 19×19, also confirm the PR #61 global AI still works after restore where practical.

---

## Phase 10 — New game / reset clears persistence

This is a required browser test.

1. Create a saved non-empty game.
2. Trigger the normal new-game/reset action.
3. Confirm the board becomes a fresh game.
4. Confirm the prior saved payload is removed or replaced with a clean-new-game state according to implementation semantics.
5. Reload the browser.
6. Confirm the old stones/state do **not** come back.

Stale game resurrection after reset is FAIL.

---

## Phase 11 — Pass / capture / metadata persistence

Where practical, verify non-board state as well.

At minimum test one of these tactically meaningful states manually and rely on automated tests for the rest:

- a capture has occurred and capture counts survive reload;
- a pass has occurred and consecutive pass state survives reload correctly;
- lastMove remains correct after reload.

If a specific field is not part of the product's intended persistence schema, say so explicitly rather than treating it as failure.

---

## Phase 12 — Corrupt / incompatible storage safety

Manually place invalid values into the Baduk localStorage key and reload. Cover at least:

1. invalid JSON;
2. valid JSON missing required fields;
3. impossible board size or malformed board dimensions;
4. unsupported schema/version if versioning exists.

Expected behavior:

- `/baduk` still loads;
- no uncaught exception;
- invalid payload is ignored/cleared safely;
- a playable clean game is shown;
- console has no blocking persistence error.

Do not accept partially corrupted state.

---

## Phase 13 — Privacy / storage boundary

Verify persistence remains entirely local to the browser.

Confirm there is no new:

- server API endpoint for save data;
- fetch/XHR/WebSocket call containing game state;
- analytics event containing saved board state;
- cookie-based persistence;
- account/child identifier attached to saved state.

Normal app asset requests do not count as persistence upload.

Report the localStorage key and a concise schema summary, but do not dump unnecessarily large payloads.

---

## Phase 14 — Regression tests

Run at least:

```bash
cd nice-gui-1-1-7
node --test tests/baduk_persistence.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_board_levels.test.mjs
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_v2_integration
python scripts/validate_content.py
cd ..
git diff --check
```

Also run broader repository tests if practical according to `AGENTS.md`.

If the known Windows cp949 failures reproduce unchanged, report them as pre-existing and separate from PR #62.

---

## Phase 15 — Desktop / mobile browser QA

Desktop: approximately 1280×800 or larger.

Mobile: exactly or approximately 360×800.

Verify on both:

- game loads;
- restored game renders correctly;
- board remains tappable;
- coach card remains usable;
- controls remain reachable;
- no blocking horizontal overflow;
- reset/new game works;
- reload restore works;
- no console errors.

Capture screenshots if supported:

1. desktop saved game before reload;
2. desktop same game after reload;
3. mobile restored game;
4. optional AI-turn restore evidence.

Do not commit screenshots unless explicitly instructed.

---

## Severity / defect format

For each defect report:

```text
Severity: BLOCKER / HIGH / MEDIUM / LOW
Area:
Viewport / mode / level:
Exact reproduction:
Expected:
Actual:
Console/error evidence:
Storage payload evidence:
Likely file/function:
Regression: YES / NO / UNKNOWN
```

Do not auto-fix defects during verification.

---

## Merge verdict

### PASS / MERGE READY

Only if all critical browser persistence flows actually pass:

- auto-save;
- exact reload restore;
- AI-turn restore with exactly one AI move;
- human-turn restore;
- local two-player restore;
- 9/13/19 level restore;
- new-game stale-state prevention;
- corrupt-storage safe fallback;
- no blocking console errors;
- focused regression tests green.

### CONDITIONAL PASS

Use when only non-critical items are unavailable or LOW/MEDIUM findings remain and all core persistence flows pass.

### FAIL

Use for any issue such as:

- saved move not written;
- restore loses/corrupts board state;
- `resetGame()` overwrites restored state;
- duplicate AI move after restore;
- stale state returns after reset;
- malformed storage crashes the game;
- cross-level restore corruption;
- persistence causes coach/AI/runtime regression.

Do not claim merge-ready from source inspection alone.

---

## Final report format

```text
BADUK PR #62 FINAL VERIFICATION COMPLETE
Verified branch: feature/baduk-save-resume
Verified commit: <sha>
Overall: PASS / CONDITIONAL PASS / FAIL

Phase results:
1. Runtime injection — ...
2. Fresh baseline — ...
3. Auto-save — ...
4. Reload restore — ...
5. AI-turn exactly-one reply — ...
6. Human-turn restore — ...
7. Local 2P restore — ...
8. 9/13/19 restore — ...
9. Reset clears stale game — ...
10. Metadata persistence — ...
11. Corrupt storage safety — ...
12. Privacy/local-only — ...
13. Automated regression — ...
14. Desktop/mobile QA — ...
15. Console/runtime errors — ...

Findings:
- ...

Recommendation:
MERGE READY / KEEP DRAFT / FIX REQUIRED
```

Do not merge PR #62 yourself.
