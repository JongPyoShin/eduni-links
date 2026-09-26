# EDUNI Port 8080 — Verify 47 Report

## Verdict

`EDUNI PORT VERIFY PASS — 8080 FREE FOR OTHER PROJECT`

Recommendation: `MERGE AFTER PR #69`

## Git gate

- Branch: `fix/eduni-free-port-8080`
- Verified HEAD before this report: `07c79b721e9ce20c6ad83f6ad402d327556d8e28`
- Base branch: `feature/child-reading-journal`, merge-base `fc70a6c223869de9e6e6f5df91348acebdb2ea30`
- Changes are limited to EDUNI/DB-Hanja port configuration, startup/watch/tunnel scripts, generated links/redirect, the port regression test, and verification instructions.
- No AI product or test files changed. No merge or deployment occurred.
- Verify 47 made no product/test code changes; this report is the only file intended for the verification commit.

Changed files in the feature diff:

- `.agent/PROMPT_EDUNI_PORT_8080_VERIFY_47.md`
- `db/index.html`
- `docker-compose.yml`
- `files-mentioned-by-the-user-oracle/app.py`
- `files-mentioned-by-the-user-oracle/start_external_access.ps1`
- `nice-gui-1-1-7/Dockerfile`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/scripts/start_eduni_services.ps1`
- `nice-gui-1-1-7/scripts/watch_eduni_services.ps1`
- `nice-gui-1-1-7/tests/test_port_configuration.py`
- `portal/config/links.json`

## Port audit and contract

The exact standalone-port pattern `(?<!\d)8080(?!\d)` returned no hits in all nine specified active runtime/config files. `18080` was not treated as an `8080` hit. Script audit found no `Stop-PortOwner 8080` command. PowerShell parser checks passed for the start, watch, and external-access scripts.

Confirmed contract:

- Oracle DB/Hanja listens on port `18080`; start/watch and tunnel use `127.0.0.1:18080`.
- Static DB/Hanja links and `db/index.html` redirect use `100.75.214.95:18080`.
- EDUNI app default, Dockerfile `PORT`/`EXPOSE`, and container port are `18081`.
- Compose publishes `100.75.214.95:8081 -> 18081`; healthcheck targets `127.0.0.1:18081/healthz`.
- PostgreSQL client port remains internal `5432`; rendered Compose has no PostgreSQL host-published ports.
- Generated-link refresh was not needed: checked-in generated links already match the port contract. The generator was not run, avoiding unnecessary rewrites from runtime tunnel status files.

## Validation

- Exact port regression tests: `python -m unittest tests.test_port_configuration` — PASS, 4 tests.
- Existing routes: `python -m unittest tests.test_routes` — PASS, 7 tests.
- Content validation: `python scripts/validate_content.py` — PASS (`VALID: 1 enabled activities`).
- `git diff --check` — PASS.
- `docker compose config` with temporary verification-only `EDUNI_POSTGRES_PASSWORD` — PASS. Rendered EDUNI mapping is host 8081 to container 18081, internal healthcheck targets 18081, PostgreSQL publishes no host ports, and no 8080 mapping is present. Temporary environment variable was removed.

## Isolated image smoke

Docker build was available, so a verification-only image/container was used without starting production Compose services:

- Host mapping: loopback-only `127.0.0.1:57438 -> container:18081`.
- Host `/healthz`: HTTP 200.
- Container-internal `127.0.0.1:18081/healthz`: HTTP 200.
- Candidate container and uniquely tagged image were removed after the smoke.

## Host port 8080 non-interference

Before and after all verification, the same listener was present at `127.0.0.1:8080`, owned by PID `17652` (`python`, `D:\Codex\Programs\Python311\python.exe`). It was only inspected; it was never stopped, killed, bound, or contacted. The smoke used only loopback port `57438`, not host ports 8080 or 8081.

## Safety and cleanup

- Production `eduni-game`, production port 8081, PostgreSQL resources, Nextcloud, and the project using host port 8080 were not accessed or modified.
- The temporary candidate container and image tag were removed. Shared Docker build cache was left intact rather than pruning cache used by other projects.
- No temporary verification files or services remain. No PR was created, no merge occurred, and no deployment occurred.
