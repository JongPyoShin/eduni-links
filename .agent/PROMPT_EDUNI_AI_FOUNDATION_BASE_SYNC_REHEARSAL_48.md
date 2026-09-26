# EDUNI AI Foundation — Base Sync Rehearsal / Verify 48

## Mission

Prepare and independently verify the next integration step for Phase AI-1 after the
verified EDUNI port migration was merged into the base.

Repository: JongPyoShin/eduni-links
Working branch: feature/eduni-ai-foundation
Target base: feature/eduni-space-mvp

Current expected refs at instruction creation:

- feature/eduni-space-mvp:
  `0bcec5d14fb7b9e7827cb9fa9ea3bc9a060a9c2e`
- feature/eduni-ai-foundation:
  `9379dd78454de50dc5289124d0b92b48917f6ca3`
- AI verified product/test baseline:
  `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`
- current merge base:
  `5ea90089bf7d17816843b72b000f4cb4478c5164`

At instruction creation the AI branch compares to the updated base as:

- ahead: 32
- behind: 20
- status: diverged

Always query the remote refs again before acting. If either expected branch moved,
record the new SHA and continue only if the changed commits are understood.

This is a synchronization REHEARSAL and verification gate.

Do not perform the real merge into `feature/eduni-ai-foundation`.
Do not create the AI PR.
Do not merge any PR.
Do not deploy.
Do not start AI-2.

The earlier approval to merge the port-migration branch does NOT authorize an AI
branch synchronization merge.

## Read first

Read:

- AGENTS.md
- nice-gui-1-1-7/AGENTS.md
- docs/handovers/EDUNI_HANDOFF_2026-09-24.md
- docs/eduni_ai/PLAN.md
- EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md
- EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md
- EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_REPORT_46B.md
- EDUNI_PORT_8080_VERIFY_REPORT_47.md

Also inspect the current Git relationship between:

- feature/eduni-space-mvp
- feature/eduni-ai-foundation

## Non-negotiable safety

### Git

- Do not rewrite the verified AI history.
- Do not rebase the remote AI branch.
- Do not force-push.
- Do not update `feature/eduni-ai-foundation` with the base yet.
- Do not create a PR.
- Do not merge.
- Do not deploy.
- Do not delete remote branches.

Only the Verify 48 prompt/report may be committed as documentation.

### Runtime / ports

Host port 8080 belongs to another project.

Never:

- connect to host 8080
- bind host 8080
- stop host 8080
- kill its process
- run any script that can call `Stop-PortOwner 8080`

Do not touch production host port 8081 either.

Do not run:

- production `start_eduni_services.ps1`
- production Compose `up`
- production `eduni-game`
- production PostgreSQL resources
- Nextcloud
- codex-uv-lock-pg
- flopi-pr87-pg-20260911

No network/runtime smoke is required for Verify 48.

## 1. Git gate

Fetch/prune safely, then record exact remote SHAs.

Confirm:

- `feature/eduni-space-mvp` contains the port-migration merge
  `0bcec5d14fb7b9e7827cb9fa9ea3bc9a060a9c2e` or a known descendant.
- `feature/eduni-ai-foundation` contains the verified AI reports and product/test
  baseline `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`.
- all AI commits after the product/test baseline remain documentation/report-only,
  unless a later explicitly verified product commit exists and is documented.
- no AI PR has already been merged.
- no production deployment occurred from this work.

Record:

- base HEAD
- AI branch HEAD
- merge base
- ahead/behind counts
- changed files on each side since the merge base.

If the branch relationship is materially different from the handoff and cannot be
explained, verdict = BLOCKED.

## 2. Disposable sync rehearsal only

Create a disposable LOCAL worktree and disposable LOCAL branch from the exact
current remote AI HEAD.

Do not push the disposable branch.

In that disposable worktree only, rehearse integration of the exact current
`origin/feature/eduni-space-mvp` into the AI branch state.

Preferred:

`git merge --no-commit --no-ff origin/feature/eduni-space-mvp`

This local merge state is verification-only and must never be committed/pushed.

If Git reports conflicts:

1. Record every conflicted file before editing.
2. Resolve conflicts only in the disposable worktree.
3. Preserve the already verified AI-1 behavior.
4. Preserve the already verified Reading Journal behavior.
5. Preserve the Verify 47 port contract.
6. Do not add new features.
7. Do not opportunistically refactor.
8. Do not modify generated/runtime artifacts unless the merge truly requires it.

For any conflict, explain which side supplied which behavior and why the rehearsal
resolution is the minimum safe resolution.

If there are no conflicts, record that explicitly.

## 3. Required post-sync product invariants

On the fully resolved disposable merge state, confirm all of the following.

### AI-1

Keep the verified Phase AI-1 contract unchanged:

- `GET /ai/health`
- `POST /ai/chat`
- default provider = disabled
- local OpenAI-compatible provider only
- exactly one callable AI tool: `reading_search`
- AI tool delegates to existing `search_reading_records(...)`
- no raw SQL inside the AI package
- no cloud OpenAI provider
- no arbitrary filesystem/shell/Docker/GitHub execution
- no AI write tools
- parent_note excluded from child-facing AI search/result
- child_profile_id not model/client selectable
- max AI reading results = 10
- max provider rounds = 3
- max total tool calls = 5
- provider max generation = 800 tokens
- final answer cap = 8,000 characters
- provider response body cap = 2 MB

Do not rewrite verified AI behavior merely to make integration cleaner.

### Reading Journal

Preserve:

- Reading Journal routes/API
- PostgreSQL metadata storage
- filesystem cover storage
- server-side search/filter/pagination behavior
- global summary behavior
- existing human search behavior, including parent_note search

Do not migrate storage.

### Port contract

Preserve the Verify 47 contract:

- DB/Hanja = 18080
- EDUNI external host = 8081
- EDUNI internal/container = 18081
- PostgreSQL = internal-only 5432
- host 8080 = not used by EDUNI

The active runtime/config set must contain zero exact standalone 8080 references
using a numeric-boundary check equivalent to:

`(?<!\d)8080(?!\d)`

Confirm there is no:

`Stop-PortOwner 8080`

Do not treat `18080` as an 8080 hit.

## 4. Required focused regression

From the disposable resolved merge state:

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

Record exact totals, failures, errors, and skips for every command.

Known pre-sync focused baselines from prior verification include:

- AI: 25 tests
- port configuration: 4 tests
- Reading Journal: 16 tests
- routes: 7 tests

Do not blindly fail only because the full-suite total changed due to legitimate
new tests. Fail on behavioral regression, test failure/error, safety regression,
or unexplained test disappearance.

If any test fails:

- do not fix product code on the real AI branch
- investigate in the disposable worktree
- classify the failure as:
  - merge conflict/resolution issue
  - base regression
  - AI regression
  - port regression
  - environment-only blocker
- report the minimum required follow-up

## 5. Static diff review after rehearsal

Review the synthetic post-sync diff carefully.

Confirm the rehearsal does NOT introduce:

- AI-2 model/service work
- eduni-llm container
- STT/TTS/voice
- cloud AI provider
- write-capable AI tools
- child-triggered Codex
- arbitrary shell/subprocess execution
- raw database access inside AI
- host port 8080 use
- PostgreSQL host publication
- production deployment changes

Also confirm the port migration does not accidentally replace or remove the
verified AI package/routes/tests.

## 6. No runtime port probing

Verify 48 must not contact host 8080 at all.

Do not use an 8080 before/after listener probe in this gate.
Verify 47 already completed that runtime safety proof.

Do not start production 8081.

If an isolated runtime check becomes unexpectedly necessary to diagnose a test,
use only an unused loopback high port and isolated temp data, and document why.
Prefer not to run runtime smoke at all.

## 7. Cleanup

After testing:

- abort/reset the local merge rehearsal
- remove the disposable worktree
- delete only the disposable local verification branch
- remove only temporary files/resources created by Verify 48

Do not remove or alter:

- remote branches
- production containers
- shared Docker resources
- host 8080 process
- production data

Verify the real `feature/eduni-ai-foundation` remote product state remains
unchanged except documentation commits for this prompt/report.

## 8. Report

Create:

`EDUNI_AI_FOUNDATION_BASE_SYNC_REHEARSAL_REPORT_48.md`

The report must include:

- exact base HEAD
- exact AI HEAD used for rehearsal
- merge base and ahead/behind counts
- complete conflict list
- exact rehearsal resolutions, if any
- AI-1 invariant result
- Reading Journal invariant result
- Verify 47 port-contract result
- exact focused-test totals
- full-suite result
- compileall result
- content validation result
- `git diff --check` result
- confirmation that host 8080 and production 8081 were not contacted/bound/stopped
- cleanup result
- confirmation that no real sync merge, PR, merge, or deploy occurred

Commit/push only this report to `feature/eduni-ai-foundation` after verification.

Do not commit the rehearsal merge or any rehearsal conflict resolution.

## 9. Final verdict

Use exactly one:

`AI BASE SYNC REHEARSAL PASS — READY FOR SYNC APPROVAL`

`AI BASE SYNC REHEARSAL FAIL`

`BLOCKED`

PASS means only that the synchronization has been rehearsed and regression-tested.

PASS does NOT authorize:

- updating the real AI branch with the base
- creating the AI PR
- merging the AI PR
- deployment

Stop after the report is committed/pushed.
