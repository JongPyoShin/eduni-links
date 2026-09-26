# EDUNI AI Platform Plan

## Status

Branch: `feature/eduni-ai-foundation`

This branch is intentionally stacked on:

- PR #69
- branch `feature/child-reading-journal`
- starting SHA `5ea90089bf7d17816843b72b000f4cb4478c5164`

Do not merge this AI branch before PR #69 passes Verify 44 and is merged.

## Goal

Add an AI layer to EDUNI without giving a model direct database, filesystem, Docker,
GitHub, or production control.

The AI layer must support:

1. child-safe text conversation
2. EDUNI data tools such as reading-record search
3. local LLM first
4. optional OpenAI fallback later
5. voice conversation later
6. parent/admin-only Codex jobs later

## Core architecture

```text
Browser / Mobile
      |
      v
eduni-game
FastAPI + NiceGUI
      |
      +-- /ai/chat
      +-- /ai/health
      +-- /ai/tools/*
      |
      v
AI Gateway
      |
      +-- Provider Interface
      |      +-- local OpenAI-compatible endpoint
      |      +-- optional cloud provider later
      |
      +-- Tool Registry
             +-- reading.search
             +-- learning.read
             +-- profile.read
             +-- future parent-only tools

Docker
  eduni-game
  eduni-postgres
  future eduni-llm
  future eduni-stt
  future eduni-tts
```

## Security boundary

### Child role

Allowed:

- ask questions
- read approved learning data
- search own reading records
- receive explanations and activity suggestions

Forbidden:

- delete records
- edit records
- alter settings
- invoke Codex
- run shell commands
- access arbitrary SQL
- access arbitrary files
- access Docker
- access GitHub
- access secrets

### Parent role

Later:

- configure AI mode
- control cloud fallback
- inspect conversation settings
- approve write operations
- configure voice

### Admin role

Later only:

- create Codex jobs
- inspect job results
- approve PR/merge/deploy separately

Codex must never be callable from the child chat surface.

## Data-access rule

The model never receives raw database credentials.

The model may only request allow-listed tools.

Example:

```text
child question
  -> AI Gateway
  -> model asks for reading.search
  -> EDUNI validates arguments
  -> EDUNI calls search_reading_records()
  -> sanitized result returned to model
  -> model answers child
```

The tool layer owns authorization and validation.

## Provider strategy

Phase 1 must not hard-code one model vendor.

Use a provider interface.

Initial provider target:

- OpenAI-compatible local endpoint
- configurable base URL
- configurable model ID
- no host exposure required when later run in Docker

Suggested environment variables:

```text
EDUNI_AI_PROVIDER=disabled|local
EDUNI_AI_BASE_URL=http://eduni-llm:8080/v1
EDUNI_AI_MODEL=<model-id>
EDUNI_AI_TIMEOUT_SECONDS=30
```

Do not commit API keys or secrets.

Cloud provider support is a later phase and must be opt-in.

## Conversation storage

Phase 1 should be conservative.

Default:

- no long-term transcript persistence
- request-local conversation context only
- no audio persistence

Later, if conversation history is added:

- PostgreSQL table
- retention controls
- parent setting
- explicit separation between child chat and admin/Codex history

## Phase plan

### Phase AI-1 — Gateway foundation

Implement:

- `portal_app/ai/` package
- provider protocol/interface
- disabled provider
- local OpenAI-compatible provider
- read-only tool registry
- `reading.search` tool
- child-safe system prompt
- `GET /ai/health`
- `POST /ai/chat`
- bounded tool-call loop
- input/output length limits
- timeout handling
- structured error responses
- tests

Do not add voice yet.
Do not add Codex yet.
Do not add write tools.
Do not move existing SQLite data.

Acceptance:

- app runs with AI disabled
- existing EDUNI routes remain unchanged
- local provider can be configured without code changes
- reading tool uses existing EDUNI service function, not raw SQL
- child chat cannot call non-allow-listed tools
- provider failure does not crash non-AI routes
- no secrets are returned by health endpoints

### Phase AI-2 — Local-model benchmark and Docker service

Parallel-agent friendly.

Benchmark at least:

- one ~2B class model
- one ~4B class model
- one CPU/edge-focused model

Measure:

- startup RAM/VRAM
- first-token latency
- tokens/sec
- Korean answer quality
- tool-call reliability
- idle memory
- Docker restart behavior

Then add:

- `eduni-llm` service
- healthcheck
- persistent model cache if appropriate
- internal-only Docker network access

No external LLM port unless explicitly needed.

### Phase AI-3 — Voice

Parallel-agent friendly.

Add:

- microphone UI
- streaming or chunked STT
- TTS
- interrupt/cancel behavior
- child-friendly short answers
- no audio storage by default

Preferred architecture:

```text
browser
 -> STT
 -> AI Gateway
 -> LLM/tools
 -> TTS
 -> browser
```

Do not couple voice implementation to one LLM provider.

### Phase AI-4 — Learning tools

Add read-only tools:

- latest activity
- recent sessions
- progress summary
- content lookup
- reading summary

Every tool requires:

- schema
- argument validation
- role allow-list
- maximum result size
- test coverage

### Phase AI-5 — Parent AI controls

Add:

- local-only / cloud-allowed mode
- model selection
- conversation-history policy
- voice enable/disable
- child-facing prompt controls
- parent PIN enforcement for settings

### Phase AI-6 — Codex admin worker

Separate from normal chat.

Architecture:

```text
parent/admin request
 -> ai_job row
 -> Codex worker
 -> GitHub feature branch
 -> tests
 -> PR
 -> status/result back to EDUNI
```

Rules:

- admin only
- asynchronous job
- never direct production edits
- never automatic merge
- never automatic deploy
- Git branch and PR required
- explicit human approval remains mandatory

Potential table:

```text
ai_job
  id
  job_type
  requested_by
  prompt
  status
  created_at
  started_at
  finished_at
  branch
  pr_number
  result_summary
  error_summary
```

### Phase AI-7 — Data consolidation

Optional later.

Current boundary is acceptable:

- SQLite: existing portal/profile/learning records
- PostgreSQL: reading records and future AI data

Do not migrate everything merely to enable AI.

Consider migration only after AI tools and schema requirements stabilize.

## Agent strategy

### Now

Use:

1. one implementation agent
2. one independent adversarial verification agent

Do not use parallel implementation agents for AI-1.

Reason:

- provider contract
- tool authorization
- child safety
- error handling
- route design

are tightly coupled and should be implemented consistently.

### Later

Use parallel agents for:

- local-model benchmarks
- STT evaluation
- TTS evaluation
- browser voice UX
- security testing
- load/latency testing

Those tasks have clean boundaries and minimal file overlap.

## Branch / merge strategy

1. PR #69 must finish Verify 44.
2. Merge PR #69 first.
3. Rebase or recreate `feature/eduni-ai-foundation` on the merged base if needed.
4. AI-1 gets its own PR.
5. AI-1 gets independent verification.
6. Merge only after explicit approval.
7. No production deployment without separate approval.

## Non-goals for AI-1

Do not implement:

- voice
- cloud OpenAI fallback
- Codex execution
- arbitrary web search
- model self-modification
- autonomous writes
- autonomous GitHub actions
- autonomous Docker actions
- transcript analytics
- child profiling beyond existing approved EDUNI data

## First implementation target

The first usable flow should be:

```text
child:
"고양이가 나오는 책 읽은 적 있어?"

POST /ai/chat

AI Gateway
 -> reading.search(q="고양이")
 -> existing reading service
 -> model

answer:
"응. 책장에서 고양이가 나오는 기록을 찾았어..."
```

If the local provider is disabled or unavailable, the AI route should fail safely while
all existing portal/game/reading routes remain healthy.
