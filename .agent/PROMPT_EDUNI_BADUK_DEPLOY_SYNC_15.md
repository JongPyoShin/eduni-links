# PROMPT 15 — EDUNI Baduk deployment sync / stale 8081 diagnosis

## Goal

The live private server at `http://100.75.214.95:8081/baduk` appears to be serving the old fixed 9×9 Baduk UI instead of the recently completed Baduk v2.

Bring the 8081 service into sync with the verified Git state and prove that the live `/baduk` endpoint serves the current v2 UI and runtime.

This is a deployment/runtime synchronization task, not a feature-development task.

## Known-good Git baseline

Repository:
- `https://github.com/JongPyoShin/eduni-links`

Expected branch:
- `feature/eduni-space-mvp`

Expected baseline commit before this prompt file was added:
- `26757fa00fd35607c3639546b5acd1511bc19ccf`

The branch now includes this prompt commit as well, so the exact server HEAD may be newer than the baseline above. The important requirement is that it is on the current remote `origin/feature/eduni-space-mvp` and contains the merged Baduk PR #60, #61, and #62 changes.

Expected Baduk serving path:
- `nice-gui-1-1-7/portal_app/baduk.py`
- `_BADUK_HTML = "eduni_baduk_v2.html"`

Expected v2 asset:
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_v2.html`

Expected v2 visible controls include:
- `바둑판 · 학습 레벨`
- `초급 · 9×9`
- `중급 · 13×13`
- `정규 · 19×19`
- `AI와 두기`
- `둘이 두기`
- `실시간 바둑 코치`

The old file `eduni_baduk.html` is a legacy 9×9-only page and must NOT be the runtime source for `/baduk`.

## Critical safety rules

1. Do NOT use `git reset --hard`, forced checkout, `git clean -fd`, or any other destructive cleanup.
2. Do NOT discard or overwrite local uncommitted work.
3. If the server checkout is dirty, record the changed/untracked files first. Do not modify them blindly.
4. Do NOT change unrelated services, routes, database files, ports, Cloudflare/Tailscale settings, Android code, Bubble Shooter work, or deployment architecture.
5. Prefer restarting only the 8081 EDUNI game service. Do not restart the 8080 Hanja/DB service unless absolutely required and explicitly documented.
6. Do not create feature-code changes just to make deployment pass. First fix checkout/process mismatch.
7. Preserve `/`, `/bubble`, `/bubble-shooter`, `/portal`, `/baduk`, and all existing routes.

## Phase A — Identify the actual process and checkout serving port 8081

On the server PC, capture evidence before making changes.

Run and report:

```powershell
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git rev-parse HEAD
git status --short
```

Also identify the process listening on 8081:

```powershell
Get-NetTCPConnection -LocalPort 8081 -State Listen | Format-Table -AutoSize
```

For the owning PID, inspect command line and executable:

```powershell
$pid8081 = (Get-NetTCPConnection -LocalPort 8081 -State Listen | Select-Object -First 1).OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$pid8081" | Select-Object ProcessId,ExecutablePath,CommandLine
```

Determine the actual working checkout used to launch `app.py`.

If multiple clones/worktrees exist, explicitly list them and identify which one is serving 8081. Do not assume the current shell directory is the active server checkout.

## Phase B — Prove whether the running server is stale

Before restart, query the current live HTML:

```powershell
$before = (Invoke-WebRequest 'http://127.0.0.1:8081/baduk' -UseBasicParsing).Content
$before | Select-String '중급 · 13×13'
$before | Select-String '정규 · 19×19'
$before | Select-String '실시간 바둑 코치'
$before | Select-String '9×9 입문 바둑 · 흑이 먼저 둬요'
```

Classify the result:

- **LATEST V2**: contains 13×13, 19×19, and realtime coach controls.
- **LEGACY**: contains old `9×9 입문 바둑 · 흑이 먼저 둬요` layout and lacks level controls.
- **UNKNOWN**: neither signature is conclusive.

Record the classification.

## Phase C — Synchronize the serving checkout safely

In the actual checkout that owns the 8081 service:

```powershell
git fetch origin
```

Verify the remote target:

```powershell
git rev-parse origin/feature/eduni-space-mvp
```

If the checkout is clean, switch/update safely:

```powershell
git switch feature/eduni-space-mvp
git pull --ff-only origin feature/eduni-space-mvp
```

If the checkout is dirty:

- Do NOT reset or clean.
- Report every dirty file.
- Determine whether changes are unrelated local work.
- Use a safe existing clean worktree/clone for deployment if one already exists, or stop and report the blocker rather than losing work.

After sync, report:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
```

Then prove the source wiring:

```powershell
Select-String -Path '.\nice-gui-1-1-7\portal_app\baduk.py' -Pattern '_BADUK_HTML = "eduni_baduk_v2.html"'
Select-String -Path '.\nice-gui-1-1-7\portal_app\static_games\eduni_baduk_v2.html' -Pattern '중급 · 13×13','정규 · 19×19','실시간 바둑 코치'
```

Also verify persistence assets are present:

```powershell
Test-Path '.\nice-gui-1-1-7\portal_app\static_games\eduni_baduk_persistence.js'
Test-Path '.\nice-gui-1-1-7\portal_app\static_games\eduni_baduk_ai_strategy.js'
Test-Path '.\nice-gui-1-1-7\portal_app\static_games\eduni_baduk_coach_logic.js'
```

All three should be `True`.

## Phase D — Restart only the 8081 EDUNI game service

The app entrypoint is:

- `nice-gui-1-1-7/app.py`

The application uses:

```python
port = int(os.environ.get('PORT', '8080'))
host = os.environ.get('EDUNI_HOST', '127.0.0.1')
```

Restart the process on 8081 from the synchronized checkout.

Preserve the server's current accessibility requirements. If it is expected to be reachable through Tailscale at `100.75.214.95`, ensure `EDUNI_HOST` is the same value used by the working deployment, commonly `0.0.0.0` if required. Do not guess silently; inspect the current process/start script first.

A safe restart flow is:

1. identify current PID on 8081;
2. stop only that PID;
3. start `nice-gui-1-1-7/app.py` from the correct checkout with `PORT=8081` and the existing host configuration;
4. wait for HTTP 200.

Do not use the broad `start_eduni_services.ps1` unless necessary because it also stops/restarts 8080 and other tunnel processes.

Capture the new PID and command line.

## Phase E — Verify local runtime after restart

Require HTTP 200:

```powershell
Invoke-WebRequest 'http://127.0.0.1:8081/baduk' -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest 'http://127.0.0.1:8081/portal' -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest 'http://127.0.0.1:8081/bubble-shooter' -UseBasicParsing | Select-Object StatusCode
```

Then inspect served `/baduk` HTML:

```powershell
$html = (Invoke-WebRequest 'http://127.0.0.1:8081/baduk' -UseBasicParsing).Content
$html | Select-String '바둑판 · 학습 레벨'
$html | Select-String '초급 · 9×9'
$html | Select-String '중급 · 13×13'
$html | Select-String '정규 · 19×19'
$html | Select-String '실시간 바둑 코치'
$html | Select-String 'eduni_baduk_persistence'
```

The first five UI signatures are mandatory.

For persistence, do not rely only on a literal filename if scripts are injected inline. Instead additionally verify runtime persistence markers or the known storage module code if the filename itself is not present.

Also verify the legacy-only subtitle is NOT the active served signature:

```powershell
$html | Select-String '9×9 입문 바둑 · 흑이 먼저 둬요'
```

Expected: no legacy page signature.

## Phase F — Verify through the actual Tailscale/private URL

From a client that can reach the server, verify:

- `http://100.75.214.95:8081/baduk`

Require:

- HTTP 200
- level selector visible
- 9×9 / 13×13 / 19×19 options visible
- AI/local mode visible
- realtime coach toggle visible
- `새 게임`, `한 수 쉬기`, `기권`, `도움말` visible

Then interactively test:

1. choose 13×13 and start a game;
2. confirm board actually becomes 13×13;
3. choose 19×19 and confirm 19×19 board;
4. switch back to 9×9;
5. make at least one legal move against AI;
6. verify AI responds;
7. verify coach preview/confirm flow still works;
8. reload and verify save/resume behavior still works;
9. confirm no duplicate AI move after an AI-turn restore.

If browser cache is suspected, use a hard refresh or cache-busting query only for diagnosis, e.g. `/baduk?verify=<timestamp>`. Do not treat cache as the root cause unless the HTTP body from `Invoke-WebRequest` is already correct while the browser alone is stale.

## Phase G — Minimal regression

Run the focused Baduk test suites from `nice-gui-1-1-7`:

```powershell
python -m unittest tests.test_baduk_v2_integration tests.test_baduk_19x19_ai tests.test_baduk_persistence_integration
```

Run Node tests when Node is available:

```powershell
node --test tests/baduk_board_levels.test.mjs tests/baduk_coach_logic.test.mjs tests/baduk_19x19_ai.test.mjs tests/baduk_persistence.test.mjs
```

Also run:

```powershell
python scripts/validate_content.py
```

If an existing known Windows cp949-only failure appears in unrelated `test_baduk_game`, report it separately and do not conflate it with deployment sync.

## Do not do

- Do not merge or alter the Bubble Shooter branch.
- Do not edit Baduk rules/AI/UI merely to fix a deployment mismatch.
- Do not replace `eduni_baduk_v2.html` with the old `eduni_baduk.html`.
- Do not remove localStorage save/resume.
- Do not remove the 19×19 global AI strategy.
- Do not remove realtime coach integration.
- Do not force-push or rewrite Git history.
- Do not merge any PR as part of this task.

## Final report format

Return exactly these sections:

### DEPLOYMENT-VERDICT
- `PASS` if live `100.75.214.95:8081/baduk` serves verified v2 and focused tests pass.
- `BLOCKED` if safe synchronization/restart cannot be completed.

### ROOT-CAUSE
State the actual cause, e.g. stale branch, stale checkout, stale process, wrong worktree, browser cache, or other evidence-backed cause.

### SERVER-CHECKOUT
- repo path
- branch before / after
- HEAD before / after
- dirty status before / after

### PORT-8081
- old PID / command
- new PID / command
- host binding

### BADUK-RUNTIME-EVIDENCE
Report whether live served HTML contains:
- 9×9
- 13×13
- 19×19
- realtime coach
- save/resume runtime
- legacy-only signature absent

### LIVE-BROWSER-QA
Report the actual `http://100.75.214.95:8081/baduk` checks and interaction results.

### TESTS
List Python, Node, route, and content validation results.

### CHANGES-MADE
Deployment/runtime changes only. If source code was changed, explain why; source changes should normally be `NONE`.

### REMAINING-RISKS
Any remaining cache, startup automation, duplicate checkout, or service-management risk.

Do not declare PASS based only on Git source inspection. PASS requires the live 8081 endpoint itself to be verified after restart.
