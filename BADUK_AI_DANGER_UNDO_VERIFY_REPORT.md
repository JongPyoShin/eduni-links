# Baduk AI Danger + Undo + Input Freeze — Final Verification

### VERDICT

`FAIL`

The required merge blockers cannot pass because the actual served `http://100.75.214.95:8081/baduk` runtime is not PR #64's danger/undo implementation. Prompt 20 forbids deploying or rebuilding production during verification, so no deployment was performed.

### BASELINE

- implementation code/test SHA: `aacb46f9e6b77371d55995ff7f804937f56d3dca`
- phase 1 report commit: `0627c44b3598fbed2396dd5fa86b120f39044adb`
- PR #64 HEAD: `c7aa36d780cbf8fd7fee5cb270add5514dc241f4`
- PR branch: `feature/baduk-ai-danger-coach`
- base: `feature/eduni-space-mvp`
- verification worktree: `D:\Codex\Worktrees\baduk-pr64-verify`

### STATIC-RUNTIME-ALIGNMENT

PR HEAD source contains the expected implementation markers in `baduk_v2_integration.py` and the shared coach logic, including `analyzeAiDanger`, `invalidateAi`, `undo:undoMove`, and persistence/strategy injection. However, the actual live response does not contain the feature:

- live `analyzeAiDanger`: **absent**
- live `무르기`: **absent**
- live `undo:undoMove`: **absent**
- live generation/invalidation guard: **absent**
- live persistence/19x19 strategy: **present**
- live legacy-only signature: **absent**

The live body was HTTP 200 and 46,580 bytes, matching the previously deployed v2 runtime rather than PR #64.

### INPUT-FREEZE-ROOT-CAUSE

- exact reproduced symptom: **ORIGINAL SYMPTOM NOT REPRODUCED** in the limited live check; the page loaded and a prior saved game restored to a stable human turn.
- exact stale/incorrect state observed: live page had no undo control, no AI danger card path, and no generation-token observability required by Prompt 20.
- root cause: the live Docker service is on the earlier Baduk v2 deployment, not PR #64. This is a deployment/verification-target mismatch, not evidence for a new input-freeze root cause.
- code path fixed: **NOT VERIFIED in live runtime**. PR source statically contains invalidation/self-heal paths, but they were not exercised in the actual served page.
- automated regression tests: see TESTS; several integration assertions fail.
- long-play browser evidence: **NOT VERIFIED**.
- race-test evidence: **NOT VERIFIED**.

### LIVE-BROWSER-QA

Headed Chrome opened the actual live URL and showed 9x9/13x13/19x19 selectors, AI/local mode, coach toggle, and the existing controls. It did **not** show `무르기`, `AI는 왜 여기 뒀을까?`, or `내 돌은 지금 괜찮을까?` after the existing saved move state.

Required Prompt 20 blocker flows are **NOT VERIFIED** because the live runtime lacks the PR feature:

- safe AI move and exactly-one danger/explanation card: NOT VERIFIED
- capture/danger/caution/safe fixtures: NOT VERIFIED
- completed-cycle undo: NOT VERIFIED
- undo during AI thinking: NOT VERIFIED
- local-mode one-action undo: NOT VERIFIED
- pass/ko/resign restoration: NOT VERIFIED
- post-undo persistence: NOT VERIFIED
- 20–30-cycle input-freeze stress: NOT VERIFIED
- 360x800 mobile blocker run: NOT VERIFIED
- console errors: no new Baduk errors observed in the limited live load

### TESTS

- Node focused suites: 41 tests, 40 passed, 1 failed. The failure is `coach explains actual spread component and ignores jitter`, where the test expects `넓은 빈 곳` but the implementation returns `초반이라 넓은 곳을 먼저 차지하려고 했어요.`
- `tests.test_baduk_v2_integration`: 11 tests, 8 failures.
- `tests.test_baduk_19x19_ai`: 4 tests, 4 failures.
- `tests.test_baduk_persistence_integration`: 7 tests, 5 failures.
- `tests.test_baduk_game`: 8 tests, 3 failures.
- full unittest discovery: 114 tests, 18 failures, 2 errors.
- `python scripts/validate_content.py`: passed (`VALID: 1 enabled activities`).
- `git diff --check`: passed.

The Python failures include stale integration/source expectations and Node subprocess/output assumptions; they are reported rather than hidden.

### CHANGES-MADE

- No product source, deployment, Docker, or production-service changes.
- Added this verification report only.
- No merge performed.

### REMAINING-RISKS

- PR #64 is not deployed to the live 8081 service, so browser acceptance remains blocked.
- The PR branch has automated test failures that must be resolved before merge-readiness can be reconsidered.
- A future verification run must deploy the PR through an explicitly authorized deployment step, then repeat all blocker browser scenarios without relying on source inspection.
