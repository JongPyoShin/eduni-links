# EDUNI Baduk PR #64 — Post-Fix Isolated Verification (Prompt 24)

Verify the current PR #64 HEAD after the compact-function-boundary integration fix. Do not merge and do not deploy production.

## Target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- PR: #64
- expected HEAD at prompt creation: `7eb1e1c1e077895e24eb01fec0ae708e759152c2` or later fast-forward on the same branch
- base: `feature/eduni-space-mvp`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_PR64_EXEC_VERIFY_23.md`
- `BADUK_AI_DANGER_UNDO_VERIFY_REPORT_CURRENT.md`

Historical FAIL from Prompt 23 was caused by `integrate_v2_coach()` returning fail-safe source because `_PASS_TURN_PATTERN` required a newline between `passTurn()` and `finishByScore()`, while the real v2 source has the compact boundary `...scheduleAi()}function finishByScore...`.

Fix commits:

- `35dc16cef5baa9c863e50451f97b413fb9e8053a` — function-boundary regexes now tolerate whitespace/newline/compact adjacency using `\s*`
- `7eb1e1c1e077895e24eb01fec0ae708e759152c2` — explicit compact pass-turn regression test

Do not reset to older verification commits.

## 1. Confirm current HEAD

```powershell
git fetch --all --prune
git checkout feature/baduk-ai-danger-coach
git pull --ff-only
git rev-parse HEAD
git status --short
```

Record exact HEAD. It must include the two fix commits above.

## 2. Regression proof for the original blocker

Inspect actual source and prove:

- `eduni_baduk_v2.html` still contains compact `passTurn ... }function finishByScore` adjacency
- `_PASS_TURN_PATTERN` uses whitespace-tolerant boundary, not literal newline-only matching
- `integrate_v2_coach()` output is NOT identical to original v2 HTML
- integrated output contains all of:
  - `analyzeAiDanger`
  - `id="undo"`
  - `undo:undoMove`
  - `const token=++aiGeneration`
  - `showHint`
  - `규칙 보기`
  - persistence helper
  - 19x19 strategy helper

If integrated output still equals the original source, verdict is immediately `FAIL` and report the exact failed marker/count.

## 3. Automated tests

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

From repo root:

```powershell
git diff --check
```

Then run one full unittest discovery.

Report exact counts. Classify every remaining failure as:

- product regression
- stale assertion in feature tests
- Windows cp949/subprocess environment issue
- unrelated pre-existing failure

Product regression or stale assertions in files changed by this PR block merge readiness.

## 4. Isolated current-HEAD runtime

Do NOT use production `100.75.214.95:8081` as the feature verification target.

Start current PR HEAD on a separate confirmed-free port such as `8164`.

Record:

- exact URL
- PID/container
- checkout path
- branch
- SHA

Prove the served `/baduk` body comes from this HEAD and contains the feature markers listed in section 2.

Production 8081, its Docker container, and unrelated 8080 service must remain untouched.

## 5. Browser QA — AI danger

Against the isolated runtime verify:

- one human move causes exactly one AI response
- AI explanation card appears exactly once per committed AI move
- safe move is calm/non-alarming
- actual capture reports exact captured black-stone count
- newly reduced to 1 liberty shows danger and `잡힐 수 있어요`
- newly reduced to 2 liberties shows caution
- an unrelated already-dangerous group is not falsely blamed on a remote AI move

## 6. Browser QA — undo and race

### Completed AI cycle

- human move
- wait for exactly one AI reply
- press `무르기`
- both human move and AI reply disappear
- board/captures/moveCount/currentPlayer/previousPosition/lastMove return to exact pre-human snapshot

### AI-thinking race blocker

- human commits
- immediately press `무르기` before AI response
- wait longer than normal AI delay
- no delayed AI stone appears
- no stale danger card appears
- human can play again immediately

### Persistence

- play completed human+AI cycle
- undo
- reload isolated page
- undone stones must not return

## 7. Browser QA — contextual hint

Verify:

- pressing `힌트` never auto-plays
- one legal recommended point is highlighted
- title/reason contains beginner-friendly explanation
- `여기에 두기` remains explicit confirmation
- immediate capture is preferred when available
- otherwise an endangered own group is rescued when appropriate
- safer legal move is preferred over self-atari-risk candidate
- requesting hint twice without board change returns same row/col and category
- hint during AI turn/thinking does not mutate the board

## 8. Browser QA — rule guide

Verify `규칙 보기` exists and explains:

- intersections and alternating turns
- `숨 쉴 곳(활로)`
- capture
- suicide rule/capture exception
- `패`
- two consecutive passes
- current komi

Opening/closing the guide must not change board, turn, or move count and must not block board input.

## 9. Input-freeze stress — blocker

Run at least 20 human/AI cycles or equivalent deterministic stress sequence while mixing:

- coach ON/OFF
- hints
- rules open/close
- AI danger cards
- completed-cycle undo
- undo during AI thinking
- new game during AI thinking
- 9x9 / 13x13 / 19x19 changes
- AI/local mode changes
- reload/resume

At every active human turn, a legal empty intersection must accept preview/placement.

If stuck, immediately capture:

- `gameOver`
- `aiThinking`
- `currentPlayer`
- `mode`
- `undoDepth`
- coach/rules visibility
- AI generation/token state if observable

If `currentPlayer===WHITE && aiThinking===false`, verify self-heal schedules exactly one AI response.

## 10. Board sizes / mobile / console

Verify:

- 9x9: danger + undo + hint + rules
- 13x13: danger + undo + hint + rules
- 19x19: global strategy still active + danger + undo + hint + rules
- mobile 360x800: board accurately tappable, buttons tappable, rules readable, no horizontal overflow
- zero new Baduk JS console errors

Route smoke on isolated runtime:

- `/baduk`
- `/baduk/`
- `/games/eduni-baduk`
- `/portal`

## 11. Report

Create:

`BADUK_AI_DANGER_UNDO_VERIFY_REPORT_FIX24.md`

Include:

- exact verified SHA
- proof compact-boundary blocker is fixed
- automated test counts and classifications
- isolated server URL/PID/container
- production 8081 untouched: yes/no
- danger evidence
- undo/race evidence
- hint evidence
- rule-guide evidence
- 20-cycle freeze evidence
- 9/13/19 + mobile evidence
- console/routes evidence
- remaining risks

Return exactly one:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL`

`PASS — MERGE READY` requires both automated product tests and all blocker browser scenarios to pass on the isolated current-HEAD runtime.

Do not merge automatically. Do not deploy production.