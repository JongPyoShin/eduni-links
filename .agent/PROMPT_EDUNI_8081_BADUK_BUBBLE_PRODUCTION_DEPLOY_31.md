# EDUNI Production 8081 — Baduk + Bubble Shooter Unified Deploy (Prompt 31)

## Objective

Deploy the current merged `feature/eduni-space-mvp` production build to the existing `eduni-game` service on port 8081, thereby publishing both:

- merged Baduk PR #64
- merged Bubble Shooter PR #63

This prompt supersedes the older Baduk-only deployment resume flow for the actual production mutation because both features now live in the same current base and the same 8081 service.

Do not deploy from either old feature branch.

## Repository / target

Repository:

`JongPyoShin/eduni-links`

Production branch:

`feature/eduni-space-mvp`

Required ancestry:

- Baduk merge commit:
  `e5a034ae348b14638f88b94d840d36c19c6ef7ea`

- Bubble Shooter merge commit:
  `fac610cbfd7b08fead9b60dd44ad17c4c633306e`

At prompt creation time the remote base points at the Bubble Shooter merge commit above. This prompt commit itself will advance the branch, so at execution time deploy the **current remote HEAD** of `origin/feature/eduni-space-mvp`, after proving it contains both required merge commits.

## Production endpoints

Primary production game service:

`http://100.75.214.95:8081`

Important routes:

- `/baduk`
- `/bubble-shooter`
- `/bubble`
- `/portal`
- `/`

Historical production ownership from the previous Baduk deployment preflight:

- Docker service/container: `eduni-game`
- previous container ID: `21a8d013e1e2`
- previous image: `eduni-space-mvp-eduni-game`
- previous image ID:
  `sha256:d6f8b40c11d7df74e41658a6301ff1d47952401102c634de105a1e739112dc49`
- host binding observed:
  `100.75.214.95:8081 -> 8080/tcp`

These are historical facts only. Re-identify current ownership before changing anything.

---

# 1. Read instructions and prior deployment evidence

Read:

- root `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_PRODUCTION_DEPLOY_28.md`
- `.agent/PROMPT_EDUNI_BADUK_PRODUCTION_DEPLOY_RESUME_29.md`
- `BADUK_PR64_PRODUCTION_DEPLOY_REPORT_28.md`
- `BUBBLE_SHOOTER_FINAL_SYNC_VERIFY_REPORT_30.md`
- `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`

Do not rerun old prompts independently. Use them only as context.

---

# 2. Safety rules

1. Do not touch production port 8080 or unrelated services.
2. Do not restart unrelated Docker containers.
3. Do not use `git reset --hard`.
4. Do not delete, truncate, move, or overwrite preserved runtime logs.
5. Do not discard local work.
6. Do not deploy an old feature branch.
7. Deploy only current `origin/feature/eduni-space-mvp`.
8. Record rollback identity before rebuilding/recreating the 8081 service.
9. If any unexpected tracked/local source modification exists, stop before production mutation.
10. Do not merge anything during this task.

---

# 3. Preserve known runtime logs

The production checkout previously contained:

- `nice-gui-1-1-7/work/baduk-8081-stderr.log`
- `nice-gui-1-1-7/work/baduk-8081-stdout.log`

The base now intentionally ignores:

`nice-gui-1-1-7/work/*.log`

If the two files exist, record before deployment:

- full path
- file size
- last modified time
- SHA-256

Do not delete, move, rename, stash, or add them to Git.

After syncing the branch and after deployment, verify they remain preserved. If the active service appends to them, report before/after size and hash and classify this as legitimate append-only runtime activity.

---

# 4. Re-identify production ownership

Before changing Git or Docker state, record:

- process/container owning 8081
- Docker service name
- container ID
- image/tag
- image ID
- host PID where applicable
- port mapping
- health status
- creation/start timestamps
- production checkout/worktree used to build the service
- currently deployed source SHA if discoverable

Check the currently served routes before deployment:

- `http://100.75.214.95:8081/baduk`
- `http://100.75.214.95:8081/bubble-shooter`
- `http://100.75.214.95:8081/portal`

Also check container-internal/local service health according to the actual bind semantics.

If `127.0.0.1:8081` fails while the service is specifically bound to `100.75.214.95:8081`, do not classify localhost refusal alone as an app failure. Use the actual configured production address and container-internal endpoint.

---

# 5. Safely sync production checkout

Expected checkout historically:

`D:\Codex\Worktrees\eduni-space-mvp`

Verify rather than assume.

Run equivalent commands:

```powershell
git status --short --untracked-files=all
git status --ignored --short
git branch --show-current
git rev-parse HEAD
git fetch --all --prune
git rev-parse origin/feature/eduni-space-mvp
git merge-base --is-ancestor e5a034ae348b14638f88b94d840d36c19c6ef7ea origin/feature/eduni-space-mvp
git merge-base --is-ancestor fac610cbfd7b08fead9b60dd44ad17c4c633306e origin/feature/eduni-space-mvp
```

Required:

- both ancestry checks succeed
- known ignored runtime logs are not treated as source dirtiness
- no other tracked/untracked source changes are present

Update only by safe fast-forward:

```powershell
git pull --ff-only
```

Then confirm:

```powershell
git rev-parse HEAD
git rev-parse origin/feature/eduni-space-mvp
git status --short --untracked-files=all
git diff --check
```

Local HEAD must equal current remote base HEAD.

---

# 6. Pre-deploy Baduk source markers

Confirm current source still contains:

- `analyzeAiDanger`
- `undo:undoMove`
- `const token=++aiGeneration`
- stale AI generation guard
- `showHint`
- `규칙 보기`
- `aiForcedPasses`
- `assessAiNoMove`
- `finishAiResignation`
- `AI 기권 — 흑 승!`
- `largeSelfAtariRisk`
- `ownGroupSizeAfter`
- `내 집은 끝까지 메우지 않아도 돼요`
- `integrate_v2_coach`
- `integrate_endgame_safety`

Any missing marker blocks deployment.

---

# 7. Pre-deploy Bubble Shooter source/runtime markers

Confirm the served Bubble Shooter source still contains and uses:

- `EDUNIBubbleShooterLogic`
- `<script id="eduni-shooter-logic">`
- `const L = window.EDUNIBubbleShooterLogic`
- `L.resolveShot`
- `L.isDanger`
- `L.selectTarget`
- `L.pointerToCss`
- `L.isGenerationValid`
- generation counter / stale callback protection
- `afterTurn(addBubble)` behavior

Prove the normal current source path injects the shared logic rather than silently falling back to an obsolete runtime.

Any missing required wiring blocks deployment.

---

# 8. Pre-deploy automated tests

From `nice-gui-1-1-7` run at minimum:

```powershell
$env:PYTHONUTF8="1"

python -m unittest tests.test_baduk_endgame_safety
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_game

node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs

node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes

python scripts/validate_content.py
```

Then:

```powershell
python -m unittest discover -s tests
```

And from repo root:

```powershell
git diff --check
```

Expected known focused baselines:

Baduk:
- endgame safety 9/9
- v2 integration 14/14
- persistence integration 7/7
- 19x19 Python 4/4
- game wrapper 8/8
- coach Node 21/21
- 19x19 Node 6/6
- board levels 5/5
- persistence Node 14/14

Bubble Shooter:
- JS 19/19
- Python integration 15/15
- routes 7/7

If total discovery counts have changed because new tests were merged, report actual totals.

No genuine product regression may be ignored.

---

# 9. Rebuild/recreate only the 8081 service

Use the actual production mechanism discovered in step 4.

If it is still Docker/`eduni-game`:

- rebuild only the image/service used by `eduni-game`
- recreate/restart only that service
- do not touch production 8080
- do not touch unrelated containers
- preserve the exact old container/image identity for rollback

Record:

- exact command(s)
- old container ID/image ID/PID
- new container ID/image ID/PID
- health status
- deployed Git SHA

---

# 10. Post-deploy route verification

Verify actual production:

`http://100.75.214.95:8081`

Required:

- `/` — expected response
- `/bubble` — HTTP 200
- `/bubble-shooter` — HTTP 200
- `/baduk` — HTTP 200
- `/baduk/` — HTTP 200
- `/games/eduni-baduk` — expected redirect/HTTP behavior
- `/portal` — HTTP 200

Also confirm portal links for Bubble Shooter and Baduk point to valid routes.

---

# 11. Post-deploy served-source verification — Baduk

Production `/baduk` must contain current merged markers:

- danger analysis
- undo button/runtime
- hint
- rules
- generation guard
- endgame forced-pass state
- AI resignation
- large-group self-atari warning

Specifically confirm representative strings:

- `analyzeAiDanger`
- `id="undo"`
- `undo:undoMove`
- `showHint`
- `const token=++aiGeneration`
- `aiForcedPasses`
- `finishAiResignation`
- `largeSelfAtariRisk`

The old stale production runtime must no longer be served.

---

# 12. Post-deploy served-source verification — Bubble Shooter

Production `/bubble-shooter` must contain:

- `EDUNIBubbleShooterLogic`
- `eduni-shooter-logic`
- `const L = window.EDUNIBubbleShooterLogic`
- generation guard
- shared function delegations

Verify the served production page is the merged PR #63 runtime, not the pre-Phase-1 implementation.

---

# 13. Headed browser smoke — Bubble Shooter

Use actual production `/bubble-shooter`.

At minimum run desktop plus one mobile viewport.

Recommended:

- desktop 1280×800
- portrait 360×800

Use the proven interaction method from Prompt 30:

- `locator.click(position)` for canvas pointer interactions
- do not rely on `page.mouse` if it fails to dispatch this game's pointer event chain

## Correct hit

1. fresh/restarted game
2. identify requested Hanja
3. identify correct bubble
4. record score + bubble count
5. make deterministic correct hit
6. verify:
   - score +100
   - hit bubble removed
   - no immediate pressure replacement bubble
   - target advances normally

## Miss

Verify:

- exactly one pressure bubble added
- no incorrect score
- input remains usable

## Restart race

Perform the deterministic stale-callback test once in production:

1. correct hit
2. restart before delayed praise callback completes
3. wait at least 1.5 seconds
4. verify restarted score/state remains clean
5. no stale mutation
6. no extra bubble
7. no console error

## Mobile

At 360×800 verify:

- no horizontal overflow
- canvas visible
- aiming usable
- one correct hit
- restart usable

---

# 14. Headed browser smoke — Baduk

Because the same 8081 service deploy also publishes the pending Baduk merge, perform a compact production smoke on `/baduk`.

Verify:

1. 9×9 fresh game
2. `무르기`, `힌트`, `규칙 보기` visible
3. one human move → exactly one AI response
4. AI explanation appears
5. undo returns to pre-human decision
6. different move → exactly one fresh AI response
7. hint does not auto-play
8. rules open/close
9. switch 13×13 and 19×19, then back to 9×9
10. board remains interactive
11. zero new console errors

For endgame safety, at minimum verify production served markers. If safe and convenient, exercise one browser-local fixture:

- large-group risk warning, or
- forced-pass explanation

The full two-pass AI resignation path was already verified in headed Chrome before merge; do not introduce production risk solely to recreate it.

---

# 15. Stability / logs

After browser smoke, inspect:

- Docker/service logs
- stderr
- browser console

Require:

- no new server traceback
- no duplicate AI callback in Baduk
- no stale restart callback in Bubble Shooter
- no Bubble Shooter input freeze
- no Baduk input freeze
- no runaway timers/request loops

---

# 16. Rollback rule

Immediately rollback to the recorded pre-deploy container/image if production shows a blocking regression such as:

- service fails health check
- core routes stop rendering
- Bubble Shooter cannot shoot
- Bubble Shooter scores/bubbles incorrectly due to runtime wiring
- stale callback mutates restarted Bubble Shooter game
- Baduk cannot place moves
- duplicate AI responses
- blocking JS exceptions
- portal routing regression

After rollback, verify the previous production state is healthy.

Do not perform broad live debugging while production remains degraded.

---

# 17. Final report

Create:

`EDUNI_8081_BADUK_BUBBLE_PRODUCTION_DEPLOY_REPORT_31.md`

Verdict must be exactly:

- `DEPLOYMENT PASS`
- `DEPLOYMENT FAIL`

Include:

- final deployed branch HEAD
- proof it contains Baduk merge `e5a034ae...`
- proof it contains Bubble merge `fac610cb...`
- pre-deploy deployed state
- old/new container IDs
- old/new image IDs
- old/new PID/health
- preserved runtime-log before/after hashes and sizes
- focused automated test results
- full discovery result
- production route results
- Bubble Shooter served-marker evidence
- Bubble Shooter browser QA evidence
- Bubble Shooter restart-race evidence
- Baduk served-marker evidence
- Baduk browser smoke evidence
- console/server-log status
- rollback required yes/no
- production 8080 untouched yes/no
- remaining risks

Commit and push only the deployment report to:

`feature/eduni-space-mvp`

Do not merge anything.

Do not create another deployment branch unless the existing production checkout cannot safely fast-forward.
