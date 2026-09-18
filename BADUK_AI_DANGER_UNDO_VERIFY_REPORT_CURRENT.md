# Baduk PR #64 current-head execution verification

### VERDICT

`FAIL`

### HEAD / SERVER

- branch: `feature/baduk-ai-danger-coach`
- verified HEAD: `3e0ff749c9b72621ae4764cee2b7170deedefef7`
- isolated checkout: `D:\Codex\Worktrees\baduk-pr64-verify`
- isolated server: `http://127.0.0.1:8164`, PID `12792`, `python app.py`, `PORT=8164`, `EDUNI_HOST=127.0.0.1`
- production `100.75.214.95:8081`: **untouched**; no production deploy/rebuild or unrelated service changes.

### SERVED-RUNTIME-BLOCKER

The isolated `/baduk` response was HTTP 200 but was the unpatched base page (32,251 bytes). It did not contain `analyzeAiDanger`, `무르기`, `undo:undoMove`, `const token=++aiGeneration`, contextual `추천 자리`, or `규칙 보기`. Persistence/strategy helpers were also not injected in the served response.

Static inspection found the immediate integration failure: `_PASS_TURN_PATTERN` requires `}\nfunction finishByScore`, while the current `eduni_baduk_v2.html` has `}function finishByScore` on the same line. `pass_count == 0` makes `integrate_v2_coach()` fail safe and return the original page, so all later feature injection is skipped. This is a product-owned runtime regression, not a browser-cache issue.

### AUTOMATED-TESTS

- `node --test tests/baduk_coach_logic.test.mjs`: 21 passed.
- `node --test tests/baduk_19x19_ai.test.mjs`: 6 passed.
- `node --test tests/baduk_board_levels.test.mjs`: 5 passed.
- `node --test tests/baduk_persistence.test.mjs`: 14 passed.
- `tests.test_baduk_v2_integration`: 13 tests, 10 failures.
- `tests.test_baduk_19x19_ai`: 4 tests, 2 failures and 1 error.
- `tests.test_baduk_persistence_integration`: 7 tests, 5 failures.
- `tests.test_baduk_game`: 8 tests, 1 failure and 2 errors.
- full unittest discovery: 116 tests, 21 failures.
- `python scripts/validate_content.py`: passed (`VALID: 1 enabled activities`).
- `git diff --check`: passed.

The Python failures are product-owned integration/runtime alignment failures on this HEAD. The Node unit suites pass; no old counts were reused.

### AI-DANGER / UNDO / HINT / RULES QA

All feature-specific headed-browser scenarios are **NOT VERIFIED** because the isolated served runtime does not expose the implementation:

- safe/critical/danger/caution/false-positive AI danger cards: NOT VERIFIED
- completed-cycle undo: NOT VERIFIED
- undo during AI thinking and stale callback race: NOT VERIFIED
- local/pass/capture/ko/resign undo restoration: NOT VERIFIED
- contextual hint capture/rescue/safety/determinism: NOT VERIFIED
- rule guide open/close/non-blocking behavior: NOT VERIFIED
- 20+ cycle input-freeze stress and race matrix: NOT VERIFIED
- 9x9/13x13/19x19 feature QA and 360x800 mobile: NOT VERIFIED

Headed Chrome did load the isolated page and showed the existing level selector, AI/local mode, and coach toggle, but no `무르기`, hint, or rules controls. Console error/warning capture was empty on the limited load.

### CHANGES-MADE

- No product source, Docker, or production changes.
- Temporary isolated server PID `12792` was stopped after verification.
- Added this report only.

### REMAINING-RISKS

- The integration marker drift must be fixed and the focused Python integration suites must pass before merge readiness can be reconsidered.
- After that fix, rerun the full current-head browser matrix against an isolated server; production must remain untouched until separately authorized.
