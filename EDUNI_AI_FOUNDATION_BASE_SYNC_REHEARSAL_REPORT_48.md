# EDUNI AI Foundation Base Sync Rehearsal — Verify 48

## Verdict

**AI BASE SYNC REHEARSAL PASS — READY FOR SYNC APPROVAL**

This verdict covers only the disposable base-sync rehearsal and its local regression checks. It is **not** approval to sync the real AI branch, create a PR, merge, or deploy.

## Scope and exact refs

- AI branch under review: `feature/eduni-ai-foundation`
- AI ref at rehearsal start: `ac3acea66583d793e76bd70b22dc0fa595e83e96`
- Target base ref: `feature/eduni-space-mvp` at `0bcec5d14fb7b9e7827cb9fa9ea3bc9a060a9c2e`
- Merge base: `5ea90089bf7d17816843b72b000f4cb4478c5164`
- Relationship at those refs: AI ahead 33 / behind 20 relative to base
- AI implementation baseline: `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`
- AI implementation baseline is an ancestor of the reviewed AI ref. Changes after that baseline on the AI side are prompts, plans, and verification reports; no later AI product-code edits were found.

The target base contains the port-8080 change set. No real branch synchronization was performed. A disposable worktree was created at the AI ref, and `git merge --no-commit --no-ff origin/feature/eduni-space-mvp` was used for rehearsal only.

## Merge and conflict analysis

- Rehearsal result: automatic merge succeeded with **no conflicts**.
- Conflict resolutions required: none.
- Synthetic merge result: 15 base-side paths staged; 1,412 insertions and 20 deletions.
- No conflict markers were found.
- The AI package, Reading Journal implementation, and their tests were not changed by the base-side merge (`git diff --cached --name-only` over those paths returned no paths).
- The temporary merge was aborted. The disposable worktree returned to the exact starting SHA `ac3acea66583d793e76bd70b22dc0fa595e83e96`, was clean, and was removed. Its local verification branch was deleted. No rehearsal merge commit was created or pushed.

Changed paths on the AI side since the merge base:

```text
.agent/PROMPT_EDUNI_AI_FOUNDATION_BASE_SYNC_REHEARSAL_48.md
.agent/PROMPT_EDUNI_AI_FOUNDATION_IMPLEMENT_45.md
.agent/PROMPT_EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_46B.md
.agent/PROMPT_EDUNI_AI_FOUNDATION_VERIFY_46.md
EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md
EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_REPORT_46B.md
EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md
docs/eduni_ai/PLAN.md
nice-gui-1-1-7/portal_app/__init__.py
nice-gui-1-1-7/portal_app/ai/__init__.py
nice-gui-1-1-7/portal_app/ai/config.py
nice-gui-1-1-7/portal_app/ai/prompts.py
nice-gui-1-1-7/portal_app/ai/providers/__init__.py
nice-gui-1-1-7/portal_app/ai/providers/base.py
nice-gui-1-1-7/portal_app/ai/providers/disabled.py
nice-gui-1-1-7/portal_app/ai/providers/local_openai.py
nice-gui-1-1-7/portal_app/ai/routes.py
nice-gui-1-1-7/portal_app/ai/service.py
nice-gui-1-1-7/portal_app/ai/tools.py
nice-gui-1-1-7/portal_app/reading_journal.py
nice-gui-1-1-7/tests/test_ai.py
nice-gui-1-1-7/tests/test_reading_journal.py
```

Changed paths on the base side since the merge base:

```text
.agent/PROMPT_EDUNI_PORT_8080_VERIFY_47.md
.agent/PROMPT_EDUNI_READING_SEARCH_BROWSER_VERIFY_44B.md
EDUNI_PORT_8080_VERIFY_REPORT_47.md
EDUNI_READING_SEARCH_BROWSER_VERIFY_REPORT_44B.md
db/index.html
docker-compose.yml
docs/handovers/EDUNI_HANDOFF_2026-09-24.md
files-mentioned-by-the-user-oracle/app.py
files-mentioned-by-the-user-oracle/start_external_access.ps1
nice-gui-1-1-7/Dockerfile
nice-gui-1-1-7/app.py
nice-gui-1-1-7/scripts/start_eduni_services.ps1
nice-gui-1-1-7/scripts/watch_eduni_services.ps1
nice-gui-1-1-7/tests/test_port_configuration.py
portal/config/links.json
```

## Regression and safety review

### AI and Reading Journal

- AI route declarations remain `GET /ai/health` and `POST /ai/chat`; provider default remains disabled.
- The only registered AI tool remains `reading_search`, delegated to the existing journal search with `search_parent_note=False`; AI result cap remains 10.
- Static review confirmed the existing limits: 3 provider rounds, 5 total tool calls, 800 generated tokens, 8,000 answer characters, and a 2,000,000-byte provider response cap.
- No raw SQL/database driver, subprocess/shell operation, or additional executable AI tool was introduced by the base merge.
- Reading Journal routes, storage, and search behavior were not changed by the rehearsal merge.
- `eduni-llm` appears only in the existing configuration-validation comment/tests; no LLM service/container was added.

### Port and service boundary

- The base-side changes are the expected EDUNI port-configuration change set; the `eduni-game` host port remains 8081, with the app's configured internal port at 18081 and database internal port 5432.
- Compose still defines only `eduni-game` and `eduni-postgres`; PostgreSQL has no host-published port.
- An exact-boundary scan found no active runtime/config reference to host port 8080 in the nine audited files, and the `Stop-PortOwner 8080` audit found no such operation.
- No host port was probed or bound. No process/container was stopped, restarted, or contacted. Production 8081 and host 8080 were untouched.

### Handoff / PR context

- The base-side handoff document is stale relative to these fetched refs: it records an older AI SHA and older port-verification relationship. The newer branch refs and `EDUNI_PORT_8080_VERIFY_REPORT_47.md` supersede that snapshot; the rehearsal did not edit the handoff.
- No PR for `feature/eduni-ai-foundation` was present when checked. No PR was created.

## Tests and checks

Run from the disposable worktree while the synthetic merge was present. All `EDUNI_*` environment variables were removed first, so no configured real database/provider endpoint could be contacted.

| Check | Result |
|---|---|
| `python -m unittest tests.test_ai` | PASS — 25 tests |
| `python -m unittest tests.test_port_configuration` | PASS — 4 tests |
| `python -m unittest tests.test_reading_journal` | PASS — 16 tests |
| `python -m unittest tests.test_routes` | PASS — 7 tests |
| `python scripts/validate_content.py` | PASS — `VALID: 1 enabled activities` |
| `python -m unittest discover -s tests` | PASS — 204 tests, 1 skipped |
| `python -m compileall -q portal_app tests` | PASS |
| `git diff --check` and `git diff --cached --check` | PASS |

The one skipped test is PostgreSQL integration, gated by `EDUNI_ALLOW_POSTGRES_TESTS=1`. That opt-in was not set; no PostgreSQL service was contacted. No Docker build, runtime HTTP smoke, browser test, or production check was performed, as required by the rehearsal scope.

## Remaining risks / next decision

- This establishes that Git can combine the two reviewed refs without a conflict and that the covered local regression suite passes on the synthetic merge state. It does not prove a live provider, database, browser, or deployment behavior.
- The next action requires explicit approval to synchronize the real AI branch. Until then, do not merge the base into `feature/eduni-ai-foundation`, create a PR, merge, or deploy.
