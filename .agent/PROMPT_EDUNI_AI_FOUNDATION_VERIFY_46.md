# EDUNI AI Foundation — Verify 46

## Mission

Independent verification only for Phase AI-1.

Repository: JongPyoShin/eduni-links
Branch: feature/eduni-ai-foundation

Verified product/test implementation baseline:

`1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`

Later commits may be documentation-only, including:

- `EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md`
- this Verify 46 prompt
- the eventual Verify 46 report

Do not modify product code.
Do not fix failures.
Do not merge.
Do not deploy.
Do not touch production containers or port 8081.

## Read first

- AGENTS.md
- nice-gui-1-1-7/AGENTS.md
- docs/eduni_ai/PLAN.md
- EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md

## 1. Git gate

Confirm:

- current branch = feature/eduni-ai-foundation
- `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa` is still the latest commit that changes product/test code
- any later commits are documentation-only
- PR #69 remains separate
- no merge/deploy has occurred from this branch

If product/test code changed after the baseline, stop with BLOCKED.

Record:

- current branch HEAD
- implementation baseline
- relationship to `feature/child-reading-journal`
- changed product/test files

## 2. Static security boundary

Inspect `nice-gui-1-1-7/portal_app/ai/`.

Executable AI code must NOT contain or invoke:

- subprocess
- os.system
- shell=True
- arbitrary filesystem access from model/user input
- Docker CLI/API
- GitHub client/write calls
- raw SQL
- sqlite3/psycopg database access
- arbitrary web search
- cloud OpenAI provider

Do not fail merely because the child system prompt contains words such as
"GitHub" or "Docker" while explicitly denying those capabilities.

Confirm the only Phase AI-1 callable tool is:

`reading_search`

Confirm it delegates to the existing:

`search_reading_records(...)`

Confirm AI code does not duplicate reading SQL.

## 3. Configuration verification

Verify:

- default provider = disabled
- timeout default = 30
- timeout range = 1..120
- only provider values disabled/local accepted
- local requires base URL and model
- URL must be http/https
- URL credentials rejected
- public DNS endpoint rejected
- integer-encoded public host rejected
- loopback accepted
- private IP accepted
- Docker single-label service name such as eduni-llm accepted
- health output never exposes base URL or model

Do not contact any external AI service.

## 4. Automated validation

From repository root:

~~~powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest tests.test_ai
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python -m unittest discover -s tests
python -m compileall -q portal_app tests
cd ..
git diff --check
~~~

Record exact totals and skips.

Any new regression = FAIL.

## 5. AI focused test expectations

The focused AI suite must demonstrate:

### Request boundary

- non-object request -> 400
- empty/whitespace message -> 400
- message over 2000 chars -> 400
- extra keys rejected, including:
  - provider
  - model
  - tools
  - system_prompt
  - base_url
  - child_profile_id

### Disabled mode

- `GET /ai/health` -> 200
- provider = disabled
- configured = false
- tools = ["reading_search"]
- `POST /ai/chat` -> structured 503 `ai_unavailable`

### Local provider

- uses OpenAI-compatible `/chat/completions`
- model comes from server configuration
- max_tokens = 800
- tool_choice = auto when tools are provided
- null assistant content with tool calls is accepted
- malformed JSON/response shape is controlled
- non-list tool_calls is rejected
- oversized response > 2 MB is rejected
- connection failure is controlled
- timeout is controlled

### Tool safety

- exactly one tool: reading_search
- unknown tool rejected
- child_profile_id cannot be supplied by model/client
- limit hard-capped to 10
- offset unavailable to model
- parent_note omitted from tool output
- parent_note excluded from AI query search space
- cover_filename/created_at omitted
- long tool text clipped
- existing human reading search still searches parent_note by default

### Tool loop

- tool request -> tool result -> final assistant answer works
- max provider rounds = 3
- max total tool calls = 5
- malformed tool arguments fail safely
- unknown tool fails safely
- final answer capped at 8,000 chars
- no Python traceback or provider URL leaks to API client

## 6. Isolated disabled-mode route smoke

Use an isolated worktree/process only.

Do not use production Docker.

Run the EDUNI app on an unused loopback-only high port.

Ensure AI-related environment is unset or:

`EDUNI_AI_PROVIDER=disabled`

Use isolated EDUNI data paths.

Confirm:

- /healthz = 200
- /portal = 200
- /reading = 200
- /ai/health = 200
- /ai/health shows disabled/configured=false
- POST /ai/chat with {"message":"안녕"} = 503 ai_unavailable
- no existing route is broken

## 7. End-to-end local-provider smoke with fake server

Do NOT download or run a real LLM in Verify 46.

Create a temporary verification-only OpenAI-compatible fake HTTP server bound to
127.0.0.1 on an unused high port.

The fake server is test infrastructure only and must not be committed as product
code.

Start an isolated EDUNI process with:

- EDUNI_AI_PROVIDER=local
- EDUNI_AI_BASE_URL=http://127.0.0.1:<fake-port>/v1
- EDUNI_AI_MODEL=fake-local-model
- EDUNI_AI_TIMEOUT_SECONDS=<reasonable test value>
- isolated EDUNI database/data paths
- no production PostgreSQL/Docker dependency unless absolutely required

Seed isolated reading data using existing EDUNI APIs/services, including:

1. a child-visible record whose title or child-facing text contains "고양이"
2. a different record where a unique keyword exists ONLY in parent_note

Do not use production data.

### Fake-provider round 1

On the first chat-completions request, return a tool call:

- id: verify-reading-1
- name: reading_search
- arguments: {"q":"고양이","limit":50}

The fake server should capture the incoming request.

Verify the incoming request:

- model = fake-local-model
- max_tokens = 800
- tools contains exactly reading_search
- tool_choice = auto
- no client-supplied provider/model/system override appears

### Fake-provider round 2

The second request must contain a tool message.

Inspect the tool message JSON and confirm:

- result count was capped to at most 10
- expected child-visible reading record is present
- parent_note absent
- cover_filename absent
- created_at absent
- no DB/file path present

Then return final assistant text:

`응. 고양이가 나오는 독서기록을 찾았어.`

Verify EDUNI `POST /ai/chat` returns:

- HTTP 200
- ok=true
- exact/fitting final answer
- provider=local
- tool_calls=1
- no raw provider payload
- no internal URL/model endpoint

## 8. Parent-note privacy end-to-end

Run a second isolated chat using a fake-provider tool request where q is the
keyword stored ONLY in parent_note.

Verify the tool result:

- total = 0
- records = []

This is a hard privacy gate.

If a parent-note-only keyword causes a child AI result, FAIL.

## 9. Failure-path route smoke

Using isolated processes/fake servers only, verify at least:

### Connection refused

Configure local provider to an unused loopback port.

POST /ai/chat must return:

- 503
- error = ai_unavailable
- no host/port leak in response body

### Timeout

Use a fake loopback server that intentionally delays beyond the configured
timeout.

POST /ai/chat must return:

- 504
- error = ai_timeout
- no traceback
- no host/port leak

### Malformed provider response

Return malformed/invalid response.

POST /ai/chat must return:

- 502
- error = ai_failed
- no raw malformed provider payload
- no traceback

## 10. Existing reading regression

Because AI added an optional `search_parent_note` argument to the existing
reading service, explicitly verify:

- existing `GET /reading/api/records?q=<parent-note keyword>` behavior remains unchanged
- default service search still includes parent_note
- AI tool search excludes parent_note
- normal reading CRUD/search tests remain green

## 11. Security/source audit after tests

Confirm AI package has no executable path to:

- record create/edit/delete
- shell
- Docker
- GitHub
- arbitrary files
- arbitrary SQL
- cloud provider
- arbitrary child profile selection

Confirm no secrets were committed.

Confirm `requirements.txt` has no new dependency added for AI-1.

## 12. Production safety

Do not touch:

- production eduni-game
- port 8081
- production eduni_data
- production/post-existing PostgreSQL resources
- Nextcloud
- codex-uv-lock-pg
- flopi-pr87-pg-20260911

Use only isolated local verification processes/resources.

## 13. Cleanup

Remove temporary:

- fake provider server
- isolated EDUNI process
- temporary DB/data
- verification logs/artifacts that should not be committed

Leave only the verification report commit.

## 14. Report

Create and commit/push:

`EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md`

Report:

- verified implementation baseline SHA
- branch HEAD before report
- changed product/test files
- focused AI test total
- reading test total
- route test total
- full-suite total/skips
- compileall result
- diff-check result
- disabled smoke evidence
- local fake-provider E2E evidence
- captured tool schema/result safety evidence
- parent-note privacy evidence
- failure-path status codes
- security source audit
- existing route compatibility
- production resources untouched
- cleanup result
- remaining risks

Final verdict exactly one:

`AI FOUNDATION VERIFY PASS — READY FOR PR`

`AI FOUNDATION VERIFY FAIL`

`BLOCKED`

If PASS, recommendation exactly:

`CREATE PR AFTER PR #69 MERGE`

Do not create the PR.
Do not merge.
Do not deploy.
