# EDUNI Project Handoff — 2026-09-24

## Purpose

This document is the authoritative handoff for continuing EDUNI work in a new
ChatGPT/Codex conversation.

Repository:

`JongPyoShin/eduni-links`

Read this file first before making any repository change.

---

## 0. Non-negotiable operating rules

- Do not merge without explicit user approval.
- Do not deploy production without explicit user approval.
- Do not confuse merge with deploy.
- Prefer Git-tracked implementation / verification instructions under `.agent/`.
- Workflow preference:
  1. implementation/instruction
  2. agent result
  3. independent review
  4. next instruction
- Verify exact SHA/state after every agent report.
- Keep verification adversarial and report P0/P1/P2 or exact required verdict.
- Do not touch unrelated dirty files/resources.
- Production `eduni-game` / host 8081 must not be touched during isolated verification.
- Do not remove/reuse:
  - `codex-uv-lock-pg`
  - `flopi-pr87-pg-20260911`
  - Nextcloud/unrelated PostgreSQL resources.

### CRITICAL port safety

Host port **8080 is reserved for another project**.

Until the port-migration branch is merged and deployed:

- DO NOT run the old production EDUNI start script.
- In particular, the pre-migration `start_eduni_services.ps1` can call
  `Stop-PortOwner 8080`.
- Never stop/kill/bind the process using host port 8080.

---

# 1. Current base state

Base branch:

`feature/eduni-space-mvp`

Current base SHA after Reading Journal PR #69 merge:

`40c3955473f7fa693c79e6a71792cd9b21df01f8`

PR #69:

- title: `WIP: Add child reading journal with photo records`
- branch: `feature/child-reading-journal`
- base: `feature/eduni-space-mvp`
- verified head before merge:
  `fc70a6c223869de9e6e6f5df91348acebdb2ea30`
- status: **MERGED**
- merge commit:
  `40c3955473f7fa693c79e6a71792cd9b21df01f8`
- merged only into `feature/eduni-space-mvp`
- no production deployment was performed.

---

# 2. Reading Journal — COMPLETE / MERGED

## Product

Routes:

- `/reading`
- `GET /reading/api/records`
- `POST /reading/api/records`
- `PUT /reading/api/records/{id}`
- `DELETE /reading/api/records/{id}`
- `GET /reading/api/health`

Features:

- mobile-first reading journal
- create/edit/delete
- book-cover photo keep/replace/remove
- stale async image callback protection
- server-side search
- filters:
  - date_from
  - date_to
  - reading_mode
  - rating
- search fields:
  - title
  - author/publisher text
  - child_comment
  - favorite_part
  - parent_note
- pagination:
  - 24 per page
  - offset pagination
  - `더 보기`
  - deterministic order `read_date DESC, id DESC`
- global summary independent of current search filter
- desktop mobile-preview toggle
- actual mobile responsive behavior.

## Storage

Existing portal/game data remains:

`SQLite /data/eduni_portal.sqlite3`

Reading metadata uses dedicated PostgreSQL:

`reading_record`

Cover images remain files:

`/data/reading-journal/covers`

PostgreSQL has no host 5432 publication.

## Verify history

### Verify 43

Historical PG/edit baseline:

- 173 passed, 1 skipped
- PG integration PASS
- CRUD/images/restart persistence PASS
- PostgreSQL-down health 503 / no SQLite fallback
- desktop/mobile baseline PASS.

### Verify 44

Search/API/database verification passed but final result was BLOCKED only because
the browser harness reported top-level viewport 0x0.

### Verify 44B

Report:

`EDUNI_READING_SEARCH_BROWSER_VERIFY_REPORT_44B.md`

Verdict:

`READING SEARCH BROWSER VERIFY PASS — MERGE READY`

Evidence:

- real headed Chrome 153
- desktop top-level 1280x800
- mobile top-level 360x800
- screenshots succeeded
- no uncaught page errors
- no serious console errors
- no mobile horizontal overflow.

This gate is complete and PR #69 was merged.

## Accepted remaining Reading Journal risks

- CRUD during PostgreSQL outage can still return generic 500 rather than
  structured 503.
- edit/delete do not yet require parent PIN.
- concurrent edits are last-writer-wins.
- search is substring matching, not fuzzy/ranked search.

---

# 3. AI Foundation — IMPLEMENTED / VERIFIED / NOT YET PR

Branch:

`feature/eduni-ai-foundation`

Current remote HEAD:

`9379dd78454de50dc5289124d0b92b48917f6ca3`

Verified product/test implementation baseline:

`1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`

All commits after that product/test baseline are documentation / verification
reports only.

Current relationship to base after #69 merge:

- branch is diverged from `feature/eduni-space-mvp`
- ahead: 32
- behind: 4
- merge base:
  `5ea90089bf7d17816843b72b000f4cb4478c5164`

Do NOT create/merge the AI PR until the port migration is merged and the AI
branch is synchronized onto the updated base.

## AI architecture implemented

Routes:

- `GET /ai/health`
- `POST /ai/chat`

Package:

`nice-gui-1-1-7/portal_app/ai/`

Key pieces:

- provider-neutral contract
- disabled provider
- local OpenAI-compatible Chat Completions provider
- child-safe system prompt
- bounded tool loop
- explicit read-only tool allow-list.

### Phase AI-1 tool allow-list

Exactly one tool:

`reading_search`

It delegates to existing:

`search_reading_records(...)`

The AI package contains no raw SQL/database driver access.

### Child/privacy boundary

AI cannot choose:

- child_profile_id
- provider
- model
- arbitrary tools
- system prompt
- base URL.

AI reading search:

- maximum 10 rows
- no model-controlled offset
- parent_note excluded from output
- parent_note excluded from AI search space
- cover_filename excluded
- created_at excluded
- long text clipped before model context.

Normal human Reading Journal search still searches `parent_note` by default.

### AI runtime bounds

- provider rounds: max 3
- total tool calls: max 5
- provider max generation: 800 tokens
- final answer cap: 8,000 characters
- provider response-body cap: 2 MB
- request timeout configurable.

### Provider configuration

Supported:

- `EDUNI_AI_PROVIDER=disabled|local`
- `EDUNI_AI_BASE_URL`
- `EDUNI_AI_MODEL`
- `EDUNI_AI_TIMEOUT_SECONDS`

Default provider:

`disabled`

Phase AI-1 local endpoints are restricted to local/private hosts and
Docker-style internal service names.

No cloud OpenAI provider is implemented in AI-1.

## AI reports/prompts

Plan:

`docs/eduni_ai/PLAN.md`

Implementation instruction:

`.agent/PROMPT_EDUNI_AI_FOUNDATION_IMPLEMENT_45.md`

Implementation report:

`EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md`

Verify 46:

`.agent/PROMPT_EDUNI_AI_FOUNDATION_VERIFY_46.md`

Report:

`EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md`

Verify 46B:

`.agent/PROMPT_EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_46B.md`

Final report:

`EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_REPORT_46B.md`

## AI verification result

### Verify 46

Passed:

- AI focused: 25 tests
- Reading: 16 tests
- Routes: 7 tests
- full suite: 200 tests, 1 skipped
- compileall PASS
- diff-check PASS
- disabled mode runtime PASS
- fake local OpenAI-compatible provider E2E PASS
- reading_search tool flow PASS
- parent_note privacy PASS
- malformed provider -> 502 `ai_failed`
- delayed provider -> 504 `ai_timeout`.

Verify 46 was BLOCKED only because this Windows host timed out rather than
returning immediate connection-refused on an unused loopback port.

### Verify 46B

Current report commit / AI branch HEAD:

`9379dd78454de50dc5289124d0b92b48917f6ca3`

Verdict:

`AI FOUNDATION 46B PASS — READY FOR PR`

Real route evidence:

- deterministic TCP reset fixture
  -> `503 ai_unavailable`
- delayed fixture
  -> `504 ai_timeout`

Also:

- AI focused 25 PASS
- compileall PASS
- diff-check PASS
- no product/test changes during verification
- no production access.

AI-1 should now be considered **verified**.

---

# 4. Port Migration — IMPLEMENTED / VERIFY 47 PENDING

Branch:

`fix/eduni-free-port-8080`

Known current HEAD:

`07c79b721e9ce20c6ad83f6ad402d327556d8e28`

This branch was created from the pre-merge Reading Journal branch and currently
compares to `feature/eduni-space-mvp` as:

- ahead: 11
- behind: 1
- merge base:
  `fc70a6c223869de9e6e6f5df91348acebdb2ea30`

The only missing base commit is the PR #69 merge commit, so this is expected.

## New intended port contract

```text
DB / Hanja server        18080
EDUNI external host       8081
EDUNI container/internal  18081
PostgreSQL                5432 internal only
Host 8080                 NOT USED BY EDUNI
```

## Changes made

- DB/Hanja application: 8080 -> 18080
- DB/Hanja start/watch/tunnel references -> 18080
- static DB/Hanja links -> 18080
- EDUNI app default internal port: 8080 -> 18081
- Dockerfile:
  - PORT=18081
  - EXPOSE 18081
- docker-compose:
  - app PORT=18081
  - mapping remains host `8081` -> container `18081`
  - healthcheck uses 18081
- `Stop-PortOwner 8080` removed/replaced so EDUNI will not kill the other
  project using 8080.
- regression test added:
  `nice-gui-1-1-7/tests/test_port_configuration.py`

Static audit at implementation time found zero exact standalone `8080`
references in active runtime/config files.

Historical docs/log snapshots can still contain 8080 and are not part of the
runtime gate.

## Verify 47 prompt

`.agent/PROMPT_EDUNI_PORT_8080_VERIFY_47.md`

Current status:

**PENDING — user has not yet supplied Verify 47 result in this handoff.**

Verify 47 must confirm:

- no active runtime config uses standalone 8080
- DB/Hanja = 18080
- external EDUNI = 8081
- container EDUNI = 18081
- PostgreSQL remains internal-only 5432
- compose config valid
- host 8080 listener is unchanged before/after
- no `Stop-PortOwner 8080`
- no production start/deploy.

Do not merge this branch until Verify 47 PASS and user explicitly authorizes
merge.

---

# 5. Required next sequence

The intended next steps are:

```text
1. Run Verify 47 on fix/eduni-free-port-8080
        |
        v
2. Review Verify 47 report + exact Git SHA
        |
        v
3. If PASS, ask user for explicit port-branch merge approval
        |
        v
4. Merge port branch into feature/eduni-space-mvp
        |
        v
5. Synchronize feature/eduni-ai-foundation with the updated base
   (#69 merge + port migration)
        |
        v
6. Resolve only real conflicts; do not rewrite verified AI behavior
        |
        v
7. Run focused post-sync regression:
   - test_ai
   - test_port_configuration
   - test_reading_journal
   - test_routes
   - full suite once
   - compileall
   - git diff --check
        |
        v
8. Create AI PR targeting feature/eduni-space-mvp
        |
        v
9. Human review / explicit merge approval
        |
        v
10. Only then consider Phase AI-2:
    actual local LLM benchmark + eduni-llm Docker service
```

Do not start AI-2 before AI-1 integration is clean unless the user explicitly
changes the plan.

---

# 6. AI Phase roadmap

## AI-1 — current

Implemented and verified:

- AI Gateway
- local provider abstraction
- read-only reading_search
- child-safe prompt
- /ai/health
- /ai/chat
- safe error handling.

## AI-2 — next after integration

Local-model benchmark + Docker service.

Benchmark candidates should be re-researched fresh before work because local LLM
availability changes quickly.

Measure:

- Korean quality
- tool-call reliability
- RAM/VRAM
- first-token latency
- tokens/sec
- idle memory
- Docker startup/restart behavior.

Then add internal-only:

`eduni-llm`

Do not publish the LLM service port externally unless explicitly required.

## AI-3

Voice:

```text
browser mic
 -> STT
 -> AI Gateway
 -> LLM/tools
 -> TTS
 -> browser
```

No audio persistence by default.

## AI-4

Additional read-only learning/profile tools.

## AI-5

Parent AI settings / parent PIN controls.

## AI-6

Separate admin-only Codex worker:

```text
parent/admin request
 -> async ai_job
 -> Codex worker
 -> GitHub branch
 -> tests
 -> PR
 -> human approval
```

Never allow child chat to invoke Codex.
Never auto-merge or auto-deploy.

---

# 7. Current data architecture

```text
EDUNI
|
+-- SQLite
|   +-- child_profile
|   +-- existing portal/learning data
|
+-- PostgreSQL
|   +-- reading_record
|
+-- filesystem
    +-- /data/reading-journal/covers
```

Do NOT migrate all SQLite data to PostgreSQL just to enable AI.

AI tool layer may read from both approved service layers.

Longer-term consolidation is optional after tool/schema requirements stabilize.

---

# 8. Current Docker direction

After the port migration is eventually integrated/deployed:

```text
eduni-space-mvp
|
+-- eduni-game
|    external host: 8081
|    internal:      18081
|
+-- eduni-postgres
|    internal:      5432
|
+-- future eduni-llm
+-- future eduni-stt
+-- future eduni-tts
```

Only `eduni-game` should normally be externally reachable.

Host port 8080 belongs to another project.

---

# 9. Production deployment state

As of this handoff:

- Reading Journal code was merged into `feature/eduni-space-mvp`.
- No production deployment was performed from the work in this conversation.
- Port migration is NOT merged/deployed yet.
- AI Foundation is NOT in a PR/merged/deployed yet.

Therefore do not assume the running production container reflects any of the
latest Git changes.

---

# 10. Useful exact SHAs

```text
Reading search product baseline before docs:
5ea90089bf7d17816843b72b000f4cb4478c5164

Reading Verify 44B report commit / PR #69 verified head:
fc70a6c223869de9e6e6f5df91348acebdb2ea30

PR #69 merge commit / current feature/eduni-space-mvp:
40c3955473f7fa693c79e6a71792cd9b21df01f8

AI product/test verified baseline:
1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa

AI Verify 46B report / current AI branch HEAD:
9379dd78454de50dc5289124d0b92b48917f6ca3

Port migration known HEAD before Verify 47:
07c79b721e9ce20c6ad83f6ad402d327556d8e28
```

Never infer a new current SHA from these if additional work happened later.
Always query GitHub first.

---

# 11. New-conversation kickoff

Recommended first message/instruction in the new conversation:

```text
JongPyoShin/eduni-links 저장소의
docs/handovers/EDUNI_HANDOFF_2026-09-24.md
인수인계서를 먼저 읽고 현재 Git 상태를 다시 대조해.

그 다음:
1. fix/eduni-free-port-8080의 Verify 47 결과가 있는지 확인
2. 없으면 Verify 47부터 진행
3. merge/deploy는 내 명시 승인 전에는 하지 말 것
4. host 8080은 다른 프로젝트용이므로 절대 stop/kill/bind 하지 말 것
```

---

End of handoff.
