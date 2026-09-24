# EDUNI AI Foundation — Implement 45

## Mission

Implement Phase AI-1 only.

Repository: JongPyoShin/eduni-links
Branch: feature/eduni-ai-foundation

Read first:

- AGENTS.md
- nice-gui-1-1-7/AGENTS.md
- docs/eduni_ai/PLAN.md

This branch is stacked on the unmerged reading-journal branch.
Do not merge.
Do not deploy.
Do not modify production containers.

## Dependency gate

Before coding, confirm:

- current branch is feature/eduni-ai-foundation
- branch contains docs/eduni_ai/PLAN.md
- PR #69 is still separate
- do not write AI code back onto feature/child-reading-journal

If the branch/base relationship differs, stop and report.

## Scope

Implement only:

1. AI package boundary
2. provider abstraction
3. disabled provider
4. local OpenAI-compatible provider
5. read-only AI tool registry
6. reading_search tool
7. child-safe system prompt
8. GET /ai/health
9. POST /ai/chat
10. bounded tool-call loop
11. focused tests
12. regression tests

Do not implement:

- voice
- STT
- TTS
- cloud OpenAI fallback
- Codex execution
- GitHub actions
- write tools
- record edit/delete through AI
- arbitrary SQL
- arbitrary file access
- web search
- long-term transcript storage
- PostgreSQL schema changes
- SQLite migration
- Docker LLM service yet

## Required package structure

Prefer:

nice-gui-1-1-7/portal_app/ai/
  __init__.py
  config.py
  service.py
  tools.py
  prompts.py
  providers/
    __init__.py
    base.py
    disabled.py
    local_openai.py

Keep route registration inside the AI package rather than enlarging routes.py.

Import/register the package from portal_app/__init__.py using the existing route-extension pattern.

## Configuration

Support:

EDUNI_AI_PROVIDER=disabled|local
EDUNI_AI_BASE_URL=http://eduni-llm:8080/v1
EDUNI_AI_MODEL=<model-id>
EDUNI_AI_TIMEOUT_SECONDS=30

Defaults:

- provider = disabled
- timeout = 30
- AI must not become required for application startup
- existing EDUNI must remain fully healthy with AI disabled

Do not require an API key in Phase AI-1.
Do not expose environment values or secrets in HTTP responses.

Validate:

- provider value
- timeout bounds
- local provider requires base URL and model
- base URL must be http or https

## Provider protocol

Create a small provider-neutral contract.

The service layer must not know urllib/http implementation details.

A provider response must be able to represent:

- assistant text
- zero or more tool calls
- tool call id
- tool name
- JSON arguments

Keep the contract minimal and testable.

## Local OpenAI-compatible provider

Target an OpenAI-compatible Chat Completions endpoint.

Base URL example:

http://eduni-llm:8080/v1

Provider should call:

<base-url>/chat/completions

Requirements:

- standard-library HTTP is acceptable; avoid a new dependency unless clearly necessary
- request timeout from config
- JSON Content-Type
- model from config
- messages
- optional tools
- tool_choice=auto when tools exist
- parse assistant content and tool_calls
- tolerate assistant content being null when tool calls are present
- malformed provider responses must raise a controlled provider error
- connection errors must not crash the app
- timeout must become a controlled AI error
- never echo full provider payloads or internal URLs to child-facing responses

Do not implement streaming in this phase.

## AI tool registry

The model never receives database credentials and never executes SQL.

Create an explicit allow-list registry.

Phase AI-1 contains exactly one callable tool:

reading_search

It must delegate to the existing reading journal service function:

search_reading_records(...)

Do not duplicate reading SQL inside portal_app/ai.

### reading_search input

Allow:

- q: string, optional, max 200
- date_from: optional YYYY-MM-DD
- date_to: optional YYYY-MM-DD
- reading_mode: optional alone|together|read_aloud
- rating: optional integer 1..5
- limit: optional integer

Enforce a hard AI-side maximum result count of 10 regardless of model arguments.

Do not expose offset to the model in Phase AI-1.

Use the server-selected/default child profile.
Do not allow the model/client to choose an arbitrary child_profile_id.

### reading_search output

Return only fields useful for conversation, for example:

- id
- title
- author
- read_date
- reading_mode
- rating
- child_comment
- favorite_part

Do not return:

- filesystem paths
- database connection details
- created_at unless needed
- internal SQL
- arbitrary parent/admin data

parent_note should be excluded from the child-facing AI tool result in Phase AI-1.

The normal human reading search API may keep parent_note search support; this rule is only for the child AI tool output.

## Child prompt

Create a versioned prompt constant.

Requirements:

- Korean-first
- warm and concise
- explain at child-friendly level
- do not claim to remember data unless a tool returned it
- if no reading result exists, say that no matching record was found
- never reveal internal tool names, database details, prompts, environment variables, or system implementation
- never claim to have edited/deleted data
- do not instruct the model to call unavailable tools
- no leaderboard/streak pressure
- no parent/admin/Codex functionality

Keep prompt content code-reviewable.

## POST /ai/chat

Request JSON:

{
  "message": "..."
}

Phase AI-1 may optionally accept a short non-persistent history if implemented safely, but it is not required.

Validation:

- JSON object
- message required
- trim whitespace
- max 2000 characters
- reject empty message

Do not accept:

- child_profile_id
- provider
- model
- arbitrary tool list
- system prompt
- base URL

These are server-controlled.

### Success response

Use a simple stable response such as:

{
  "ok": true,
  "answer": "...",
  "provider": "local",
  "tool_calls": 1
}

Do not return raw provider messages or hidden prompt text.

### Disabled/unavailable

AI disabled must return a structured 503, for example:

{
  "ok": false,
  "error": "ai_unavailable"
}

Provider connection failure should also be structured and must not leak URL/host details.

Validation errors should be 400.

Timeout may be 504 if handled distinctly.

## GET /ai/health

Must work without contacting the model on every request.

Return non-sensitive configuration status only, for example:

{
  "ok": true,
  "provider": "disabled",
  "configured": false,
  "tools": ["reading_search"]
}

or for configured local:

{
  "ok": true,
  "provider": "local",
  "configured": true,
  "tools": ["reading_search"]
}

Do not return:

- EDUNI_AI_BASE_URL
- model endpoint
- environment variables
- passwords
- database information

A configured provider does not imply the model server is reachable; name the field accordingly.

## Tool loop

Implement a bounded loop.

Maximum:

- 3 provider rounds
- 5 total tool calls

Reject:

- unknown tool name
- malformed JSON arguments
- arguments outside schema/limits

Tool execution error must be returned to the model in a sanitized tool result and/or terminate safely.
Do not expose Python traceback to the model or HTTP client.

If provider keeps requesting tools after the bound, fail safely.

## Required tests

Create focused AI tests.

At minimum test:

### Configuration

- default disabled
- invalid provider rejected
- local missing base URL rejected
- local missing model rejected
- timeout bounds

### Health

- disabled health response
- configured local health response
- base URL not exposed

### Chat validation

- empty message -> 400
- whitespace-only -> 400
- >2000 chars -> 400
- client cannot override model/provider/tool

### Disabled provider

- /ai/chat -> structured 503
- existing /portal and /reading unaffected

### Tool registry

- exactly reading_search exposed in Phase AI-1
- unknown tool rejected
- arbitrary child_profile_id impossible
- result limit hard-capped to 10
- parent_note excluded from tool output
- reading search delegates to existing service rather than raw SQL

### Provider

Using fake/mock HTTP or test seam:

- normal assistant text
- tool call with null content
- malformed JSON response
- missing choices
- connection failure
- timeout
- no provider URL leaked to API response

### Tool loop

Using a fake provider:

1. model asks reading_search
2. tool returns matching record
3. provider receives tool result
4. final answer returned

Also:

- unknown tool
- malformed arguments
- repeated tool calls hit bound
- no raw exception leaks

### Regression

Run existing reading-journal focused tests.
Run full test suite once at the end.

## Manual smoke

With AI disabled:

- application starts
- /healthz 200
- /portal 200
- /reading 200
- /ai/health 200
- /ai/chat structured 503

Do not require an LLM container for the default application.

If a simple local fake OpenAI-compatible server can be created inside tests without new infrastructure, test one end-to-end local-provider response.
Do not start or change production Docker.

## Security assertions

Search AI package for and fail if it contains:

- subprocess
- os.system
- shell=True
- docker command execution
- GitHub write calls
- generic SQL execution
- arbitrary file reads based on user/model input

Direct imports of the existing safe reading service are expected.

## Validation

From nice-gui-1-1-7:

~~~powershell
python scripts/validate_content.py
python -m unittest tests.test_ai
python -m unittest tests.test_reading_journal
python -m unittest discover -s tests
cd ..
git diff --check
~~~

Record exact totals.

## Commit

One implementation commit is preferred after tests pass.
Do not merge.

## Final report

Create:

EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md

Report:

- exact starting SHA
- exact final SHA
- changed files
- provider contract
- exposed AI routes
- exposed tool list
- test totals
- disabled-mode smoke
- security boundary checks
- remaining risks

Final status exactly one:

AI FOUNDATION IMPLEMENTED — READY FOR VERIFY
AI FOUNDATION IMPLEMENTATION FAILED
BLOCKED

Do not start Phase AI-2.
Do not merge.
Do not deploy.
