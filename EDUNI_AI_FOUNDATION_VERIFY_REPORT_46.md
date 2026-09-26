# EDUNI AI Foundation — Verify 46 Report

## Verdict

`BLOCKED`

The only unmet runtime gate is the connection-refused smoke: this Windows host drops connections to an unused loopback port until timeout, so the app receives a timeout and correctly returns 504 rather than the required 503. Direct socket and urllib checks reproduced the same host behavior. The unit test that injects a connection-refused `URLError` confirms the provider maps that error to `ProviderUnavailableError`, but it does not replace the required real route smoke.

## Git gate

- Branch: `feature/eduni-ai-foundation`
- HEAD before this report: `66ea9fc81f364ca01cae5adec5f482983b6f21c6`
- Verified product/test implementation baseline: `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`
- The baseline is an ancestor of HEAD. Commits after it change only `EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md` and `.agent/PROMPT_EDUNI_AI_FOUNDATION_VERIFY_46.md`.
- The branch descends from `feature/child-reading-journal` commit `5ea90089bf7d17816843b72b000f4cb4478c5164`.
- PR #69 remains separate and open/draft: head `feature/child-reading-journal` at `fc70a6c223869de9e6e6f5df91348acebdb2ea30`, base `feature/eduni-space-mvp`. No PR exists for `feature/eduni-ai-foundation`.
- No merge or deployment was performed.

Product/test files changed by AI-1 relative to the reading-journal base:

- `nice-gui-1-1-7/portal_app/__init__.py`
- `nice-gui-1-1-7/portal_app/ai/__init__.py`
- `nice-gui-1-1-7/portal_app/ai/config.py`
- `nice-gui-1-1-7/portal_app/ai/prompts.py`
- `nice-gui-1-1-7/portal_app/ai/providers/__init__.py`
- `nice-gui-1-1-7/portal_app/ai/providers/base.py`
- `nice-gui-1-1-7/portal_app/ai/providers/disabled.py`
- `nice-gui-1-1-7/portal_app/ai/providers/local_openai.py`
- `nice-gui-1-1-7/portal_app/ai/routes.py`
- `nice-gui-1-1-7/portal_app/ai/service.py`
- `nice-gui-1-1-7/portal_app/ai/tools.py`
- `nice-gui-1-1-7/portal_app/reading_journal.py`
- `nice-gui-1-1-7/tests/test_ai.py`
- `nice-gui-1-1-7/tests/test_reading_journal.py`

## Automated validation

- `python scripts/validate_content.py`: PASS (`VALID: 1 enabled activities`)
- `python -m unittest tests.test_ai`: PASS, 25 tests
- `python -m unittest tests.test_reading_journal`: PASS, 16 tests
- `python -m unittest tests.test_routes`: PASS, 7 tests
- `PYTHONUTF8=1 python -m unittest discover -s tests`: PASS, 200 tests, 1 skipped
- The skip is the PostgreSQL integration class, gated on `EDUNI_ALLOW_POSTGRES_TESTS=1`; no PostgreSQL service was started or contacted.
- The first full-suite run with the default Windows CP949 process encoding had 3 Node-backed test errors while decoding Korean subprocess output. No files were changed; rerunning with Python UTF-8 mode passed.
- `python -m compileall -q portal_app tests`: PASS
- `git diff --check`: PASS

## Runtime checks

All runtime checks used temporary loopback-only EDUNI processes, a temporary SQLite database/data directory, and an in-process fake OpenAI-compatible HTTP server. No real LLM, Docker, PostgreSQL, or production data was used.

### Disabled mode

- `/healthz`, `/portal`, `/reading`, `/reading/api/records`: all HTTP 200
- `/ai/health`: HTTP 200, `provider=disabled`, `configured=false`, tools exactly `reading_search`
- `POST /ai/chat`: HTTP 503, `{"ok":false,"error":"ai_unavailable"}`

### Local fake-provider E2E

- Same existing routes returned HTTP 200; AI health reported configured local provider and only `reading_search`, without exposing the configured endpoint or model.
- A request attempting provider/model/system prompt/profile overrides returned HTTP 400 and made zero provider requests.
- Fake provider observed server-configured model `fake-local-model`, `max_tokens=800`, exactly one tool (`reading_search`), and `tool_choice=auto`.
- The tool requested 50 rows over 12 matching child-visible records; result retained the expected newest record and contained only 10 rows. `parent_note`, `cover_filename`, `created_at`, and temporary storage paths were absent.
- EDUNI returned HTTP 200 with the expected final Korean answer, `provider=local`, and `tool_calls=1`.
- A unique parent-note-only keyword remained searchable by the existing human reading API (`total=1`), while the AI tool returned `records=[]`, `total=0`.

### Failure paths

- Delayed fake provider: HTTP 504 `ai_timeout`, sanitized; no traceback or endpoint details.
- Malformed fake-provider response: HTTP 502 `ai_failed`; malformed payload marker and endpoint details were hidden.
- Unused loopback port: HTTP 504 `ai_timeout`, sanitized, instead of required HTTP 503 `ai_unavailable`. A direct `socket.create_connection` and urllib request to an unused `127.0.0.1` port also timed out on this host. The unit test's injected `URLError("connection refused")` path passes, but the real refusal route gate remains unverified here.

## Security and compatibility audit

- The AI package exposes only `reading_search`, delegated to existing `search_reading_records(...)` with `search_parent_note=False`; it does not duplicate SQL or access the database directly.
- Source scan found no subprocess/shell, Docker API/CLI, GitHub write client, SQL/database driver, arbitrary filesystem operation, or cloud-provider code in the executable AI package. The local provider uses HTTP only for its configured local/private endpoint. Prompt mentions denying Docker/GitHub capabilities are not executable integrations.
- AI configuration defaults to disabled, allows only disabled/local provider, validates timeout bounds and local/private URL restrictions, and requires model/base URL for local mode. Health output excludes URL/model.
- `requirements.txt` has no AI-1 dependency change. No credentials or secrets were added by this verification.
- Existing reading-search behavior remains intact: human search finds parent-note text; the AI search path excludes it. Reading CRUD/search and route tests passed.

## Safety and cleanup

- Production `eduni-game`, port 8081, production `eduni_data`, existing PostgreSQL resources, Nextcloud, `codex-uv-lock-pg`, and `flopi-pr87-pg-20260911` were not touched.
- Fake server and isolated EDUNI processes were stopped. Temporary database/data directories were removed automatically. Temporary verification scripts were removed; only this report is intended for commit.
- No product code or tests were modified during Verify 46. No PR was created; no merge/deploy occurred.

## Remaining risk

The real unused-port route behavior must be rerun in an environment where loopback TCP refusal is delivered promptly. Until that verifies HTTP 503 `ai_unavailable`, this run remains `BLOCKED`, not PASS.
