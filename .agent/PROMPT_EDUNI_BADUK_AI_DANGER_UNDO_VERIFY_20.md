# EDUNI Baduk — AI Danger + Undo + Input Freeze Final Verification (Prompt 20)

Verify only. Do not refactor or add unrelated features.

## Target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- base: `feature/eduni-space-mvp`
- implementation code/test SHA: `aacb46f9e6b77371d55995ff7f804937f56d3dca`
- phase1 report commit: `0627c44b3598fbed2396dd5fa86b120f39044adb`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_AI_DANGER_COACH_17.md`
- `.agent/PROMPT_EDUNI_BADUK_UNDO_ADDON_18.md`
- `.agent/PROMPT_EDUNI_BADUK_INPUT_FREEZE_FIX_19.md`
- `BADUK_AI_DANGER_UNDO_PHASE1_REPORT.md`

Do not merge automatically. Do not deploy/rebuild the live production Docker service during verification.

## 1. Static/runtime alignment blocker

Verify the actual served `/baduk` runtime contains and uses the same shared logic tested by Node tests.

Required evidence:

- `EDUNIBadukCoachLogic.create(...).analyzeAiDanger` exists in served source
- AI coordinate move path calls `analyzeAiDanger(beforeBoard, board, {row,col})` exactly once
- local move path does not call AI danger analysis
- AI pass path does not fabricate a danger analysis
- `무르기` button exists in served page
- `undo:undoMove` is exposed by `EDUNIBadukEngine`
- AI scheduling contains a generation token guard
- persistence and 19x19 strategy scripts remain injected

If the helper is only present as a test asset but not used by served runtime, verdict is FAIL.

## 2. Automated tests

Run from `nice-gui-1-1-7`:

```powershell
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_game
python scripts/validate_content.py
```

Then from repo root:

```powershell
git diff --check
```

Run relevant full unittest discovery once. Report pre-existing Windows cp949/stale assertion issues separately and do not hide them.

## 3. AI danger browser QA — required

Use the actual served `/baduk` page.

### Safe AI move

- human plays one legal move
- exactly one AI reply occurs
- one coach card appears
- card explains `AI는 왜 여기 뒀을까?`
- safe status is calm/non-alarming
- board remains immediately playable

### Critical capture fixture

Create a legal position where AI captures one or more black stones.

Verify:

- danger result is critical
- exact captured count is shown
- old stone location is visibly marked
- wording says the stones were actually captured, not merely at risk

### New one-liberty danger

Create a legal transition where the AI move changes a surviving black group from 2+ liberties to exactly 1.

Verify:

- warning is shown
- affected black stones are marked
- remaining liberty point is indicated
- copy uses child-friendly `숨 쉴 곳`
- it says `잡힐 수 있어요`, not an inevitable capture claim

### Two-liberty caution

Create a transition from 3+ liberties to exactly 2.

Verify caution, not critical/danger.

### False-positive check

Have an already one-liberty black group elsewhere and let AI play remotely without worsening it.

Verify the remote AI move is not blamed for that old danger.

## 4. Undo browser QA — high priority

### AI completed cycle

1. Start AI game.
2. Record initial board/captures/move count.
3. Human plays.
4. Wait for exactly one AI reply.
5. Press `무르기`.

Required:

- both the human move and AI reply disappear
- board equals the exact pre-human state
- currentPlayer is BLACK/human
- captures restore exactly
- move count restores exactly
- `previousPosition`/ko state restores exactly
- last move restores exactly
- AI danger/coach card from removed sequence disappears
- undo button disables if this returned to initial state

### Undo while AI is thinking — blocker

1. Human plays.
2. Before AI commits, press `무르기`.
3. Wait longer than the normal AI delay.

Required:

- only the human move is undone
- no delayed AI stone appears
- no stale AI danger card appears
- human can immediately choose again

Any delayed AI move after undo is FAIL.

### Local mode

- play two local moves
- press undo once
- exactly one committed action is undone
- correct player's turn restores
- no AI scheduling occurs

### Pass

- local: pass, undo => pass state/counter restores
- AI: human pass + AI response/pass, undo => return to pre-human decision state
- if two passes ended the game, undo reopens if the restored snapshot was active

### Capture + ko

Verify at least one capture snapshot and one simple-ko state restore. Undo must restore capture counters and immediate ko legality from the snapshot, not approximate it.

### Resign

Phase 1 intentionally treats resignation as non-undoable. Verify resign clears/disables undo and does not corrupt the game.

## 5. Persistence QA

Important Phase 1 contract:

- undo history itself is not required to survive reload
- but after an undo, the restored current game state must be saved immediately

Test:

1. play human + AI cycle
2. undo it
3. reload
4. verify undone stones do not reappear
5. verify current turn/counters/ko restored state remain correct
6. verify no stale AI danger card is fabricated on reload

Also restore a saved AI-turn state and verify exactly one AI response still occurs.

## 6. Input-freeze stress test — blocker

Run a longer AI game, ideally 20–30 human/AI cycles, and repeatedly exercise:

- coach ON/OFF
- AI explanation cards
- undo after completed cycle
- undo during AI thinking
- new game while AI is thinking
- 9x9 -> 13x13 -> 19x19 level changes
- AI/local mode changes
- reload/resume

At every active human turn, an empty legal intersection must remain playable.

Specifically inspect state if input ever appears stuck:

- `gameOver`
- `aiThinking`
- `currentPlayer`
- mode
- undo depth

If `currentPlayer===WHITE` and `aiThinking===false`, tap the board and verify the self-heal path schedules the AI instead of silently remaining frozen.

No invisible overlay may block pointer input.

## 7. Board sizes / mobile

Verify:

- 9x9 AI + undo + danger card
- 13x13 AI + undo + danger card
- 19x19 AI + undo + danger card + existing global strategy
- 360x800 mobile: no horizontal overflow, undo button tappable, danger text readable, board intersections remain accurately tappable

## 8. Console / routes

Zero new Baduk JavaScript console errors.

Route smoke:

- `/baduk`
- `/baduk/`
- `/games/eduni-baduk`
- `/portal`

All expected successful responses.

## Verdict

Return exactly one:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL`

Merge-ready requires all blocker scenarios to pass in the real browser, especially:

1. exactly one AI response after normal human play
2. no stale AI response after undo/reset
3. completed AI-cycle undo restores exact pre-human state
4. legal human input does not freeze during long play
5. danger status is based on actual before/after board state
6. local mode remains AI-free
7. existing persistence and 19x19 behavior remain intact

Create final report:

`BADUK_AI_DANGER_UNDO_VERIFY_REPORT.md`

Do not merge automatically.
