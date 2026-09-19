# EDUNI Baduk PR #64 — Production 8081 Deployment (Prompt 28)

## Goal

Deploy the already-merged Baduk PR #64 from `feature/eduni-space-mvp` to the production game service that serves:

- `http://100.75.214.95:8081/baduk`

This is a deployment-only task.

Do **not** make product-code changes unless an actual production deployment blocker is found. If a blocker is found, stop and report it instead of improvising a broad fix.

## Verified source

Repository:

`JongPyoShin/eduni-links`

Target branch:

`feature/eduni-space-mvp`

Expected target commit:

`e5a034ae348b14638f88b94d840d36c19c6ef7ea`

This is the merge commit for PR #64:

`Merge PR #64: improve Baduk coach, undo, hints, rules, and endgame safety`

The feature branch was verified through Prompt 27 with:

- Python full discovery: 126/126 PASS
- Node coach logic: 21/21 PASS
- relevant Node suites PASS
- actual headed-Chrome AI resignation fixture PASS
- 79→80 mass-capture teaching fixture PASS
- 2-liberty caution browser fixture PASS
- 360×800 mobile QA PASS
- no stale AI callback after resignation
- production 8081 intentionally untouched during verification

## Safety rules

1. Do not touch unrelated port 8080 services.
2. Do not stop/rebuild unrelated containers or processes.
3. Do not use destructive `git reset --hard` on a dirty checkout.
4. Do not discard local work.
5. Identify the actual process/container/worktree serving 8081 before changing anything.
6. Record the pre-deploy commit/container/image/process state so rollback is possible.
7. Deploy only the merged base branch, never the old PR feature branch.
8. Do not merge anything during this task.

## 1. Identify current production ownership

Before pulling or rebuilding, determine exactly what owns port 8081.

Record:

- process/container name and ID
- host PID if applicable
- image/tag if Docker
- mapped port
- mounted/baked source behavior
- checkout/worktree path used to build it
- currently deployed Git commit if discoverable

Historical evidence suggested an `eduni-game` Docker service and a worktree similar to:

`D:\Codex\Worktrees\eduni-space-mvp`

Do not assume that is still true. Verify current reality first.

Also capture:

`http://127.0.0.1:8081/baduk`

and, if reachable from the host:

`http://100.75.214.95:8081/baduk`

before deployment.

## 2. Inspect checkout safely

For the checkout actually used for production, run the equivalent of:

```powershell
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git fetch --all --prune
git rev-parse origin/feature/eduni-space-mvp
```

Required remote target:

`e5a034ae348b14638f88b94d840d36c19c6ef7ea`

If the production checkout is dirty:

- do not discard anything
- do not auto-stash without reporting
- stop deployment and report the changed files and why deployment is blocked

If the branch is not `feature/eduni-space-mvp`, determine whether this is the correct production checkout before switching.

Only use a clean fast-forward/safe branch update.

## 3. Pre-build source verification

After syncing the production checkout, confirm:

```powershell
git rev-parse HEAD
```

must equal:

`e5a034ae348b14638f88b94d840d36c19c6ef7ea`

Verify the merged source contains these features:

- `analyzeAiDanger`
- `undo:undoMove`
- `const token=++aiGeneration`
- stale-token guard
- `showHint`
- `규칙 보기`
- `aiForcedPasses`
- `assessAiNoMove`
- `finishAiResignation`
- `AI 기권 — 흑 승!`
- `largeSelfAtariRisk`
- `ownGroupSizeAfter`
- `내 집은 끝까지 메우지 않아도 돼요`

Also confirm `baduk.py` routes v2 through both:

- `integrate_v2_coach(...)`
- `integrate_endgame_safety(...)`

If any required marker is absent, stop before rebuilding.

## 4. Focused pre-deploy tests

Run from `nice-gui-1-1-7` at minimum:

```powershell
python -m unittest tests.test_baduk_endgame_safety
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_game
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python scripts/validate_content.py
```

Then repo root:

```powershell
git diff --check
```

No product regression may be ignored for deployment.

Environment-only issues must be reported explicitly.

## 5. Rebuild/recreate only the 8081 game service

Use the repository's actual production mechanism discovered in step 1.

If this is still Docker/`eduni-game`:

- rebuild only the image/service necessary for 8081
- recreate/restart only the 8081 game service
- do not restart unrelated services
- retain enough information to restore the previous image/container quickly

Record:

- old container ID/image
- new container ID/image
- restart/recreate command used
- new host PID if relevant

## 6. Post-deploy HTTP and served-source verification

Verify both localhost and external/Tailscale endpoint where available:

- `http://127.0.0.1:8081/baduk`
- `http://100.75.214.95:8081/baduk`

Required:

- HTTP 200
- served page is not the old fallback
- served HTML contains:
  - `analyzeAiDanger`
  - `id="undo"`
  - `undo:undoMove`
  - `showHint`
  - `규칙 보기`
  - `const token=++aiGeneration`
  - `aiForcedPasses`
  - `finishAiResignation`
  - `largeSelfAtariRisk`

Also verify:

- `/baduk/`
- `/games/eduni-baduk`
- `/portal`

return their expected HTTP behavior.

## 7. Production browser smoke

Use headed Chrome against the actual production 8081 URL.

Do not rely only on source-string checks.

### Normal 9x9 flow

1. Open a fresh/new 9x9 game.
2. Confirm `무르기`, `힌트`, `규칙 보기` are visible.
3. Make one human move.
4. Confirm exactly one AI response.
5. Confirm AI explanation appears with no JS console error.
6. Press `무르기`.
7. Confirm both human+AI moves revert to the prior human decision point.
8. Play a different human move.
9. Confirm exactly one fresh AI response.

### Hint

- press `힌트`
- board must not auto-play
- one recommended location appears
- reason text appears
- `여기에 두기` remains explicit confirmation

### Rules

- open `규칙 보기`
- confirm beginner guide is readable
- confirm `내 집은 끝까지 메우지 않아도 돼요`
- close it
- confirm board is still playable

### Board sizes

Switch through:

- 13×13
- 19×19
- back to 9×9

Confirm board remains tappable and AI responds once.

### Input-freeze smoke

Mix several actions:

- coach ON/OFF
- hint
- undo
- new game
- level switch

At each active human turn, a legal empty point must still accept preview/placement.

No invisible overlay may block the board.

## 8. Endgame safety production smoke

Do not require a long manual game.

Use a disposable browser profile/localStorage fixture if practical.

At minimum prove one of the following in the actual production runtime:

A. large-group risk fixture:
- dangerous human fill move produces the large-group warning before commit

or

B. AI no-move fixture:
- AI forced pass displays the explanatory no-legal-move/endgame message

Do not alter server-side production data; this game state is browser-local.

If fixture injection is not practical, static served markers + the previously completed isolated Prompt 27 evidence may be referenced, but report production endgame fixture as not re-exercised.

## 9. Console / stability

During production smoke:

- zero new Baduk JavaScript console errors
- no duplicate AI move
- no stale callback after undo/reset
- no request loop or server traceback

Check service/container logs after browser smoke.

## 10. Rollback rule

If any of these occur after deployment:

- `/baduk` fails to render
- core controls missing
- browser JS errors prevent play
- AI gets stuck
- repeated/double AI callbacks
- routing regression
- server/container instability

then restore the exact pre-deploy service/image/container state captured in step 1.

After rollback, verify 8081 is healthy and report the blocker.

Do not attempt broad production debugging while the service remains degraded.

## 11. Report

Create:

`BADUK_PR64_PRODUCTION_DEPLOY_REPORT_28.md`

Report:

- verdict: `DEPLOYMENT PASS` or `DEPLOYMENT FAIL`
- deployed branch
- deployed SHA
- pre-deploy SHA
- previous container/image/PID
- new container/image/PID
- exact service/rebuild action
- focused test results
- localhost HTTP evidence
- external 8081 HTTP evidence
- served feature markers
- browser smoke results
- endgame safety smoke status
- console/server log status
- rollback required: yes/no
- production 8080 untouched: yes/no
- remaining risks

Commit and push only the report to `feature/eduni-space-mvp` after deployment.

Do not create another feature branch for the report unless necessary.

Do not merge anything.
