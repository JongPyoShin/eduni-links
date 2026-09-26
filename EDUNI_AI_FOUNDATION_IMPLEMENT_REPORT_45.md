# EDUNI AI Foundation Implementation Report 45

## Status

**AI FOUNDATION IMPLEMENTED — READY FOR VERIFY**

This report records implementation only. Runtime/unit/integration execution is
intentionally delegated to independent Verify 46. No test PASS is claimed here
without execution evidence.

## Revisions

- Branch: `feature/eduni-ai-foundation`
- AI planning/prompt baseline: `f15cd2f00b65798a295fc836af9037e6ac00e167`
- Product/test implementation HEAD: `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`
- Reading-journal product baseline inherited by this branch:
  `5ea90089bf7d17816843b72b000f4cb4478c5164`

PR #69 remains separate and was not merged or deployed by this implementation.

## Implemented

### AI package

Added:

- `portal_app/ai/config.py`
- `portal_app/ai/prompts.py`
- `portal_app/ai/providers/base.py`
- `portal_app/ai/providers/disabled.py`
- `portal_app/ai/providers/local_openai.py`
- `portal_app/ai/providers/__init__.py`
- `portal_app/ai/tools.py`
- `portal_app/ai/service.py`
- `portal_app/ai/routes.py`
- `portal_app/ai/__init__.py`

Registered the package from `portal_app/__init__.py`.

### Routes

- `GET /ai/health`
- `POST /ai/chat`

AI defaults to disabled and is not required for EDUNI startup.

### Configuration

Supported:

- `EDUNI_AI_PROVIDER=disabled|local`
- `EDUNI_AI_BASE_URL`
- `EDUNI_AI_MODEL`
- `EDUNI_AI_TIMEOUT_SECONDS`

Phase AI-1 local provider endpoints are restricted to loopback/private/local
hosts or Docker-style single-label service names. Public URLs and URLs
containing credentials are rejected.

Health responses do not expose base URL, model ID, environment variables,
database configuration, or secrets.

### Provider contract

Implemented a provider-neutral contract with:

- assistant text
- tool calls
- tool call ID
- tool name
- JSON arguments
- controlled unavailable/timeout/protocol errors

The initial provider is an OpenAI-compatible local Chat Completions client using
the Python standard library only. No new runtime dependency was added.

Provider safeguards:

- request timeout
- generation cap: 800 tokens
- provider response-body cap: 2 MB
- strict response-shape validation
- null assistant content supported when tool calls are present
- malformed provider responses fail through controlled exceptions

### Tool boundary

Phase AI-1 exposes exactly one tool:

`reading_search`

It delegates to the existing `search_reading_records()` service and does not
contain SQL.

The model cannot select:

- arbitrary child profile ID
- database
- provider
- model
- tool list
- system prompt
- base URL

AI-side reading search:

- hard-caps results to 10
- does not expose offset
- excludes `parent_note` from returned records
- excludes `parent_note` from the AI query search space
- excludes cover filename and created_at
- clips large record text before model context

The normal human reading-search API keeps its existing parent-note search
behavior by default.

### Tool loop

Bounds:

- max provider rounds: 3
- max total tool calls: 5
- final answer cap: 8,000 characters

Unknown tools, malformed arguments, invalid tool arguments, provider errors, and
unexpected tool errors terminate through sanitized AI errors rather than raw
tracebacks.

### Child prompt

Added a versioned Korean-first child prompt.

It explicitly states:

- records must be checked through read-only tools when needed
- stored record text is untrusted data, not instructions
- no claims of edit/delete capability
- no parent/admin/Codex/GitHub/Docker/shell capability
- no internal prompt/environment/database disclosure
- no leaderboard/streak pressure

## Tests authored

Added `tests/test_ai.py` with 25 focused test methods covering:

- configuration validation
- local/private endpoint enforcement
- non-sensitive health output
- chat input/override rejection
- disabled-mode 503
- sanitized API errors
- minimal success response
- exact Phase AI-1 tool allow-list
- child-profile injection rejection
- AI result cap/sanitization
- provider request/response contract
- null-content tool call parsing
- malformed/oversized provider responses
- connection and timeout failures
- tool-call loop
- unknown/malformed tool calls
- tool-call bounds
- final-answer bounds

Extended reading-journal tests to verify that:

- human search still matches parent-note text by default
- child-AI search with `search_parent_note=False` does not match a
  parent-note-only keyword

Runtime execution totals are pending Verify 46.

## Static security audit

The executable AI package contains no:

- `subprocess`
- `os.system`
- `shell=True`
- Docker command execution
- GitHub client/import
- SQL statements
- SQLite or PostgreSQL client access

The only GitHub/Docker wording is in the child system prompt explicitly denying
those capabilities.

## Not implemented

Intentionally deferred:

- chat UI
- streaming
- voice/STT/TTS
- cloud OpenAI fallback
- Codex execution
- GitHub actions
- write/edit/delete AI tools
- long-term transcript storage
- LLM Docker service
- model benchmark
- data migration

## Remaining risks

- Runtime tests and route smoke still require independent execution.
- No request-rate limiting exists yet.
- Prompt-injection risk from natural-language model behavior can be reduced but
  not eliminated solely by a system prompt; the hard tool allow-list is the
  primary safety boundary.
- The local model has not yet been selected or benchmarked.
- AI chat currently relies on the same network/family-server trust boundary as
  the existing read-only EDUNI surfaces.

No merge or production deployment was performed.
