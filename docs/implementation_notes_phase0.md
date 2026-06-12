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
- Added `-NoGitPublish` to `update_links.ps1` for generation-only runs.
- Added family-server `/portal`, `/portal/world/{world}`, and `/portal/parent` routes under `nice-gui-1-1-7`.
- Added a world registry, Activity schema, recursive privacy validation, JSON content loader, validator script, SQLite table initialization, parent PIN helpers, and privacy-default tests.
- Added one valid sample activity JSON for schema validation only.
- Kept invalid JSON fixture under `nice-gui-1-1-7/tests/fixtures/invalid/`, outside the real content tree.
- Added runtime `.gitignore` entries for Python caches and local SQLite databases.

Phase 1 activity implementations were not started.

## Changed Files

- `.gitignore`
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
Ran 16 tests
OK
```

PowerShell parse check:

```powershell
$script = Get-Content -LiteralPath "D:\Codex\Worktrees\eduni-portal-phase0\update_links.ps1" -Raw
$null = [scriptblock]::Create($script)
```

Result: `update_links.ps1 parse OK`.

Smoke test container:

```powershell
docker run -d --rm --name eduni-phase0-smoke -p 8098:8080 -e EDUNI_HOST=0.0.0.0 -e EDUNI_PARENT_PIN_HASH="<pbkdf2_hash>" -v D:/Codex/Worktrees/eduni-portal-phase0/nice-gui-1-1-7:/app -w /app python:3.11-slim sh -c "pip install --no-cache-dir nicegui >/tmp/pip.log 2>&1 && python app.py"
```

Result:

```text
/ 200
/bubble 200
/bubble-shooter 200
/portal 200
/portal/world/math 200
/portal/parent 200
```

Existing hanja entry check:

```powershell
Invoke-WebRequest -Uri "http://100.75.214.95:8080/hanja" -UseBasicParsing -TimeoutSec 20
```

Result: `200`.

## Compatibility Notes

- Existing `nice-gui-1-1-7` routes `/`, `/bubble`, and `/bubble-shooter` remain declared in `app.py`.
- New dynamic portal routes are registered by `portal_app.routes.register_pages()` and do not replace existing game routes.
- Existing static redirect files for `hanja`, `tetris`, `bubble`, and `bubble-shooter` are not structurally changed by this implementation.
- `update_links.ps1` still reads status files and still writes the existing redirect pages. It now also writes `portal/config/links.json`.
- The public static launcher uses relative fallback links if `portal/config/links.json` is unavailable.
- Parent PIN is not stored in plaintext. Parent PIN verification uses PBKDF2-HMAC-SHA256 with random salt and formatted hashes: `pbkdf2_sha256$iterations$salt$digest`.
- `/portal/parent` has a minimal PIN gate. Real dashboard data remains a Phase 1 placeholder.
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

- Family-server deployment needs network exposure scope review before enabling access from other devices.
- Default `update_links.ps1` execution preserves the existing automatic publish behavior for backward compatibility.
- Parent dashboard real data, persistent login sessions, and PIN retry limits remain follow-up work.
