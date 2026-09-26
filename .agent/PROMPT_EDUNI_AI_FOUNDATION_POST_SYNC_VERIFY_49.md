# EDUNI AI Foundation — Post-Sync Final Verify 49

## Mission

Verify the REAL synchronized `feature/eduni-ai-foundation` branch after the
verified base was merged into it.

Repository: JongPyoShin/eduni-links
Branch: feature/eduni-ai-foundation
Target base: feature/eduni-space-mvp

Expected refs at instruction creation:

- feature/eduni-ai-foundation:
  `c1b2b19e70439883e74a7cb9264a9b94a299c81f`
- feature/eduni-space-mvp:
  `0bcec5d14fb7b9e7827cb9fa9ea3bc9a060a9c2e`
- Verify 48 report:
  `4370fd1171710982891d21383ba12111a0715efb`
- AI implementation baseline:
  `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`

At instruction creation the AI branch is:

- ahead of base: 35
- behind base: 0
- merge base: `0bcec5d14fb7b9e7827cb9fa9ea3bc9a060a9c2e`

Always fetch current remote refs first and record any movement.

This is a FINAL POST-SYNC VERIFICATION gate.

Do not modify product code.
Do not merge the AI branch into the base.
Do not deploy.
Do not start AI-2.
Do not touch host 8080 or production 8081.

If verification PASSes, creating the AI PR targeting
`feature/eduni-space-mvp` is authorized by the user's current instruction.
Do not merge that PR.

## Read first

- AGENTS.md
- nice-gui-1-1-7/AGENTS.md
- docs/handovers/EDUNI_HANDOFF_2026-09-24.md
- docs/eduni_ai/PLAN.md
- EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md
- EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md
- EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_REPORT_46B.md
- EDUNI_PORT_8080_VERIFY_REPORT_47.md
- EDUNI_AI_FOUNDATION_BASE_SYNC_REHEARSAL_REPORT_48.md

## 1. Git gate

Confirm:

- current branch = `feature/eduni-ai-foundation`
- HEAD is the expected sync merge commit above or a documentation-only descendant
- `feature/eduni-space-mvp` is an ancestor of the AI branch
- AI branch is behind base by 0
- actual sync merge commit exists
- no product/test code changed after the verified AI implementation baseline except
  the already reviewed base-side Reading Journal / port changes
- no AI feature PR has already been merged
- no deployment occurred

Record:

- exact AI HEAD
- exact base HEAD
- merge base
- ahead/behind counts
- changed product/test files relative to base

If the base moved after the sync and AI is behind again, verdict = BLOCKED and do not
create the AI PR.

## 2. AI-1 invariant audit

Confirm the synchronized branch still preserves the verified Phase AI-1 behavior:

- `GET /ai/health`
- `POST /ai/chat`
- default provider = disabled
- supported provider values = disabled/local
- local provider is OpenAI-compatible Chat Completions only
- exactly one callable AI tool: `reading_search`
- tool delegates to existing `search_reading_records(...)`
- no raw SQL/database driver access inside the AI package
- no arbitrary filesystem access
- no subprocess / shell / Docker / GitHub execution
- no cloud OpenAI fallback
- no write-capable AI tools
- no child-selectable `child_profile_id`
- parent_note excluded from child AI search/result
- hard AI result cap = 10
- provider rounds max = 3
- total tool calls max = 5
- provider max generation = 800 tokens
- final answer max = 8,000 characters
- provider response body cap = 2 MB

Do not rewrite or refactor verified AI behavior.

## 3. Reading Journal invariant audit

Confirm the synchronized branch preserves:

- `/reading`
- reading CRUD API routes
- reading health route
- PostgreSQL metadata storage
- filesystem cover storage
- search/date/mode/rating filters
- pagination and deterministic ordering
- global summary behavior
- human Reading Journal search still searches parent_note

No SQLite fallback for reading metadata may be introduced.

## 4. Port safety invariant

Confirm active runtime/config files contain no exact standalone host-port 8080
reference using a numeric-boundary check equivalent to:

`(?<!\d)8080(?!\d)`

Required contract:

- DB/Hanja = 18080
- EDUNI external host = 8081
- EDUNI internal/container = 18081
- PostgreSQL = internal-only 5432
- no `Stop-PortOwner 8080`

Do NOT probe, connect to, bind, stop, or kill host 8080.

Do NOT start or contact production host 8081.

Static inspection is sufficient for this gate.

## 5. Required post-sync regression

Run from the REAL synchronized branch in an isolated worktree/process context if
needed, without modifying product code.

From repository root:

~~~powershell
cd nice-gui-1-1-7
python -m unittest tests.test_ai
python -m unittest tests.test_port_configuration
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests
python -m compileall -q portal_app tests
cd ..
git diff --check
~~~

Record exact totals.

Expected focused baselines from prior verification:

- AI: 25 tests
- port configuration: 4 tests
- Reading Journal: 16 tests
- routes: 7 tests

Verify 48 synthetic merged tree baseline:

- full suite: 204 tests, 1 skipped

The PostgreSQL integration test may remain skipped if
`EDUNI_ALLOW_POSTGRES_TESTS=1` is intentionally not set to avoid touching a
database. Record the reason exactly.

Any new failure/error or unexplained disappearing test = FAIL.

## 6. Optional deterministic AI route sanity

Only if needed because a static/test discrepancy appears.

Do not use production Docker.
Do not use host 8080.
Do not use production 8081.

If needed, use isolated high loopback ports and temporary data only.

The previously verified semantic distinction remains:

- unavailable/reset -> HTTP 503 `ai_unavailable`
- delayed timeout -> HTTP 504 `ai_timeout`

Do not contact a real external AI provider.

This section is optional if the focused AI suite remains unchanged and PASS.

## 7. Diff review against base

Review the final AI branch diff against `feature/eduni-space-mvp`.

Confirm the PR scope contains only the intended AI-1 feature plus its plan,
prompts, tests, and verification reports.

The PR must NOT introduce:

- AI-2 model/container work
- `eduni-llm` service
- STT/TTS/voice
- cloud provider
- AI write tools
- child-triggered Codex
- arbitrary shell/subprocess
- port 8080 usage
- PostgreSQL host publication
- deployment changes unrelated to AI-1

Base-side Reading Journal and port changes should no longer appear as unique AI
feature changes because the AI branch has already synchronized the base.

## 8. Report

Create:

`EDUNI_AI_FOUNDATION_POST_SYNC_VERIFY_REPORT_49.md`

Include:

- exact AI HEAD verified
- exact base HEAD
- merge base / ahead / behind
- AI invariant result
- Reading Journal invariant result
- port invariant result
- exact focused test totals
- full-suite total / skips
- content validation
- compileall
- diff-check
- confirmation that host 8080 and production 8081 were untouched
- confirmation that no product code was changed during Verify 49
- cleanup result

Commit/push only the report after verification.

## 9. Final verdict

Use exactly one:

`AI POST-SYNC VERIFY PASS — READY FOR PR`

`AI POST-SYNC VERIFY FAIL`

`BLOCKED`

## 10. PR action after PASS

Only if verdict is:

`AI POST-SYNC VERIFY PASS — READY FOR PR`

create a normal non-draft PR:

- head: `feature/eduni-ai-foundation`
- base: `feature/eduni-space-mvp`

PR title:

`Add EDUNI AI foundation Phase AI-1`

PR body must summarize:

- provider-neutral AI gateway
- disabled/local provider support
- child-safe bounded tool loop
- read-only `reading_search`
- privacy boundary
- Verify 46 / 46B / 48 / 49 results
- no AI-2 / voice / cloud fallback / write tools
- no deployment

Do not merge the AI PR.
Do not deploy.

Stop after the report and PR are pushed/created.
