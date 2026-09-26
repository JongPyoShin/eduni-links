# EDUNI Port 8080 Release — Verify 47

## Mission

Verify only the EDUNI port migration that frees host port 8080.

Repository: JongPyoShin/eduni-links
Branch: fix/eduni-free-port-8080
Base: feature/child-reading-journal

Do not modify product code.
Do not merge.
Do not deploy.
Do not stop, kill, bind, or otherwise touch any process currently using host port 8080.

## Expected port contract

- DB/Hanja service: 18080
- EDUNI portal external host port: 8081
- EDUNI game container/internal port: 18081
- PostgreSQL: 5432 internal-only
- host port 8080: reserved for another project and must not be used by EDUNI

## 1. Git gate

Confirm:

- branch = fix/eduni-free-port-8080
- base = feature/child-reading-journal
- changes are limited to EDUNI port configuration, runtime scripts, generated static links, and the port regression test
- no AI product code was changed
- no merge/deploy occurred

## 2. Exact 8080 audit

The following active runtime/config files must contain no exact standalone port 8080:

- docker-compose.yml
- nice-gui-1-1-7/Dockerfile
- nice-gui-1-1-7/app.py
- nice-gui-1-1-7/scripts/start_eduni_services.ps1
- nice-gui-1-1-7/scripts/watch_eduni_services.ps1
- portal/config/links.json
- db/index.html
- files-mentioned-by-the-user-oracle/app.py
- files-mentioned-by-the-user-oracle/start_external_access.ps1

Use an exact numeric boundary check such as:

`(?<!\d)8080(?!\d)`

Do not treat 18080 as an 8080 hit.

Historical docs/logs/output snapshots are not runtime configuration and are not part of this gate.

## 3. Required static contract

Confirm:

### DB/Hanja

- Oracle DB Quiz app runs on 18080
- start script stops/checks 18080, never 8080
- watch script checks 18080
- external-access tunnel points to 127.0.0.1:18080
- portal DB/Hanja links point to 100.75.214.95:18080
- db/index.html redirects to 18080

### EDUNI main app

- app.py default PORT = 18081
- Dockerfile PORT = 18081
- Dockerfile EXPOSE = 18081
- docker-compose eduni-game PORT = 18081
- docker-compose mapping remains host 8081 -> container 18081
- healthcheck uses 127.0.0.1:18081/healthz

### PostgreSQL

- still internal 5432
- no host 5432 publication added

## 4. Generated links

Run only generation-safe link refresh if needed:

`powershell -NoProfile -ExecutionPolicy Bypass -File ./update_links.ps1 -NoGitPublish`

Do not publish/commit generated changes automatically.

Confirm generation does not reintroduce 8080.

If generation changes expected tracked files, report the diff rather than silently committing unrelated output.

## 5. Automated validation

From repository root:

~~~powershell
cd nice-gui-1-1-7
python -m unittest tests.test_port_configuration
python -m unittest tests.test_routes
python scripts/validate_content.py
cd ..
git diff --check
~~~

Record exact totals.

## 6. Compose validation

Use a temporary verification-only password environment variable:

~~~powershell
$env:EDUNI_POSTGRES_PASSWORD='verify-only-not-production'
docker compose config
Remove-Item Env:EDUNI_POSTGRES_PASSWORD
~~~

Confirm rendered compose contains:

- host published 8081
- target/container 18081
- health target 18081
- PostgreSQL internal 5432 only
- no published/bound 8080

Do not run production compose up.

## 7. 8080 non-interference

Before any optional runtime smoke:

- inspect whether host port 8080 currently has a listener
- record its owning PID/process if visible
- do not stop or alter it

After verification:

- confirm the same 8080 listener state remains unchanged

If another project is already using 8080, that is expected and must not be treated as a failure.

## 8. Optional isolated EDUNI image smoke

If Docker build is available, build a verification-only candidate image.

Run it with:

- container port 18081
- an unused loopback-only high host port, not 8080 and not production 8081
- isolated temp data

Confirm:

- /healthz = 200
- app listens internally on 18081
- host 8080 state unchanged

Do not start production eduni-game.

## 9. PowerShell safety

Parse/inspect:

- start_eduni_services.ps1
- watch_eduni_services.ps1
- files-mentioned-by-the-user-oracle/start_external_access.ps1

Confirm none contains a command that calls:

`Stop-PortOwner 8080`

This is a hard safety gate.

Do not execute the full production start script as part of verification.

## 10. Cleanup

Remove only verification resources created by this run.

Do not touch:

- production eduni-game
- Nextcloud
- PostgreSQL resources unrelated to this run
- codex-uv-lock-pg
- flopi-pr87-pg-20260911
- the project currently using host port 8080

## 11. Report

Create and commit/push:

`EDUNI_PORT_8080_VERIFY_REPORT_47.md`

Include:

- exact verified HEAD
- changed files
- exact-8080 audit result
- focused test totals
- route/content validation result
- compose config evidence
- 8080 listener before/after evidence
- optional image smoke result
- production resources untouched
- cleanup result

Final verdict exactly one:

`EDUNI PORT VERIFY PASS — 8080 FREE FOR OTHER PROJECT`

`EDUNI PORT VERIFY FAIL`

`BLOCKED`

If PASS, recommendation exactly:

`MERGE AFTER PR #69`

Do not merge.
Do not deploy.
