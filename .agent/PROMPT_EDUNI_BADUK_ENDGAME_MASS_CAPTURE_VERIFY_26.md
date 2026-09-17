# EDUNI Baduk PR #64 — Endgame / Forced-Pass / Mass-Capture Verification (Prompt 26)

## Purpose

Verify the two newly reported beginner-game problems on the current PR #64 branch:

1. AI can repeatedly say `한 수 쉬기` instead of conceding an obviously lost game.
2. In 9x9, the human can fill almost the whole board, leave one liberty, and then AI legally captures an enormous connected group (reported as 80 stones) without enough beginner warning.

Important rule fact: the 80-stone capture itself can be legal Go. Do **not** block a legal capture. The product fix is to teach/warn before the catastrophic self-atari and to make AI endgame behavior understandable/conservative.

Also close the remaining Prompt 25 items (2-liberty caution and 360x800 mobile) so this can become a true merge-readiness run.

Do not merge or deploy production.

## Branch / target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- PR: #64
- verify the latest remote HEAD, not an older SHA
- production `100.75.214.95:8081` must remain untouched
- run current HEAD on an isolated port such as `8164`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_PR64_FINAL_CLOSEOUT_VERIFY_25.md`
- `BADUK_AI_DANGER_UNDO_VERIFY_REPORT_FIX24.md`
- `nice-gui-1-1-7/portal_app/baduk_endgame_safety.py`
- `nice-gui-1-1-7/tests/test_baduk_endgame_safety.py`

## 1. Confirm exact HEAD and served runtime

Run:

```powershell
git fetch --all --prune
git branch --show-current
git rev-parse HEAD
git status --short
```

Must be the latest `feature/baduk-ai-danger-coach` remote HEAD.

Start isolated runtime from this checkout.

Verify served `/baduk` contains all existing PR features plus these new markers:

- `aiForcedPasses`
- `assessAiNoMove`
- `finishAiResignation`
- `AI 기권 — 흑 승!`
- `largeSelfAtariRisk`
- `ownGroupSizeAfter`
- `내 집은 끝까지 메우지 않아도 돼요`
- `그래도 두려면 설명을 보고 '여기에 두기'`

If any are missing, STOP with `FAIL`; do not use production as a substitute.

## 2. Automated suites

From `nice-gui-1-1-7` run at minimum:

```powershell
python -m unittest tests.test_baduk_endgame_safety
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_game
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python scripts/validate_content.py
```

Then one full unittest discovery and repo-root `git diff --check`.

Strict rule: the four stale Python wrapper failures reported by Prompt 24 must now be gone. Any current product regression blocks PASS.

## 3. Exact 79 → 80 stone browser reproduction (critical)

Use the isolated current-HEAD page. It is acceptable and preferred to seed a deterministic state through `localStorage` key `eduni.baduk.v1` using the existing persistence schema.

### Seed state

Create a 9x9 board where:

- 79 intersections contain BLACK (`1`)
- exactly two EMPTY (`0`) points remain
- use opposite corners such as `[0,0]` and `[8,8]` so the two liberties are not adjacent
- no WHITE stones
- `currentPlayer = 2` (AI/WHITE turn)
- mode `ai`
- `gameOver = false`
- valid captures/moveCount/consecutivePasses/lastMove fields

This giant black group has two separated liberties. WHITE should have zero legal coordinate moves because playing either empty corner is suicide while the other liberty remains.

### Required AI behavior

After restore and AI turn:

- AI must make **no illegal stone move**
- AI performs one forced pass
- message must explain it has no legal place to play
- message must also warn that the large connected black group has only 2 breathing spaces and that continuing to fill them can cause a mass capture
- game returns to BLACK/human turn
- AI must **not resign here**, because a major comeback capture remains possible

This is a blocker.

### Human fills one of the last two liberties

Turn coach OFF to prove the safety guard is independent of the coach toggle.

Tap one remaining corner, e.g. `[0,0]`.

Required first-tap behavior:

- the black stone is **not committed yet**
- move count does not advance
- a warning/preview appears
- title or summary clearly says the large group is dangerous
- exact connected group size after the proposed move is shown as `80`
- explanation says the 80 stones would have only 1 breathing space and could be captured together
- explicit `여기에 두기` confirmation is required

Dismiss/cancel once and confirm the board remains at 79 black stones.

Repeat, then deliberately press `여기에 두기`.

Required after explicit confirmation:

- BLACK becomes 80 stones with one remaining liberty
- AI then plays the last legal corner
- the 80-stone capture is allowed (this is legal Go and must not be artificially blocked)
- danger/capture explanation reports exact captured count `80`
- no freeze or duplicate AI move

This proves both teaching safety and rule correctness.

## 4. AI resignation behavior

AI resignation must be conservative. It must not resign merely because it passed twice if a large tactical comeback remains possible.

### Required non-resign case

The 79-black / two-liberty fixture above is the mandatory non-resign proof.

### Required resign case

Construct or programmatically search a deterministic 9x9 state satisfying all of these before the second forced AI no-move decision:

- AI/WHITE has no legal coordinate move
- BLACK is clearly ahead by at least the runtime resignation margin
- board is sufficiently late/full for `lateEnough`
- no black group has enough `maxComebackSwing` to cover the score deficit under the runtime heuristic
- BLACK still has at least one legal move between AI turns so two forced AI-pass opportunities can occur without the human immediately passing to end the game

You may use `window.EDUNIBadukEngine.legalMoves`, `scoreBoard`, and `groupAt` in a fixture-search script, then seed the valid state through persistence.

Required:

- first forced AI no-move turn may pass
- after the human legal continuation and the next forced AI no-move decision, AI must resign when the runtime assessment says `resign=true`
- visible result: `AI 기권 — 흑 승!`
- no additional AI timeout/move fires afterward
- game is over and board no longer accepts normal play

If you cannot construct a valid browser fixture, mark the resign-browser item `NOT VERIFIED`; do not fake it with source-only inspection. That prevents `PASS — MERGE READY`, though deterministic automated coverage may justify only `CONDITIONAL PASS`.

## 5. Rule-guide teaching

Open `규칙 보기` and confirm the added beginner lesson is visible:

- `내 집은 끝까지 메우지 않아도 돼요`
- explains that filling your own safe area can reduce your stones' breathing spaces
- tells the child that `한 수 쉬기` is okay when there is no useful place to play

Opening/closing rules must not mutate board state.

## 6. Existing danger closeout: 2-liberty caution

Complete the missing Prompt 25 browser fixture.

Create a real AI move that changes an affected BLACK group from 3+ liberties to exactly 2.

Required UI:

- level `caution`
- title equivalent to `⚠️ 이쪽을 조심해요`
- text says breathing spaces became 2
- affected stones/remaining liberties are visually marked
- unrelated pre-existing two-liberty groups are not blamed

Source or Node-only evidence is insufficient for this item.

## 7. Mobile 360x800 closeout

Use Playwright, Chrome DevTools Protocol, or another actual browser viewport emulation if the normal headed-browser wrapper cannot resize.

Set viewport exactly `360 x 800`.

Required:

- no horizontal overflow (`scrollWidth <= clientWidth`)
- board fits and remains tappable at center and near edges
- `무르기`, `힌트`, `규칙 보기` are visible/tappable
- rule text readable
- large-self-atari warning card readable without blocking access to confirmation/cancel actions
- one normal human+AI cycle works
- one undo works
- no console errors

## 8. Quick regression

Reconfirm on isolated runtime:

- normal safe AI move
- AI-thinking undo race leaves no stale AI stone
- persistence after undo
- 9x9 / 13x13 / 19x19 switching
- 19x19 strategy still present
- `/baduk`, `/baduk/`, `/games/eduni-baduk`, `/portal` respond correctly

No need to repeat the full 20-cycle stress if Prompt 24 evidence remains valid **unless** the new endgame patch affects input scheduling unexpectedly. If any scheduling anomaly appears, rerun the stress.

## 9. Final report

Create:

`BADUK_ENDGAME_MASS_CAPTURE_VERIFY_REPORT_26.md`

Include:

- exact verified SHA
- isolated server URL/PID
- production untouched yes/no
- automated counts
- 79→80 fixture evidence
- first-tap warning evidence
- explicit-confirm 80-capture evidence
- AI non-resign comeback case
- AI resign case
- rule-guide evidence
- 2-liberty caution browser evidence
- 360x800 evidence
- console/routes/regression evidence
- remaining risks

Return exactly one verdict:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL`

`PASS — MERGE READY` requires all blocker automated tests, 79→80 browser fixture, conservative non-resign proof, actual AI resign browser proof, 2-liberty caution browser proof, and 360x800 mobile proof.

Do not merge and do not deploy production.