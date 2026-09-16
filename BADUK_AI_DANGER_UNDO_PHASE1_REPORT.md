# Baduk AI Danger Coach + Undo + Hint/Rules — Phase 1 Report

## Branch

- branch: `feature/baduk-ai-danger-coach`
- base: `feature/eduni-space-mvp`
- base SHA at implementation start: `4a37891300815446fb2d949b1989f28cafef9272`
- latest feature code/test SHA before this report update: `88062d7551c63917c2d809dd76544e5a5bcfd45a`

## Implemented

### 1. AI danger explanation

Shared coach logic includes deterministic `analyzeAiDanger(beforeBoard, afterBoard, aiMove)` analysis.

Categories:

- `critical`: black stones were actually captured by the AI move
- `danger`: a surviving black group worsened from 2+ liberties to exactly 1
- `caution`: a surviving black group worsened from 3+ liberties to exactly 2
- `safe`: no material new danger caused by that AI move

The analysis compares actual before/after board state and does not use AI scoring labels as danger evidence.

Child-facing AI reason copy is simplified around `숨 쉴 곳`, `내 돌`, `AI 돌`, and `잡힐 수 있어요`.

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

AI scheduling uses a generation token and timer handle.

`invalidateAi()` is used by reset, restore, undo and resign so stale callbacks cannot mutate a newer game state.

Human board input gives explicit feedback instead of silently ignoring input while AI is thinking.

If AI mode reaches `currentPlayer === WHITE` while `aiThinking === false`, tapping the board self-heals by calling `scheduleAi()` rather than remaining permanently stuck.

### 4. Contextual hint

The old generic `도움말` button is replaced with a real `힌트` action.

Shared tested logic now provides:

`suggestHint(board, currentPlayer, previousPosition)`

The hint scans legal moves without mutating the board and ranks them in an educational order:

1. immediately capture opponent stones
2. rescue an endangered own group
3. reduce an opponent group to one breathing point
4. connect separated own groups
5. choose a safer general move with useful breathing space
6. only fall back to a risky one-liberty move if no safer legal candidate exists

The selected hint is deterministic for the same position. The runtime displays the recommended intersection through the existing coach preview/mini-board UI, explains why it is useful in child-friendly Korean, and keeps the existing `여기에 두기` confirmation path. The hint never auto-plays a stone by itself.

Examples:

- `상대 돌을 잡을 수 있어요!`
- `위험한 내 돌을 살려 볼까요?`
- `상대 돌의 숨 쉴 곳을 줄여 볼까요?`
- `내 돌을 이어 볼까요?`

Hints are blocked with a clear message while the AI is thinking or while it is the AI's turn.

### 5. Beginner rule guide

A new `규칙 보기` button is injected next to the other game controls.

The detailed guide is generated from the same shared coach logic through `ruleGuide(komi)` and explains six beginner rules:

1. place stones on intersections, alternating from Black
2. breathing points / liberties (`숨 쉴 곳(활로)`)
3. capture when all breathing points are blocked
4. suicide rule, including the capture exception
5. ko / no immediate repetition of the same board position
6. ending by consecutive passes and the current komi

The detailed guide is non-modal, can be opened/closed without interrupting play, and leaves the existing short rules summary in place.

### 6. Persistence interaction

After every committed move/pass and after undo, the current restored state is saved through existing `EDUNIBadukPersistence`.

Mandatory guarantee implemented: after undo, reload must not resurrect the undone moves.

Phase 1 limitation: undo history itself is runtime-only and is not persisted across page reload. A restored game resumes safely with an empty undo stack.

## Files changed

- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js`
- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py`
- `nice-gui-1-1-7/tests/baduk_coach_logic.test.mjs`
- `nice-gui-1-1-7/tests/test_baduk_v2_integration.py`

## Test coverage added

Shared coach tests cover:

- exact capture danger count
- new 1-liberty danger
- new 2-liberty caution
- unrelated pre-existing danger is not blamed on a remote AI move
- input board purity
- child-friendly AI capture/atari wording
- jitter exclusion from explanation
- hint prefers an immediate capture
- hint prefers rescuing an endangered own group
- empty-board hint is deterministic and center-safe
- safer legal hint is preferred over self-atari
- rule guide includes liberties, capture, ko and current komi wording

Integration tests cover:

- shared danger logic is the runtime logic
- one AI danger analysis call per AI move path
- undo button/runtime snapshot wiring
- generation-token AI scheduling
- pointer self-heal path
- pass history
- persistence restore invalidation
- served `힌트` button delegates to shared `suggestHint`
- served `규칙 보기` button delegates to shared `ruleGuide`
- integrated JavaScript syntax check when Node is available

## Validation status

Repository changes were made through the connected GitHub workspace. This environment cannot execute the repository's Windows browser/server stack directly, so browser QA and the full local test commands remain **NOT VERIFIED** at this phase.

Do not merge from this report alone. Run the dedicated final verification prompt before marking merge-ready.
