# EDUNI Baduk — Legal Move Input Freeze Investigation + Fix (Prompt 19)

## Branch / relationship to Prompts 17 and 18

This is a **mandatory blocker fix** for the same Baduk improvement work.

Work on:

`feature/baduk-ai-danger-coach`

Base:

`feature/eduni-space-mvp`

Read and implement together with:

- `.agent/PROMPT_EDUNI_BADUK_AI_DANGER_COACH_17.md`
- `.agent/PROMPT_EDUNI_BADUK_UNDO_ADDON_18.md`

Do not merge or deploy automatically.

The user observed a real gameplay failure: **there were still legal/empty intersections available, but the game stopped allowing stones to be placed.** Treat this as a HIGH-priority runtime bug. Do not close this by source inspection alone.

## 0. Read first

Read and obey:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`

Inspect at minimum:

- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_v2.html`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach.js`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_persistence.js`
- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py`
- existing Baduk tests

Current runtime has several input gates such as:

- `gameOver`
- `aiThinking`
- AI mode + `currentPlayer === WHITE`
- coach preview/confirm flow
- `tryMove(...).legal`

The current pointer handler can silently return when those gates are active. Investigate which state actually causes the reported freeze; **do not assume the cause before reproducing it.**

## 1. Required invariant

Whenever all of the following are true:

- `gameOver === false`
- it is the human's turn (`currentPlayer === BLACK` in AI mode, either color in local mode)
- `aiThinking === false`
- at least one legal move exists under current ko state

then tapping/clicking a legal intersection must always produce one of these visible outcomes:

1. coach ON: a valid preview card for that exact intersection, followed by a working `여기에 두기` confirmation, or
2. coach OFF: immediate legal placement.

It must never silently do nothing.

If the move is illegal, show a clear reason. If input is temporarily blocked because AI is genuinely thinking, show that state rather than silently swallowing input.

## 2. Reproduce before changing behavior

Use the real served `/baduk` page and try to reproduce the freeze across these flows:

1. repeated normal AI play for at least 30 turns or until game end
2. coach ON, including repeated preview -> cancel -> preview -> confirm
3. coach OFF
4. after an AI explanation/danger card is shown
5. reload from saved human-turn state
6. reload from saved AI-turn state
7. reset/new game while AI response is pending
8. mode AI -> local -> AI
9. level 9x9 -> 13x13 -> 19x19 -> 9x9
10. pass once, continue play
11. if Prompt 18 is implemented: undo after completed AI pair
12. if Prompt 18 is implemented: undo while AI is thinking

When the freeze occurs, capture at minimum:

- `currentPlayer`
- `aiThinking`
- `gameOver`
- `mode`
- `moveCount`
- `previousPosition`
- whether coach is enabled
- whether preview exists
- legal move count
- clicked row/col
- `tryMove` result/reason for that clicked point

Use temporary diagnostics if necessary, but do not leave noisy production logging behind.

## 3. Async AI race protection — mandatory audit

The current AI scheduling uses a delayed callback. Make it impossible for an obsolete scheduled AI callback to mutate or poison a newer game/session.

Use a monotonic generation/token or equivalent deterministic cancellation mechanism.

A scheduled AI callback must be invalidated by at least:

- new game/reset
- level change
- mode change
- restore that replaces active state
- undo while AI is thinking
- any other operation that rewinds/replaces the board state

The callback must verify its token before:

- calling `aiPickMove`
- changing `aiThinking`
- passing
- placing an AI stone
- showing AI danger/coach UI

Do not rely only on `gameOver` or `mode !== 'ai'` checks.

### Critical contract

After cancellation/invalidating an AI task:

- `aiThinking` must be false for the current session
- human input must be immediately available when it is the human's turn
- no stale callback may later flip state, pass, place a stone, or show a coach card

## 4. `aiThinking` must not become a permanent lock

Audit every path that sets `aiThinking = true` and prove every valid exit either:

- clears it, or
- invalidates the task and resets state as part of a replacement transition.

Cover:

- normal AI move
- AI pass/no-move
- AI move rejected unexpectedly
- exception-safe behavior around AI selection
- reset/mode/level changes
- persistence restore
- undo

If `aiPickMove` or a post-AI coach callback throws, the UI must not remain permanently locked. Use a `try/finally`-style guarantee or equivalent safe structure around the asynchronous AI turn.

Do not hide errors silently; keep the game recoverable and report a concise user-facing message if needed.

## 5. Turn-state consistency

At the end of a completed AI response in AI mode, the expected stable state is:

- `currentPlayer === BLACK`
- `aiThinking === false`
- human board input enabled

If AI passes, the same invariant should hold unless the game ended due to two consecutive passes.

Do not leave `currentPlayer === WHITE` without an active valid AI task.

If such an impossible/stale state is detected, fix the source of the inconsistency rather than adding a blind periodic reset.

## 6. Coach preview state audit

Coach mode is intentionally two-step, but it must never trap input.

Verify:

- board tap creates/updates preview even if an old AI explanation card is visible
- `여기에 두기` always corresponds to the most recently previewed legal coordinate
- `다른 곳 보기` clears preview and leaves board tappable
- an AI explanation card does not leave a stale `preview` object that blocks or misroutes confirmation
- a legal preview remains confirmable unless board state actually changed
- if board state changes after preview, stale preview is rejected with an explanation and a new board tap works
- turning coach OFF clears preview and subsequent legal taps place immediately
- turning coach ON again works normally

Prefer adding a board-state/version token to preview if necessary so stale previews are detected deterministically.

## 7. Silent input swallowing is not acceptable

For pointer/tap input, distinguish at least:

- game finished
- AI genuinely thinking
- AI turn
- outside intersection / too far from grid point
- illegal move (occupied/suicide/ko)
- legal preview
- legal placement

Do not show intrusive popups for normal cases, but update the existing message area for blocked states where the user otherwise experiences "nothing happened".

Examples:

- genuine AI thinking: `AI가 생각하고 있어요. 잠깐만 기다려 주세요.`
- stale/invalid preview: `판이 바뀌었어요. 둘 자리를 다시 눌러 주세요.`
- ko/suicide: use the existing beginner-friendly coach copy

Avoid technical words like `state`, `lock`, `callback`, `token` in child-facing text.

## 8. Legal move sanity check

Add a deterministic helper/test path to establish whether at least one legal move exists for the active player.

The reported defect is specifically **not** "the board is full." Browser QA must prove a freeze cannot persist while a known legal coordinate exists.

Do not automatically play a legal move or reset the board just because legal moves exist.

## 9. Persistence interaction

Save/resume must not preserve transient lock state.

Never persist these as authoritative game-state fields:

- `aiThinking`
- pending timeout id
- current coach preview
- temporary danger card
- async task generation id as game semantics

On restore:

- reconstruct stable game state
- if it is legitimately AI's turn, schedule exactly one fresh AI task
- if it is human's turn, `aiThinking` must be false and input must work immediately

Reloading a human-turn save must never reproduce a frozen board.

## 10. Undo interaction (Prompt 18)

Undo must be designed with this freeze fix, not bolted on afterward.

If undo is pressed while AI is thinking:

1. invalidate the pending AI token
2. clear `aiThinking`
3. restore the human pre-move state
4. clear AI coach/danger UI
5. persist the restored state
6. allow a new legal move immediately
7. waiting longer than the old AI delay must produce zero stale stones/cards

After normal AI-pair undo, the stable state must also be human turn + input enabled.

## 11. Danger-coach interaction (Prompt 17)

AI danger analysis is informational only.

It must never:

- set `aiThinking`
- change turn
- block pointer events
- leave an overlay intercepting taps
- require dismissal before the human can play

All coach/danger overlays must keep `pointer-events: none` where appropriate; UI buttons/cards must not accidentally cover the board hit area.

After an AI danger card appears, the very next legal human board tap must still work.

## 12. Automated tests — required

Add focused regression tests for the actual bug contract.

At minimum cover:

1. human-turn + legal point + coach OFF => placement succeeds
2. human-turn + legal point + coach ON => preview then confirm succeeds
3. AI explanation visible => next legal tap still previews/plays
4. stale preview after board version change is rejected but does not freeze future taps
5. normal AI task always ends with `aiThinking=false`
6. AI pass path ends with human input enabled
7. reset invalidates pending AI callback
8. mode change invalidates pending AI callback
9. level change invalidates pending AI callback
10. restore human-turn state => no AI lock
11. restore AI-turn state => exactly one AI task, then human input enabled
12. undo-during-AI => pending task invalidated and human input enabled
13. old AI callback after undo/reset causes zero mutation
14. local mode never enters AI lock
15. known legal move remains playable after 30+ simulated turns where game is not over
16. ko-illegal coordinate does not imply other legal coordinates are blocked
17. 9x9
18. 13x13
19. 19x19

Tests must exercise the same runtime/helper logic used by served `/baduk`; do not create a test-only state machine.

## 13. Runtime observability for tests

If needed, extend the existing test-facing `window.EDUNIBadukEngine.getState()` minimally so browser QA can inspect safe non-sensitive state such as:

- currentPlayer
- aiThinking
- gameOver
- mode
- moveCount
- board
- boardSize
- legal move count or helper

Do not expose private/user data. Do not add telemetry/network logging.

## 14. Browser QA — blocking

Use actual served `/baduk` in headed browser.

### Long-play test

For each of 9x9, 13x13, 19x19:

- make repeated legal human moves
- allow AI response each turn
- run at least 20 human+AI cycles when practical or until legitimate game end
- after every AI response assert:
  - `currentPlayer === BLACK`
  - `aiThinking === false`
  - at least one known legal human coordinate, when available, can be previewed/played

### Coach ON/OFF

- coach ON: preview + confirm at least 10 times
- coach OFF: direct play at least 10 times
- toggle repeatedly during a game
- no freeze

### Race tests

Explicitly perform:

- reset during AI wait, then wait longer than old delay
- level change during AI wait, then wait
- mode change during AI wait, then wait
- undo during AI wait, then wait

For each: zero stale move/card and immediate valid input in the resulting state.

### Persistence

- save on human turn -> reload -> legal move works immediately
- save/restore AI turn -> one AI response -> legal human move works immediately

### Danger-coach

- after danger/safe AI card appears, immediately tap a legal point
- verify preview/placement responds normally without dismissing the card first

### Mobile

At 360x800, repeat a normal AI turn and confirm the next human move is tappable. Ensure no invisible overlay blocks the board.

## 15. Report

Update/create the Baduk feature report to include a dedicated section:

`INPUT-FREEZE-ROOT-CAUSE`

Do not merely say "fixed." Report:

- exact reproduced symptom
- exact stale/incorrect state observed
- root cause
- code path fixed
- automated regression test names/counts
- long-play browser evidence
- race-test evidence
- whether the original bug was reproduced before fix

If the original symptom cannot be reproduced, say `ORIGINAL SYMPTOM NOT REPRODUCED`, but still validate and harden all state invariants above. Do not invent a root cause.

## Acceptance criteria

PASS only if:

- a known legal move never becomes silently unplayable in a stable human-turn state
- no async AI callback can survive reset/mode/level/restore/undo invalidation
- `aiThinking` cannot remain permanently true after an AI turn fails or is cancelled
- AI completed turn always returns control to human when game is not over
- coach preview cannot trap input
- AI danger card never blocks input
- persistence cannot restore transient lock state
- 9x9 / 13x13 / 19x19 long-play checks pass
- mobile board remains tappable
- no new console errors
- existing rules, save/resume, 19x19 strategy, danger coach, and undo remain compatible

Do not merge automatically. If any stable human-turn state with a known legal move still ignores input, verdict is `FAIL` / `DO NOT MERGE`.