# Baduk AI Danger Coach + Undo — Phase 1 Report

## Branch

- branch: `feature/baduk-ai-danger-coach`
- base: `feature/eduni-space-mvp`
- base SHA at implementation start: `4a37891300815446fb2d949b1989f28cafef9272`
- implementation code/test SHA before this report: `aacb46f9e6b77371d55995ff7f804937f56d3dca`

## Implemented

### 1. AI danger explanation

Shared coach logic now includes deterministic `analyzeAiDanger(beforeBoard, afterBoard, aiMove)` analysis.

Categories:

- `critical`: black stones were actually captured by the AI move
- `danger`: a surviving black group worsened from 2+ liberties to exactly 1
- `caution`: a surviving black group worsened from 3+ liberties to exactly 2
- `safe`: no material new danger caused by that AI move

The analysis compares actual before/after board state and does not use AI scoring labels as danger evidence.

Child-facing AI reason copy was simplified around `숨 쉴 곳`, `내 돌`, `AI 돌`, and `잡힐 수 있어요`.

The served v2 integration passes the same shared danger result into the AI coach card and reuses existing board overlay markers for affected stones/liberties.

### 2. Undo

A visible `무르기` button is injected into the Baduk v2 controls.

Snapshot-based state restoration includes:

- board
- current player
- previous position / simple-ko state
- captures
- move count
- consecutive passes
- last move
- game-over state
- board size / level / mode compatibility

Behavior:

- AI mode: snapshot is recorded before each human decision, so one undo returns to the position before the human move and also removes the completed AI response.
- AI-thinking window: undo invalidates the scheduled AI generation token and returns to the pre-human snapshot.
- local mode: one undo restores exactly one previous action.
- pass participates in history.
- resign is intentionally non-undoable in Phase 1; resignation clears undo history.

Undo history is bounded to 240 snapshots.

### 3. AI turn / input freeze safety

AI scheduling now uses a generation token and timer handle.

`invalidateAi()` is used by reset, restore, undo and resign so stale callbacks cannot mutate a newer game state.

Human board input now gives explicit feedback instead of silently ignoring input while AI is thinking.

If AI mode reaches `currentPlayer === WHITE` while `aiThinking === false`, tapping the board self-heals by calling `scheduleAi()` rather than remaining permanently stuck.

### 4. Persistence interaction

After every committed move/pass and after undo, the current restored state is saved through existing `EDUNIBadukPersistence`.

Mandatory guarantee implemented: after undo, reload must not resurrect the undone moves.

Phase 1 limitation: undo history itself is runtime-only and is not persisted across page reload. A restored game resumes safely with an empty undo stack.

## Files changed

- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js`
- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py`
- `nice-gui-1-1-7/tests/baduk_coach_logic.test.mjs`
- `nice-gui-1-1-7/tests/test_baduk_v2_integration.py`

## Test coverage added

Shared coach tests now cover:

- exact capture danger count
- new 1-liberty danger
- new 2-liberty caution
- unrelated pre-existing danger is not blamed on a remote AI move
- input board purity
- child-friendly AI capture/atari wording
- jitter exclusion from explanation

Integration tests now cover:

- shared danger logic is the runtime logic
- one AI danger analysis call per AI move path
- undo button/runtime snapshot wiring
- generation-token AI scheduling
- pointer self-heal path
- pass history
- persistence restore invalidation
- integrated JavaScript syntax check when Node is available

## Validation status

Repository changes were made through the connected GitHub workspace. This environment cannot execute the repository's Windows browser/server stack directly, so browser QA and the full local test commands remain **NOT VERIFIED** at this phase.

Do not merge from this report alone. Run the dedicated final verification prompt before marking merge-ready.
