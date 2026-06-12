# Phase 0 Implementation Notes

Date: 2026-06-12
Branch: `feature/eduni-portal-phase0`
Base: `origin/main` at `1487757`

## Scope

Implemented Phase 0 foundation only.

- Reused `portal/index.html` as the public static launcher.
- Removed hard-coded internal IP addresses from the static portal.
- Added `portal/config/links.json` as generated link configuration with safe relative fallbacks.
- Extended `update_links.ps1` to refresh `portal/config/links.json` while preserving existing redirect generation.
- Added family-server `/portal`, `/portal/world/{world}`, and `/portal/parent` routes under `nice-gui-1-1-7`.
- Added a world registry, Activity schema, JSON content loader, validator script, SQLite table initialization, parent PIN hash helpers, and privacy-default tests.
- Added one valid sample activity JSON for schema validation only.
- Kept invalid JSON fixture under `nice-gui-1-1-7/tests/fixtures/invalid/`, outside the real content tree.

Phase 1 activity implementations were not started.

## Changed Files

- `portal/index.html`
- `portal/config/links.json`
- `update_links.ps1`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/__init__.py`
- `nice-gui-1-1-7/portal_app/routes.py`
- `nice-gui-1-1-7/portal_app/registry.py`
- `nice-gui-1-1-7/portal_app/schemas.py`
- `nice-gui-1-1-7/portal_app/content_loader.py`
- `nice-gui-1-1-7/portal_app/database.py`
- `nice-gui-1-1-7/portal_app/recommendation.py`
- `nice-gui-1-1-7/content/activities/math/pattern_train_001.json`
- `nice-gui-1-1-7/scripts/validate_content.py`
- `nice-gui-1-1-7/tests/test_content_validation.py`
- `nice-gui-1-1-7/tests/test_database.py`
- `nice-gui-1-1-7/tests/test_privacy_defaults.py`
- `nice-gui-1-1-7/tests/test_routes.py`
- `nice-gui-1-1-7/tests/fixtures/invalid/missing_title.json`
- `docs/implementation_notes_phase0.md`

## Existing Local Change Isolation

The original working directory had unrelated modified and untracked files. Phase 0 work was done in a separate worktree:

```powershell
git -C "D:\Codex\Projects\eduni-links" fetch origin main
git -C "D:\Codex\Projects\eduni-links" worktree add -b feature/eduni-portal-phase0 "D:\Codex\Worktrees\eduni-portal-phase0" origin/main
```

No files from the original dirty worktree were deleted, reset, overwritten, or included.

## Commands And Results

Read remote baseline:

```powershell
git -C "D:\Codex\Projects\eduni-links" fetch origin main
```

Result: `origin/main` updated to `1487757`.

Validator:

```powershell
docker run --rm -v D:/Codex/Worktrees/eduni-portal-phase0/nice-gui-1-1-7:/app -w /app python:3.11-slim python scripts/validate_content.py
```

Result:

```text
VALID: 1 enabled activities
```

Invalid fixture check:

```powershell
docker run --rm -v D:/Codex/Worktrees/eduni-portal-phase0/nice-gui-1-1-7:/app -w /app python:3.11-slim python scripts/validate_content.py tests/fixtures/invalid
```

Result: expected failure.

```text
INVALID: tests/fixtures/invalid/missing_title.json: missing required fields: title
```

Automated tests:

```powershell
docker run --rm -v D:/Codex/Worktrees/eduni-portal-phase0/nice-gui-1-1-7:/app -w /app python:3.11-slim python -m unittest discover -s tests
```

Result:

```text
Ran 8 tests in 0.109s
OK
```

Privacy/static scan:

```powershell
rg -n "100\.75|http://100|navigator\.geolocation|getUserMedia|googletagmanager|google-analytics|doubleclick|facebook.com/sharer|adservice" portal/index.html nice-gui-1-1-7/portal_app nice-gui-1-1-7/content
```

Result: no matches.

`update_links.ps1` parse check:

```powershell
$script = Get-Content -LiteralPath "D:\Codex\Worktrees\eduni-portal-phase0\update_links.ps1" -Raw
$null = [scriptblock]::Create($script)
```

Result: `update_links.ps1 parse OK`.

Smoke test container:

```powershell
docker run -d --rm --name eduni-phase0-smoke -p 8098:8080 -v D:/Codex/Worktrees/eduni-portal-phase0/nice-gui-1-1-7:/app -w /app python:3.11-slim sh -c "pip install --no-cache-dir nicegui >/tmp/pip.log 2>&1 && python app.py"
docker exec eduni-phase0-smoke python -c "import urllib.request; paths=['/','/bubble','/bubble-shooter','/portal','/portal/world/math','/portal/parent']; ..."
```

Result:

```text
/ 200 40872
/bubble 200 23714
/bubble-shooter 200 428803
/portal 200 17420
/portal/world/math 200 10186
/portal/parent 200 10125
```

Existing hanja entry check:

```powershell
Invoke-WebRequest -Uri "http://100.75.214.95:8080/hanja" -UseBasicParsing -TimeoutSec 20
```

Result: `200`, length `271762`.

## Compatibility Notes

- Existing `nice-gui-1-1-7` routes `/`, `/bubble`, and `/bubble-shooter` remain declared in `app.py`.
- New dynamic portal routes are registered by `portal_app.routes.register_pages()` and do not replace existing game routes.
- Existing static redirect files for `hanja`, `tetris`, `bubble`, and `bubble-shooter` are not structurally changed by this implementation.
- `update_links.ps1` still reads status files and still writes the existing redirect pages. It now also writes `portal/config/links.json`.
- The public static launcher uses relative fallback links if `portal/config/links.json` is unavailable.
- Parent PIN is not stored in plaintext. Phase 0 uses `EDUNI_PARENT_PIN_HASH` and optional `EDUNI_PARENT_PIN_SALT` helpers, with a placeholder parent page.
- Parent PIN verification now uses PBKDF2-HMAC-SHA256 formatted hashes: `pbkdf2_sha256$iterations$salt$digest`.
- For family-server deployment from Docker or another host, keep the secure local default or set:

```powershell
$env:EDUNI_HOST = "0.0.0.0"
python app.py
```

- To refresh static redirect files and `portal/config/links.json` without git publishing:

```powershell
.\update_links.ps1 -NoGitPublish
```

## Remaining Risks

- `update_links.ps1` still contains its pre-existing auto commit/push behavior. It was not executed in this implementation run to avoid mixing changes unexpectedly.
- The app defaults to `127.0.0.1` and supports `EDUNI_HOST=0.0.0.0` for family-server deployment. Deployment settings still need review before exposing it to other devices.
- The Activity schema uses Pydantic when available and a compatible fallback when Pydantic is unavailable. A production deployment should confirm the intended Pydantic version.
- `/portal/parent` is a placeholder and does not yet implement full PIN entry flow or parent dashboard data.
