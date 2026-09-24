# EDUNI AI Foundation — Supplemental Unavailable Verify 46B

## Mission

Verify only the one runtime gate that was environment-blocked in Verify 46.

Repository: JongPyoShin/eduni-links
Branch: feature/eduni-ai-foundation

Product/test implementation baseline:

`1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`

Verify 46 report:

`EDUNI_AI_FOUNDATION_VERIFY_REPORT_46.md`

Do not modify product code.
Do not modify tests.
Do not merge.
Do not deploy.
Do not contact production.
Do not rerun the entire Verify 46 unless needed to establish the isolated app.

## Background

Verify 46 passed:

- AI focused tests: 25
- reading tests: 16
- route tests: 7
- full suite: 200 tests, 1 skipped
- compileall
- diff-check
- disabled-mode runtime smoke
- local fake-provider E2E
- reading_search tool flow
- parent_note privacy gate
- timeout route -> 504 ai_timeout
- malformed provider route -> 502 ai_failed
- security source audit

Verify 46 was BLOCKED only because this Windows host does not reliably produce a
TCP "connection refused" for an unused 127.0.0.1 port. It drops the connection
until socket timeout, correctly exercising the timeout path instead.

This supplement must make the unavailable condition deterministic rather than
depending on an unused port.

## 1. Git gate

Confirm:

- branch = feature/eduni-ai-foundation
- product/test baseline remains
  `1f2f05c8e8ef0ce9eafdabe52babf552cd9de3fa`
- all commits after that baseline are documentation/report-only
- no product/test code changed after baseline
- Verify 46 report exists and verdict is BLOCKED only for the unavailable route smoke

If product/test code changed after baseline, report BLOCKED.

## 2. Deterministic unavailable fixture

Do NOT use an unused port as the primary unavailable test.

Instead create temporary verification-only local TCP infrastructure that
deterministically causes an established connection to fail before a valid HTTP
response is returned.

Preferred approach:

1. Bind a temporary TCP listener to `127.0.0.1:<unused-high-port>`.
2. Accept the incoming connection from EDUNI.
3. Immediately close/reset the socket without returning an HTTP response.

A valid stronger reset approach is acceptable, e.g. configuring SO_LINGER for
an immediate TCP RST if supported.

The fixture must be temporary verification code only.
Do not commit it as product/test code.

Alternative deterministic fixtures are acceptable only if they exercise the
REAL `LocalOpenAIProvider` HTTP stack and REAL `/ai/chat` route.

Do not satisfy this gate only by mocking `AIService` or injecting a provider
exception directly.

## 3. Isolated EDUNI app

Run only an isolated EDUNI process on loopback.

Configure:

- EDUNI_AI_PROVIDER=local
- EDUNI_AI_BASE_URL=http://127.0.0.1:<reset-port>/v1
- EDUNI_AI_MODEL=fake-local-model
- EDUNI_AI_TIMEOUT_SECONDS=3 or another short nonzero value
- isolated EDUNI database/data paths

Do not use production Docker.
Do not use production port 8081.
Do not use host port 8080.

## 4. Hard unavailable route gate

POST:

`/ai/chat`

with:

~~~json
{"message":"안녕"}
~~~

PASS only if the real application response is:

- HTTP 503
- JSON `{"ok":false,"error":"ai_unavailable"}`
- no traceback
- no reset fixture host/port in response
- no raw Python/network error in response

Record the actual exception category observed by the verification fixture if it
can be captured externally, but do not require the application to expose it.

This must pass through:

`/ai/chat -> AIService -> LocalOpenAIProvider -> urllib HTTP stack`

## 5. Timeout distinction sanity

Keep the semantic distinction verified in Verify 46.

Using a temporary local HTTP fixture that accepts the request but deliberately
delays beyond EDUNI_AI_TIMEOUT_SECONDS, confirm:

- HTTP 504
- error = ai_timeout

The unavailable/reset fixture and delayed/timeout fixture must produce different
status codes:

- unavailable/reset -> 503
- delayed timeout -> 504

This distinction is the purpose of 46B.

## 6. Optional direct provider evidence

It is useful but not sufficient by itself to show:

- reset fixture raises an OSError/connection-reset/remote-disconnected style
  condition that becomes ProviderUnavailableError
- delayed fixture becomes ProviderTimeoutError

The route results in sections 4 and 5 remain mandatory.

## 7. Minimal regression sanity

Because product code is unchanged, only run:

~~~powershell
cd nice-gui-1-1-7
python -m unittest tests.test_ai
python -m compileall -q portal_app/ai tests/test_ai.py
cd ..
git diff --check
~~~

Do not rerun the entire 200-test suite unless an unexpected issue requires it.

Expected focused test baseline: 25 AI tests.

## 8. Production safety

Do not touch:

- production eduni-game
- production port 8081
- host port 8080
- production eduni_data
- any existing PostgreSQL container/volume
- Nextcloud
- codex-uv-lock-pg
- flopi-pr87-pg-20260911

## 9. Cleanup

Stop/remove:

- isolated EDUNI process
- reset fixture
- delayed fixture
- temporary database/data
- temporary verification scripts/logs

Leave only the verification report commit.

## 10. Report

Create and commit/push:

`EDUNI_AI_FOUNDATION_UNAVAILABLE_VERIFY_REPORT_46B.md`

Include:

- product/test baseline SHA
- branch HEAD before report
- confirmation no product/test change
- deterministic reset fixture method
- actual /ai/chat unavailable status/body
- delayed timeout status/body
- focused AI test total
- compileall
- diff-check
- production untouched confirmation
- cleanup confirmation

Final verdict exactly one:

`AI FOUNDATION 46B PASS — READY FOR PR`

`AI FOUNDATION 46B FAIL`

`BLOCKED`

PASS requires:

- deterministic real route unavailable = 503 ai_unavailable
- deterministic delayed real route timeout = 504 ai_timeout
- no information leakage
- no product/test code change

If PASS, recommendation exactly:

`CREATE PR AFTER PR #69 MERGE`

Do not create PR.
Do not merge.
Do not deploy.
