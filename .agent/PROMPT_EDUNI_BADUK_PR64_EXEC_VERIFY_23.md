# EDUNI Baduk PR #64 — Execute Current-HEAD Verification (Prompt 23)

Execute the full current-HEAD verification for PR #64. This is an execution prompt, not a design prompt.

## Target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- PR: #64
- expected HEAD at prompt creation: `ce9ae0f5cccc1863763438230d787ee6f6acf3ad` or a later fast-forward commit on the same branch
- base: `feature/eduni-space-mvp`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_PR64_CURRENT_HEAD_VERIFY_22.md`
- `BADUK_AI_DANGER_UNDO_PHASE1_REPORT.md`
- `BADUK_AI_DANGER_UNDO_VERIFY_REPORT.md`

Do not merge automatically.
Do not deploy or rebuild production `100.75.214.95:8081`.
Do not stop or modify unrelated 8080 services.

## 1. Verify exact branch and HEAD

Run:

```powershell
git fetch --all --prune
git branch --show-current
git rev-parse HEAD
git status --short
git log -1 --oneline
```

Required:

- branch is `feature/baduk-ai-danger-coach`
- HEAD matches current remote PR #64 HEAD
- working tree is understood before any action
- do not reset to historical `c7aa36d...` or `39ef5f7...`

If local changes exist, do not discard them. Report and use a clean verification worktree if necessary.

## 2. Start isolated current-HEAD server

Use a free test port such as `8164`.

Preferred approach:

- run the exact PR checkout directly from `nice-gui-1-1-7`
- set `PORT=8164`
- start `python app.py`

Example:

```powershell
cd nice-gui-1-1-7
$env:PORT='8164'
python app.py
```

If the repo requires a different launch command, inspect the existing app/server startup contract and use the smallest isolated equivalent.

Record:

- worktree path
- exact HEAD
- process PID or temporary container id
- test URL

Expected test URL example:

`http://127.0.0.1:8164/baduk`

Do not use production 8081 as the PR-under-test runtime.

## 3. Automated tests

From `nice-gui-1-1-7` run:

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

Run one relevant full unittest discovery once.

For every failure classify it as:

- product regression
- stale assertion in feature-owned tests
- Windows cp949/subprocess environment issue
- unrelated pre-existing failure

Do not reuse counts from the old `c7aa36d...` verification.

## 4. Prove served runtime contains current features

Fetch the isolated `/baduk` HTML and prove it contains:

- `analyzeAiDanger`
- `무르기`
- `undo:undoMove`
- `const token=++aiGeneration`
- `if(token!==aiGeneration)return`
- contextual shared hint path
- `추천 자리`
- `규칙 보기`
- `숨 쉴 곳(활로)`
- `패`
- persistence helper
- 19x19 strategy helper

If repository files contain the features but the isolated served HTML does not, verdict is FAIL.

## 5. AI danger explanation QA

In a headed browser against the isolated current-HEAD server verify:

### Safe
- human legal move
- exactly one AI response
- one AI explanation card
- calm safe wording when no new danger is created

### Critical capture
- fixture where AI actually captures black stones
- exact captured count shown
- captured location marked
- wording says actually captured, not merely at risk

### New one-liberty danger
- AI move reduces a surviving black group from 2+ liberties to exactly 1
- affected stones marked
- remaining liberty marked
- child-friendly wording uses `숨 쉴 곳`
- wording says `잡힐 수 있어요`

### Two-liberty caution
- 3+ liberties reduced to 2
- caution, not critical/danger

### False-positive
- already-dangerous black group exists elsewhere
- AI plays remotely without worsening it
- remote move is not blamed for the old danger

## 6. Undo QA

### Completed AI cycle
1. record state
2. human plays
3. wait for exactly one AI move
4. press `무르기`

Required:

- human move + AI reply both disappear
- exact pre-human board restored
- BLACK/human turn restored
- captures restored
- move count restored
- previousPosition/ko restored
- lastMove restored
- removed AI danger card disappears

### Undo during AI thinking — blocker
1. human commits
2. immediately press undo before AI response
3. wait longer than normal AI delay

Required:

- human move is undone
- no delayed AI stone appears
- no stale AI danger card appears
- human can play immediately again

### Local mode
- two local moves
- undo exactly one action
- no AI scheduling

### Pass / capture / ko
Verify one example of each restores correctly.

### Persistence
- complete human+AI cycle
- undo
- reload
- undone stones do not return

Undo history itself may reset after reload; current restored position must remain correct.

## 7. Contextual hint QA

The current implementation must be verified, not just button presence.

Required:

### General
- `힌트` never auto-plays a stone
- one candidate is highlighted
- coach card contains `추천 자리`
- `여기에 두기` remains explicit confirmation

### Capture priority
Create immediate capture fixture.

Required:
- hint chooses the capturing move
- explanation says opponent stone(s) can be caught

### Rescue priority
Create own endangered one-liberty group with a legal rescue and no higher-priority capture.

Required:
- hint recommends a move increasing breathing spaces
- wording uses `숨 쉴 곳`

### Safety preference
Create at least one self-atari-risk legal move and one safer legal move.

Required:
- hint chooses safer move

### Determinism
Without changing board:
- request hint twice
- same row/col
- same reason category

### Invalid state
While AI is thinking or game is over:
- hint must not mutate board
- must not fabricate a committed move

## 8. Beginner rule guide QA

Verify `규칙 보기` exists and opens a non-modal guide explaining in simple Korean:

- stones are placed on intersections
- turns alternate
- `숨 쉴 곳(활로)`
- capture when all breathing spaces disappear
- suicide rule and capture exception
- ko / `패`
- two consecutive passes end the game
- current white komi

Interaction requirements:

- opening/closing rules does not alter board/current player/move count
- board remains playable afterward
- hint still works afterward
- guide does not create an invisible overlay blocking board input

## 9. Original input-freeze stress — blocker

Run at least 20 human/AI cycles or equivalent deterministic stress while mixing:

- coach ON/OFF
- hint requests
- rules open/close
- AI danger cards
- completed-cycle undo
- undo during AI thinking
- new game during AI thinking
- 9x9 -> 13x13 -> 19x19 switches
- AI/local mode switches
- reload/resume

At every active human turn, a legal empty intersection must accept preview/placement.

If input appears stuck, capture immediately:

- `gameOver`
- `aiThinking`
- `currentPlayer`
- `mode`
- `undoDepth`
- coach card visibility
- rules visibility
- AI generation/token state if observable

If `currentPlayer===WHITE && aiThinking===false`, exercise the self-heal path and verify exactly one AI response is scheduled.

No invisible element may block board pointer input.

## 10. Board sizes / mobile

Verify all board sizes:

- 9x9: hint + danger + undo + rules
- 13x13: hint + danger + undo + rules
- 19x19: global strategy + hint + danger + undo + rules

Mobile viewport `360x800`:

- accurate board tapping
- `무르기`, `힌트`, `규칙 보기` tappable
- long rule text readable
- no horizontal overflow
- no hidden overlay blocks board

## 11. Routes / console

Against isolated server verify:

- `/baduk`
- `/baduk/`
- `/games/eduni-baduk`
- `/portal`

Zero new Baduk JavaScript console errors.

## 12. Current verification report

Create or replace:

`BADUK_AI_DANGER_UNDO_VERIFY_REPORT_CURRENT.md`

Include:

- exact verified HEAD
- exact isolated server URL / port / PID or container
- confirmation production 8081 was untouched
- automated test counts
- failure classifications
- AI danger evidence
- undo/race evidence
- contextual hint evidence
- rule guide evidence
- 20+ cycle freeze evidence
- board size/mobile evidence
- route/console evidence
- remaining risks

Return exactly one verdict:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL`

`PASS — MERGE READY` requires:

1. product-owned focused tests pass,
2. served isolated runtime contains all current feature paths,
3. AI danger semantics pass,
4. completed-cycle undo passes,
5. undo-during-AI-thinking has zero stale AI callbacks,
6. contextual hint passes capture/rescue/safety/determinism checks,
7. rule guide is correct and non-blocking,
8. no input freeze during stress run,
9. 9x9/13x13/19x19 remain functional,
10. mobile and console checks pass.

Do not merge automatically.
Do not deploy production as part of this verification.
