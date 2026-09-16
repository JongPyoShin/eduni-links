# EDUNI Baduk PR #64 — Current HEAD Isolated Verification (Prompt 22)

This supersedes the old live-production verification approach from Prompt 20.

## Target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- PR: #64
- expected branch HEAD at the time this prompt was created: `81c376edfb56d32bcdd51b59b65540645a121f9a` or later fast-forward commit on the same branch
- base: `feature/eduni-space-mvp`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_AI_DANGER_COACH_17.md`
- `.agent/PROMPT_EDUNI_BADUK_UNDO_ADDON_18.md`
- `.agent/PROMPT_EDUNI_BADUK_INPUT_FREEZE_FIX_19.md`
- `.agent/PROMPT_EDUNI_BADUK_AI_DANGER_UNDO_VERIFY_20.md`
- `BADUK_AI_DANGER_UNDO_PHASE1_REPORT.md`
- `BADUK_AI_DANGER_UNDO_VERIFY_REPORT.md`

The old verification report was produced from older HEAD `c7aa36d...` and production 8081 that intentionally did not contain this PR. Treat it as historical evidence only, not the verdict for the current HEAD.

Do not merge automatically.

## 1. Critical verification rule: do NOT use production 8081 as the PR runtime target

Production currently serves the previously deployed base version. The PR must not be judged by whether undeployed code is present there.

Verification must run the exact checked-out PR HEAD in an isolated test runtime.

Use a dedicated local/test port such as `8164` or another confirmed-free port.

Requirements:

- do not stop/rebuild/replace `eduni-game` production container
- do not modify binding `100.75.214.95:8081`
- do not touch unrelated 8080 service
- start the PR checkout directly or in a temporary test container only
- report the exact test URL and PID/container used
- prove served source comes from the same PR HEAD being verified

If an isolated test runtime cannot be started, browser scenarios are `NOT VERIFIED`; do not substitute production 8081 and call the PR code FAIL merely because it is not deployed.

## 2. Confirm exact HEAD first

Run:

```powershell
git fetch --all --prune
git branch --show-current
git rev-parse HEAD
git status --short
git log -1 --oneline
```

Must be `feature/baduk-ai-danger-coach` and current remote PR #64 HEAD.

Report whether the old verification commit `39ef5f771eb0de77ef1e616dfd8778e341520838` is an ancestor of current HEAD. It is expected to be historical only.

Do not reset current HEAD back to `c7aa36d...`.

## 3. Automated tests first

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

Then repo root:

```powershell
git diff --check
```

Also run one relevant full unittest discovery.

### Important stale-test policy

The previous run was against old HEAD and included known stale expectations. Re-measure from current HEAD.

Do not report old counts as current counts.

If a test still fails:

1. identify exact assertion/path,
2. classify it as product regression, stale assertion, Windows cp949/subprocess environment issue, or unrelated pre-existing failure,
3. product regressions block PASS,
4. stale assertions in files changed by this feature should be fixed on this branch before re-running,
5. do not hide cp949/environment failures.

Known old stale wording expectations were already updated after the previous run:

- `넓은 빈 곳` expectation for spread explanation
- `흑돌 1개` expectation for capture explanation
- old 3-argument integration call expectation in 19x19 Python test

Verify current files, do not assume those old failures remain.

## 4. Static served-runtime alignment

Against the isolated current-HEAD server, verify response `/baduk` contains the actual feature implementation, including:

- `analyzeAiDanger`
- `무르기`
- `undo:undoMove`
- `const token=++aiGeneration`
- stale-token guard `if(token!==aiGeneration)return`
- contextual hint path using shared coach logic
- `추천 자리`
- `규칙 보기`
- beginner rules text including `숨 쉴 곳(활로)` and `패`
- persistence helper
- 19x19 strategy helper

The served runtime, not just repository files, must contain these paths.

## 5. Contextual hint QA

Use actual isolated `/baduk` in a headed browser.

Verify `힌트` does not auto-play a stone.

At minimum test:

### Empty/simple board
- press `힌트`
- one legal candidate is highlighted
- coach card title contains `추천 자리`
- reason is simple Korean
- `여기에 두기` remains the explicit confirmation

### Capture fixture
Create a position with an immediate capture available.

Required:
- hint selects a capturing move
- explanation says the opponent stone(s) can be caught
- no alternative quiet move is preferred over immediate capture

### Rescue fixture
Create a threatened own group with one liberty and a legal rescue.

Required:
- hint recommends a move that increases its breathing spaces when no higher-priority capture exists
- copy uses `숨 쉴 곳`

### Safety preference
Create at least one legal self-atari-risk move and one safer legal move.

Required:
- hint must prefer the safer candidate

### Determinism
Without changing the position, dismiss and request hint again.

Required:
- same row/col recommendation
- same reason category

### AI state
While AI is thinking or game is over, hint must not fabricate a move or mutate board state.

## 6. Beginner rules QA

Verify visible `규칙 보기` control exists and toggles a non-modal guide.

The guide must explain in child-friendly wording:

1. place stones on intersections and alternate turns
2. `숨 쉴 곳(활로)`
3. capturing when all breathing spaces disappear
4. suicide rule, with capture exception represented correctly
5. ko / `패` without advanced jargon overload
6. two consecutive passes end the game
7. current white komi value

Required interaction:

- opening rules does not alter board/current player/move count
- board remains tappable after closing rules
- hint still works after opening/closing rules
- mobile 360x800: no horizontal overflow and rules readable

## 7. AI danger QA

Repeat against current HEAD isolated server:

- safe AI move: calm explanation
- critical capture: exact black stone count actually captured
- newly reduced to 1 liberty: danger, `잡힐 수 있어요`
- newly reduced to 2 liberties: caution
- pre-existing unrelated danger: remote AI move not falsely blamed

AI explanation must be generated exactly once per committed AI move.

## 8. Undo QA

### Completed AI cycle
- human move
- exactly one AI response
- press `무르기`
- both moves disappear
- exact pre-human state restored
- captures, move count, current player, previousPosition/ko, lastMove restore

### AI-thinking race blocker
- human commits
- immediately press undo before AI response
- wait longer than AI delay
- no stale AI stone appears
- no stale danger card appears
- human can play again

### Local mode
- two local moves
- one undo removes exactly the last action
- no AI response occurs

### Pass/capture/ko
Exercise at least one pass undo, capture undo, and simple-ko state restore.

### Persistence
- play completed human+AI cycle
- undo
- reload isolated page
- undone stones must not resurrect

Undo history may reset after reload in Phase 1; restored current position must remain correct.

## 9. Input-freeze stress

This remains a blocker because the original user symptom was an apparently legal empty point no longer accepting play.

Run at least 20 human/AI cycles or an equivalent deterministic stress sequence while mixing:

- coach ON/OFF
- hint requests
- rules open/close
- AI danger cards
- completed-cycle undo
- undo during AI thinking
- new game during AI thinking
- 9x9 / 13x13 / 19x19 switches
- AI/local mode changes
- reload/resume

At every active human turn, a legal empty intersection must accept preview/placement.

If input appears stuck, capture exact state immediately:

- `gameOver`
- `aiThinking`
- `currentPlayer`
- `mode`
- `undoDepth`
- whether coach preview/card/rules elements are visible
- pending AI token/generation if observable

If `currentPlayer===WHITE && aiThinking===false`, exercise self-heal and confirm exactly one AI response is scheduled.

No invisible overlay may block the board.

## 10. Board sizes and mobile

Verify all three:

- 9x9: hint + danger + undo + rules
- 13x13: hint + danger + undo + rules
- 19x19: global strategy remains present + hint + danger + undo + rules

Mobile viewport 360x800:

- board remains accurately tappable
- `무르기`, `힌트`, `규칙 보기` tappable
- no horizontal overflow
- long rule text readable

## 11. Routes / console

On isolated current-HEAD server:

- `/baduk`
- `/baduk/`
- `/games/eduni-baduk`
- `/portal`

Verify expected responses/redirect contract.

Zero new Baduk JavaScript console errors.

## 12. Final report

Create or replace a current-head report:

`BADUK_AI_DANGER_UNDO_VERIFY_REPORT_CURRENT.md`

Do not overwrite the historical old report unless explicitly marking it superseded.

Report:

- exact verified HEAD
- isolated server URL/port/PID or container
- production 8081 untouched: yes/no
- automated suite counts
- any remaining failures with classification
- hint QA evidence
- rules QA evidence
- danger QA evidence
- undo/race evidence
- long-play freeze evidence
- board-size/mobile evidence
- route/console evidence
- final verdict

Return exactly one verdict:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL`

PASS requires product tests and all blocker browser scenarios against the isolated current-HEAD runtime. Production deployment is not a prerequisite for merge-readiness.

Do not merge automatically and do not deploy production as part of this verification.