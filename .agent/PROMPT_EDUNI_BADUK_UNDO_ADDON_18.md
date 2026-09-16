# EDUNI Baduk — Undo Add-on (Prompt 18)

This prompt is an add-on to:

`.agent/PROMPT_EDUNI_BADUK_AI_DANGER_COACH_17.md`

Implement both Prompt 17 and Prompt 18 together on the same feature branch:

`feature/baduk-ai-danger-coach`

Base branch:

`feature/eduni-space-mvp`

Fetch latest base first. Prompt 17 and Prompt 18 must both be present before implementation begins. Do not merge automatically and do not deploy/rebuild the live Docker service during feature development.

## 1. Goal

Add a beginner-friendly **무르기 (Undo)** feature to Baduk without breaking AI scheduling, ko, captures, persistence, coach explanations, or the new AI danger explanation from Prompt 17.

The child should be able to recover from a mistaken move without manually restarting the entire game.

Add a visible button labeled:

`무르기`

Place it with the existing game controls (`새 게임`, `한 수 쉬기`, `기권`, `도움말`) without making the mobile layout overflow.

## 2. Required undo behavior

### 2.1 AI mode — normal completed turn

When it is the human's turn and the previous sequence is:

1. human black move
2. AI white response
3. human turn again

pressing `무르기` must undo the **whole player decision cycle**:

- remove the AI response
- remove the immediately preceding human move
- restore the exact position from before that human move
- restore captures
- restore move count
- restore current player to BLACK / human
- restore `previousPosition` / simple-ko state correctly
- restore `lastMove`
- restore consecutive passes if relevant
- clear any coach preview / AI danger card from the undone sequence

The result must be: **the child gets to choose the human move again.**

Do not undo only the AI move in the normal completed-turn case. That would expose an artificial state where it is the AI's turn again and is confusing for a beginner.

### 2.2 AI mode — AI is still thinking

If the human has just made a move and the AI response has been scheduled but has not yet committed:

- `무르기` must cancel/invalidate the pending AI callback
- undo only the just-played human move
- return to the exact position before that move
- current player must be BLACK / human
- no delayed AI move may appear afterward
- no stale AI danger card may appear afterward

This is a high-priority race-safety requirement.

Use a generation/session/token mechanism or equivalent deterministic cancellation guard. Do not rely only on `clearTimeout` if the existing architecture can still execute stale callbacks through another path.

### 2.3 Local two-player mode

In local mode, one press of `무르기` undoes exactly **one committed action**.

For a normal placed stone:

- remove that last move
- restore captures
- restore ko state
- restore currentPlayer to the player who made that move
- restore moveCount / lastMove / consecutivePasses

Do not undo two moves in local mode.

### 2.4 Pass actions

Pass must participate in history.

- local mode: undo the most recent pass as one action
- AI mode: if the completed human+AI cycle contains pass/move combinations, undo back to the state before the human decision
- restore `consecutivePasses` exactly
- if two passes had ended the game, undo must reopen the game if the undone history snapshot represents an active game

Do not fabricate board changes for a pass.

### 2.5 Resign

Prefer allowing `무르기` immediately after resignation **only if** the implementation can safely restore the exact pre-resign state from history without special-case corruption.

If resignation is deliberately non-undoable, make that explicit in the UI/implementation report and disable `무르기` after resign rather than silently doing something inconsistent.

Do not reset the whole game as an approximation for undoing resignation.

## 3. Snapshot/history contract

Implement undo using exact game-state snapshots, not inverse-move guessing.

A history snapshot should include all state required to restore legal play, at minimum:

- `board`
- `currentPlayer`
- `previousPosition`
- `captures`
- `moveCount`
- `consecutivePasses`
- `lastMove`
- `gameOver`
- mode/level context if required for validation

If other state is necessary for correctness, include it.

Requirements:

- deep-clone board arrays
- no shared mutable aliases between current state and history
- bounded history; do not grow localStorage without limit
- history entries must not include DOM nodes, canvas objects, timers, callbacks, or coach UI objects
- do not persist `aiThinking=true` as restorable gameplay state

A reasonable bound is the current game length or an explicit safe cap large enough for 19x19 educational play.

## 4. AI turn grouping

For AI mode, history must preserve **decision boundaries**, not merely raw move count.

Recommended model:

- save a snapshot immediately before each human decision/action
- keep enough metadata to know whether an AI response has committed
- after AI response completes, the undo target remains the snapshot from before the human action

This naturally makes one undo return to the child's prior decision point.

Avoid brittle logic such as "always subtract two moves" because passes, captures, restored games, interrupted AI turns, and future actions can violate that assumption.

## 5. Persistence / reload

Undo must coexist with the existing localStorage save/resume feature.

Preferred behavior: persist a **bounded validated undo history** with the saved game so that after reload the user can still undo the most recent valid decision(s).

If the persistence schema must change:

- bump/version it deliberately
- keep old valid saves safe
- either migrate old saves without history or accept them with empty undo history
- never discard an otherwise valid old game only because undo history is absent
- validate every history snapshot before restoring it
- malformed history must be ignored safely without discarding the current valid game state

After undo:

- immediately save the restored state
- a subsequent reload must not resurrect the undone moves

This last requirement is mandatory.

## 6. Interaction with AI danger coach (Prompt 17)

Undo must correctly clean up informational UI created by the undone move sequence.

After undo:

- no stale `AI는 왜 여기 뒀을까?` card from the removed AI move
- no stale danger/caution markers
- no stale move preview
- no old affected-stone overlay

The next actual AI move must generate exactly one fresh explanation/danger analysis.

Undo itself must not generate a fake AI explanation.

## 7. Interaction with standard coach

Undo must clear any pending preview or factual move explanation that refers to the removed move.

After restoring state, normal coach preview must work immediately on the restored board.

Coach ON/OFF preference should not be changed by undo.

## 8. Ko correctness — mandatory

Undo must restore simple-ko legality exactly.

Test a concrete ko sequence:

1. establish a legal ko
2. make/capture a move that changes `previousPosition`
3. undo
4. verify the restored board and immediate recapture legality match the state that existed before the undone action

Do not reconstruct ko from only `lastMove`; restore the actual stored ko/previous-position state.

## 9. Captures / counters

Undo must restore captured-stone counters exactly.

Test at least:

- human captures one or more white stones, then undo
- AI captures one or more black stones, then undo the completed AI turn cycle
- local player captures, then one-action undo

Move count must return to the exact prior value, not merely decrement blindly.

## 10. New game / level / mode changes

`새 게임` clears undo history.

Changing board level (9x9 / 13x13 / 19x19) starts a new game and clears incompatible history.

Changing AI/local mode must not allow undo into a position from a different mode unless the current existing UI intentionally preserves a game across mode switch. Follow existing game semantics and document them.

Never restore a 9x9 snapshot into 13x13/19x19 or vice versa.

## 11. Button state / UX

`무르기` should be disabled when no valid undo target exists.

Examples:

- brand-new game: disabled
- after first human committed move: enabled
- after undo back to initial state: disabled
- after reset/new game: disabled

In AI mode while AI is thinking, `무르기` must remain usable so the child can cancel the just-made move.

Use simple feedback after undo, e.g.:

`한 수 전으로 돌아왔어요. 다시 생각해 볼까요?`

For AI-cycle undo, wording may still say `다시 생각해 볼까요?`; avoid technical language such as transaction/rollback/snapshot.

No modal confirmation is required for normal undo.

## 12. Runtime/test alignment

Use the same history/restore logic in the served runtime and tests.

Do not create a test-only undo helper while `/baduk` uses separate ad-hoc inline logic.

If a shared helper is introduced, it must actually be injected/used by `baduk_v2_integration.py` and served `/baduk`.

Fail safe on integration-marker drift: a working game without undo is preferable to a partially patched runtime that corrupts state.

## 13. Automated tests — required

Add focused deterministic tests for at least:

1. initial game => undo disabled / no-op
2. local one move => undo restores initial board and turn
3. local two moves => one undo removes only second move
4. local capture => undo restores captured stones and capture counters
5. local pass => undo restores turn and consecutivePasses
6. AI human+AI completed pair => one undo restores state before human move
7. AI thinking after human move => undo cancels AI and restores pre-human state
8. wait longer than normal AI delay => no stale AI move appears
9. no stale AI danger card/overlay after undo
10. next real AI response after undo occurs exactly once
11. ko state restored exactly
12. moveCount / lastMove restored exactly
13. 9x9 undo
14. 13x13 undo
15. 19x19 undo
16. undo state saved immediately; reload does not resurrect undone moves
17. valid older persistence payload without undo history still restores
18. malformed history is ignored safely
19. new game clears undo history
20. level change clears incompatible history
21. local mode never schedules AI after undo
22. coach toggle preference survives undo

Extend Node and Python integration tests as appropriate.

## 14. Browser acceptance — required

Use actual served `/baduk`.

### AI mode normal

- start clean 9x9 AI game
- human move
- wait for AI response
- record exact board/counters/turn
- press `무르기`
- both the human move and AI move disappear
- moveCount returns by two actions as represented by snapshot state
- human/BLACK turn
- make a different move
- exactly one AI response occurs

### AI-thinking race

- human move
- immediately press `무르기` before AI commits
- human move disappears
- wait longer than AI delay
- zero stale AI moves
- zero stale danger cards

### AI capture/danger interaction

- reach a controlled state where AI captures or creates a danger alert
- allow AI response/card to render
- press undo
- captured stones return if appropriate
- counters restore
- danger overlay/card clears
- new human move remains playable

### Local mode

- play black, white, black
- undo once
- only the last black action is reverted
- correct player turn restored
- wait > AI delay: zero AI moves

### Persistence

- complete at least one AI cycle
- undo it
- reload
- undone moves do not return
- if persisted history remains, another valid undo behaves correctly

### Ko

Verify a real/reproducible ko fixture before and after undo.

### Board sizes

Repeat core undo smoke on 13x13 and 19x19.

### Mobile

At 360x800:

- `무르기` button visible/tappable
- controls do not horizontally overflow
- undo works while coach/danger card is visible

## 15. Regression commands

Run Prompt 17 tests plus undo-specific tests, then existing Baduk regressions:

```bash
cd nice-gui-1-1-7
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_game
python scripts/validate_content.py
cd ..
git diff --check
```

Add any new undo-specific Node/Python test command to the report.

Run relevant full test discovery once before final commit. Report pre-existing cp949/stale assertions separately; do not hide them.

## 16. Deliverables

Prompt 17's report may be extended, or create a combined report such as:

`BADUK_AI_DANGER_COACH_UNDO_REPORT.md`

Report must include:

- branch/base/implementation SHA
- undo semantics for AI vs local mode
- pending-AI cancellation method
- exact persisted history/schema behavior
- ko/capture/pass restoration evidence
- interaction with danger coach
- automated test counts
- browser QA: AI completed pair, AI-thinking race, local, 9/13/19, persistence, ko, mobile
- console errors
- remaining risks
- recommendation `MERGE READY` or `DO NOT MERGE`

Keep/open a Draft PR from:

`feature/baduk-ai-danger-coach`

to:

`feature/eduni-space-mvp`

Suggested title can be updated to:

`WIP: add AI danger coach and undo to Baduk`

Do not merge automatically.

## Acceptance criteria

PASS only if all Prompt 17 acceptance criteria still pass and:

- `무르기` is visible and disabled when unavailable
- AI completed turn undo returns to the child's prior decision point
- AI-thinking undo cancels the pending response with zero stale AI move
- local undo removes exactly one action
- captures, pass count, move count, current player, last move, and ko restore exactly
- undo clears stale coach/danger UI
- next AI move after undo occurs exactly once
- undo persists correctly; reload does not resurrect removed moves
- old saves without undo history remain safe
- 9x9 / 13x13 / 19x19 all work
- mobile control layout remains usable
- no new console/runtime errors

If any required item was not executed, report `NOT VERIFIED`, not PASS.
