# EDUNI Bubble Shooter Phase 2 — Contract Fixture + Target Runtime Closeout (Prompt 32C)

## Why this prompt exists

Prompt 32B correctly wired Android runtime for:

- canonical dataset loading
- `resolveShot()`
- `isDanger()`
- `isGenerationValid()`
- 520ms stale-callback generation guard

However, independent inspection found two remaining Phase 2 contract gaps:

1. `NativeBubbleShooterActivity.chooseCurrent()` still computes front-row eligibility itself instead of delegating to `BubbleShooterRules.getEligibleTargets()/getFrontRow()`.
2. Android JVM tests do not execute the same `shared/bubble_shooter_rule_contract_cases.json` fixture that Web/Python validates.

These must be fixed before Prompt 33.

Do not run Prompt 33 until this prompt is complete.

---

## Repository / branch

Repository:

`JongPyoShin/eduni-links`

Work only on:

`feature/bubble-shooter-web-android-parity`

PR:

`#65`

Base:

`feature/eduni-space-mvp`

Current verified feature HEAD before this closeout:

`32982eb94d325aff1e0200bd9a30eed4e1dec296`

Do not merge.

Do not deploy.

---

# 1. Confirm current branch state

Run:

```powershell
git fetch --all --prune
git checkout feature/bubble-shooter-web-android-parity
git status --short --branch
git rev-parse HEAD
git rev-parse origin/feature/bubble-shooter-web-android-parity
git rev-parse origin/feature/eduni-space-mvp
```

Require:

- local/remote feature branch aligned or safely fast-forwardable
- no unrelated local tracked changes
- PR #65 remains Draft/open

If base advanced, merge current base normally and preserve Phase 2 work.

Final verification requires `behind_by = 0`.

---

# 2. Wire target selection runtime to BubbleShooterRules

Current Android runtime still contains local logic in `chooseCurrent()` equivalent to:

- gather live bubbles
- compute max/front Y
- select bubbles within `radius * 0.8f`
- choose one randomly

This duplicates the helper contract.

Refactor so actual target selection delegates to the existing:

- `BubbleShooterRules.getEligibleTargets(...)`
- `BubbleShooterRules.getFrontRow(...)`

## Required behavior

1. Convert native runtime `Bubble` objects to helper `BubbleShooterRules.Bubble` objects while preserving enough identity to map the selected helper candidate back to the native Bubble.
2. Use `getEligibleTargets()` for live/eligible filtering.
3. Use `getFrontRow()` with the same existing threshold semantics:
   - current effective tolerance = `radius * 0.8f`
4. Use native `Random` only to choose one candidate from the returned front-row candidate set.
5. Map the chosen helper result back to the original native Bubble deterministically.
6. Preserve current target text and UI behavior.
7. Do not require identical Web/Android RNG sequences.

A small adapter method is acceptable.

Delete or stop using any duplicate active front-row computation path.

A helper-like method that still recomputes the same rule locally does **not** satisfy this requirement.

---

# 3. Add runtime wiring tests for target selection

Extend `NativeBubbleShooterWiringTest.java` or add a narrowly scoped test.

Required assertions:

- Activity runtime references `BubbleShooterRules.getEligibleTargets`
- Activity runtime references `BubbleShooterRules.getFrontRow`
- `chooseCurrent()` or its adapter path uses those helper results
- old duplicate local max-Y/front-row selection loop is no longer the active path

Add a pure JVM behavior test if practical:

- popped bubble excluded
- rear bubble excluded from front row
- front-row candidates retained
- selection chooses only from helper-returned candidate set

Do not add a large Android framework dependency.

---

# 4. Make the exact shared rule-contract fixture drive Android tests

Canonical source:

`shared/bubble_shooter_rule_contract_cases.json`

The same contract cases must be executable by both Web/Python validation and Android JVM tests.

## Preferred approach

Configure Android test resources so the exact shared JSON is available to JVM tests without manually maintaining a divergent second fixture.

Acceptable approaches, in preference order:

1. Gradle test resource source set includes the repository `shared/` location read-only.
2. Deterministic Gradle copy task copies the shared fixture into generated test resources.
3. Repository test setup copies it deterministically and verifies byte-for-byte equality.

Do **not** manually paste a second independent copy and call it shared.

If a generated copy is used:
- it must not become a second hand-edited source of truth
- add an equality/hash assertion against `shared/bubble_shooter_rule_contract_cases.json` where practical

---

# 5. Android contract-fixture test runner

Add JVM tests that parse and execute every contract case from:

`bubble_shooter_rule_contract_cases.json`

against `BubbleShooterRules`.

Do not merely check that the file exists.

The test must dispatch by category and assert expected values.

Required categories:

## shot_resolution

Execute all contract cases against `BubbleShooterRules.resolveShot()` and validate expected:

- type
- score delta
- pressure/addPressure
- clear/game-over semantics
- remaining/live bubble behavior where specified

## danger

Execute all danger cases against `BubbleShooterRules.isDanger()`.

## generation

Execute all generation cases against `BubbleShooterRules.isGenerationValid()`.

## target_selection

Execute target cases using:

- `getEligibleTargets()`
- `getFrontRow()`

For random target selection, assert candidate eligibility/front-row set rather than a specific RNG result.

## Completeness

Fail if:

- fixture has an unknown category
- fixture has zero cases
- an expected case is silently skipped
- parsed case count differs from fixture case count

Expected current fixture count: 11.

---

# 6. Prove Web and Android use the same fixture

Keep existing Web/Python contract-file validation.

Add a parity assertion/report proving:

- Web/Python reads `shared/bubble_shooter_rule_contract_cases.json`
- Android JVM reads the same source or deterministic byte-identical generated resource
- all 11 cases are executed on Android
- no second active rule-contract source exists

If Web tests currently only validate structure/categories but do not execute rule outputs from that file, inspect whether the JS logic has separate equivalent tests.

For Phase 2 acceptance, ensure the contract fixture is not decorative:
- the fixture's expected behavior must be exercised against at least the platform rule layer for both platforms

If necessary, add a small Node/Python adapter test that executes the JSON cases against `EDUNIBubbleShooterLogic`.

Do not duplicate product logic inside the test adapter.

---

# 7. Re-run validation

Required minimum:

## Web

```powershell
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python -m unittest discover -s tests
python scripts/validate_content.py
```

## Android

```powershell
cd ..\eduni-android-portal
.\gradlew.bat --no-daemon testDebugUnitTest
```

Use the environment's required `ANDROID_HOME` if necessary.

Expected previous baseline:

- JS 19/19
- Python integration + routes 33/33
- full Python discovery 152/152
- Android JVM 30/30

Counts should increase if new contract-fixture/target-wiring tests are added.

## Browser

Re-run the existing isolated Bubble Shooter regression.

Previous baseline: 34/34.

No product behavior should change from this closeout.

## Whitespace

```powershell
git diff --check
```

Must pass.

---

# 8. Update report

Update:

`BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`

Add a Prompt 32C section including:

- target-selection runtime delegation details
- exact helper APIs used
- proof duplicate active front-row logic removed
- Android shared-contract fixture loading mechanism
- number of fixture cases actually executed on Android
- Web fixture execution status
- new JVM test totals
- browser results
- final HEAD
- ahead_by / behind_by

Remove/resolve any remaining-risk statement that is no longer true.

---

# 9. Strengthen Prompt 33

Update:

`.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_PHASE2_VERIFY_33.md`

Prompt 33 must independently assert all of the following:

## Runtime delegation

- `resolveShot()` used by Android runtime
- `isDanger()` used by Android runtime
- `getEligibleTargets()` used by Android runtime
- `getFrontRow()` used by Android runtime
- `isGenerationValid()` used by 520ms callback
- canonical loader used by Android runtime

## Shared rule fixture

- Android tests load the exact shared/deterministically generated rule-contract JSON
- Android executes every case
- Web platform executes the same expected rule cases
- no duplicate independently maintained contract fixture

## Existing items

Keep all prior canonical data, generation guard, Phase 1 regression, browser, diff-scope, and base-sync checks.

Prompt 33 must remain verification-only.

It must not fix code.

---

# 10. Push and final result

Commit and push all changes to:

`feature/bubble-shooter-web-android-parity`

Re-fetch PR #65 metadata.

Require:

- open
- draft
- behind_by = 0
- mergeable or clean once GitHub recalculates
- no unrelated diff

Final Prompt 32C verdict must be exactly one of:

- `IMPLEMENTATION COMPLETE — READY FOR PROMPT 33`
- `BLOCKED`
- `FAIL`

Do not merge.

Do not deploy.
