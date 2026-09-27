# EDUNI AI-2 — Local LLM Runtime Discovery & Selection 55

## Mission

Start EDUNI AI Phase AI-2 by selecting and validating the real local LLM runtime/model
that will back the already-implemented AI-1 OpenAI-compatible provider.

Repository: `JongPyoShin/eduni-links`
Branch: `feature/eduni-ai2-local-llm`

Branch baseline:

`6024366fdc0199b239269bb11609eaa7861bdc3b`

This is a **discovery / feasibility / selection** task.

Do not implement production integration yet.
Do not deploy.
Do not modify production 8081.
Do not touch host 8080.
Do not download large models without explicit approval.
Do not install a new runtime without explicit approval.

## 1. Read first

Read:

- `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `EDUNI_AI_FOUNDATION_IMPLEMENT_REPORT_45.md`
- `EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md`
- `EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_REPORT_46B.md`
- `EDUNI_AI_FOUNDATION_POST_SYNC_VERIFY_REPORT_49.md`
- `nice-gui-1-1-7/portal_app/ai/config.py`
- `nice-gui-1-1-7/portal_app/ai/providers/base.py`
- `nice-gui-1-1-7/portal_app/ai/providers/local_openai.py`
- `nice-gui-1-1-7/portal_app/ai/providers/__init__.py`
- `nice-gui-1-1-7/portal_app/ai/service.py`
- `nice-gui-1-1-7/portal_app/ai/tools.py`
- `nice-gui-1-1-7/portal_app/ai/routes.py`
- `nice-gui-1-1-7/tests/test_ai.py`

## 2. Existing AI-1 contract to preserve

AI-1 already provides:

- `EDUNI_AI_PROVIDER=disabled|local`
- local/private endpoint validation
- `EDUNI_AI_BASE_URL`
- `EDUNI_AI_MODEL`
- OpenAI-compatible `POST <base_url>/chat/completions`
- exactly one allowed tool: `reading_search`
- child-safe system prompt
- tool-call loop
- max provider rounds = 3
- max total tool calls = 5
- max generation tokens = 800
- final answer max = 8,000 chars
- provider response cap = 2 MB
- sanitized 503/504/502 error handling
- no public/cloud fallback
- no client override for model/provider/base URL/tools/system prompt/child profile
- Reading Journal privacy filtering

Do not weaken any of these constraints.

## 3. Local machine capability inventory

Collect a read-only capability inventory of the actual development/production host.

Record:

- OS / Windows version
- CPU model and logical core count
- total system RAM
- GPU vendor/model
- GPU VRAM if queryable
- NVIDIA driver / CUDA capability if applicable
- Docker Desktop availability/version
- WSL availability/version if applicable
- free disk space on likely model-storage drive(s)

Do not expose unrelated personal files or secrets.

Do not install drivers or toolchains.

## 4. Existing local LLM runtime discovery

Check whether any of the following are already installed or available:

- Ollama
- LM Studio
- llama.cpp server
- vLLM
- LocalAI
- another OpenAI-compatible local server

For each detected runtime, record:

- installed/not installed
- version
- currently running/not running
- configured API bind address/port if safely discoverable
- whether it exposes OpenAI-compatible Chat Completions
- whether it supports tool/function calling
- whether it can be reached from Docker containers without publishing a new unsafe port

Do not stop or reconfigure any existing unrelated runtime.

Do not probe host 8080.

Do not probe or alter production 8081.

## 5. Existing local model inventory

If a detected runtime already has models installed, list only safe metadata:

- model identifier/name
- approximate parameter size if known
- quantization if known
- disk size if readily available

Do not open arbitrary user model directories beyond what the runtime itself reports.

Do not download a model during this task.

If no model is installed, record that clearly.

## 6. AI-2 functional requirements

The selected runtime/model must support the AI-1 provider contract well enough for:

### Plain chat
Input:

`안녕`

Expected:

- valid OpenAI-compatible response
- Korean text output
- no malformed response structure

### Child-safe Korean response
Test a simple child-oriented educational question and verify:

- understandable Korean
- age-appropriate tone
- no obvious prompt leakage

Do not perform subjective benchmark scoring beyond factual observations.

### Tool calling — mandatory

The model/runtime must be able to receive an OpenAI-style tools array and, when
appropriate, produce a structured tool call compatible with AI-1:

- tool name: `reading_search`
- function arguments: JSON object/string acceptable to the existing parser
- stable tool-call id
- follow-up assistant answer after tool result is returned

This is the most important compatibility gate.

A runtime/model that cannot reliably perform the existing tool-call contract is not
ready for EDUNI AI-2 even if plain chat works.

## 7. Live local test rules

Live runtime tests are permitted only if:

- the runtime is already installed
- the model is already installed
- starting it does not disturb production or unrelated workloads
- no new download/install is required
- test endpoint uses a safe unused local/private port
- host 8080 is untouched
- production 8081 is untouched

If those conditions are met, test the runtime directly using its OpenAI-compatible
endpoint.

Do not modify EDUNI production configuration.

Do not set production `EDUNI_AI_PROVIDER=local` yet.

Do not persist test secrets.

If a runtime/model is not already available, skip live inference and continue with
capability analysis.

## 8. Docker reachability design

Determine the safest intended topology for the future EDUNI production integration.

Evaluate:

### Host-native runtime
EDUNI Docker container -> `host.docker.internal:<port>`

Pros/constraints to record:

- model uses host GPU directly
- Windows runtime management
- Docker-to-host reachability
- whether the existing AI config accepts the endpoint
- firewall/bind implications

### Compose-managed LLM service
EDUNI Docker network -> `eduni-llm:<internal-port>`

Pros/constraints to record:

- container GPU access
- model volume management
- image size/runtime image
- restart policy
- memory/VRAM limits
- no host port required unless explicitly needed

Do not implement either topology yet.

Recommend one topology based on actual machine/runtime evidence.

## 9. Model selection criteria

For candidate local models, use factual selection criteria:

- fits actual available RAM/VRAM
- Korean capability
- OpenAI-compatible runtime support
- tool/function-calling support
- latency acceptable for a child-facing UI
- license permits intended local use
- model/runtime can operate fully locally
- no mandatory cloud dependency

Do not select a model solely from parameter count.

If more than one plausible option exists, identify:

- primary candidate
- fallback candidate

Do not rank a model you cannot reasonably support with actual runtime/model evidence.

## 10. No-cloud gate

Confirm the proposed AI-2 design:

- does not use OpenAI cloud APIs
- does not use Anthropic/Google/other cloud LLM APIs
- does not send Reading Journal data outside the local/private environment
- does not expose the LLM service publicly
- does not add a public fallback

## 11. Configuration compatibility

Verify whether the current AI-1 configuration is sufficient for the selected runtime:

- `EDUNI_AI_PROVIDER=local`
- `EDUNI_AI_BASE_URL=<local/private endpoint>/v1`
- `EDUNI_AI_MODEL=<model id>`
- optional `EDUNI_AI_TIMEOUT_SECONDS`

Identify only the minimum code/config changes required for AI-2.

Prefer **zero provider-code changes** if the selected runtime already satisfies the
OpenAI-compatible contract.

If a runtime requires API-key headers, nonstandard tool syntax, special templates, or
other provider-specific behavior, document that as implementation scope rather than
silently weakening the provider-neutral design.

## 12. Performance observation

If a live installed model can be tested, record factual measurements for a small,
repeatable prompt:

- model load/cold-start observation
- time to first response if measurable
- total response time
- approximate output length
- CPU/GPU utilization observation
- peak VRAM/RAM if easily available

Also run one tool-call round-trip if supported.

Do not run long stress tests.

Do not benchmark unrelated hardware.

## 13. Safety / privacy adversarial checks

Confirm the future design does not allow:

- client-selected base URL
- client-selected model
- public URL provider
- reading-search parent_note leakage
- arbitrary tool invocation
- arbitrary SQL
- remote/cloud fallback
- unrestricted network egress added by AI-2

Do not change the existing `reading_search` privacy contract.

## 14. Expected result categories

### READY

Use when one actual local runtime/model combination is sufficiently validated to
implement AI-2 safely.

The report must specify an exact next implementation contract, including:

- runtime
- model
- endpoint topology
- expected `EDUNI_AI_*` values
- tool-calling support status
- any Compose/startup changes required
- model storage strategy
- production activation gate

### READY WITH INSTALL/DOWNLOAD APPROVAL REQUIRED

Use when the architecture is clear but the chosen runtime/model is not currently
installed.

State exactly what would need to be installed/downloaded and approximate size if
known.

Do not perform the installation/download.

### BLOCKED

Use only for a concrete blocker such as hardware incompatibility or inability to
find a credible local tool-calling option.

## 15. Report

Create:

`EDUNI_AI2_LOCAL_LLM_DISCOVERY_REPORT_55.md`

Include:

- exact branch/base SHA
- host hardware capability summary
- detected runtimes
- detected installed models
- live-test results, if any
- OpenAI-compatible API compatibility
- tool-calling compatibility
- Korean response observations
- Docker reachability/topology analysis
- primary candidate
- fallback candidate
- no-cloud/privacy confirmation
- exact proposed AI-2 implementation contract
- items requiring user approval (runtime install/model download), if any
- remaining risks

Do not include:

- passwords
- API tokens
- unrelated environment secrets
- private file contents

## 16. Git scope

This task should be documentation-only.

Do not modify product code.

Commit/push only:

`EDUNI_AI2_LOCAL_LLM_DISCOVERY_REPORT_55.md`

to:

`feature/eduni-ai2-local-llm`

Do not create a PR.
Do not merge.
Do not deploy.

## 17. Final verdict

Use exactly one:

`AI-2 LOCAL LLM DISCOVERY READY — IMPLEMENTATION CONTRACT DEFINED`

`AI-2 LOCAL LLM DISCOVERY READY — INSTALL/DOWNLOAD APPROVAL REQUIRED`

`BLOCKED`

Stop after report commit/push.
