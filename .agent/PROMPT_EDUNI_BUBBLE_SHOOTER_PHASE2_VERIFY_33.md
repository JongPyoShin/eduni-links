# EDUNI Bubble Shooter Phase 2 — Independent Verify (Prompt 33)

## Objective

Independently verify that Prompt 32 (Bubble Shooter Phase 2 — Web/Android Data + Rules Parity) was implemented correctly.

Do not modify code. Only read, inspect, and report.

---

## Branch / SHA

- **Feature branch:** `feature/bubble-shooter-web-android-parity`
- **Target base:** `feature/eduni-space-mvp`
- **Implementation report:** `BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`

---

## Verification Checklist

### 1. Canonical Dataset

- [ ] `shared/bubble_shooter_questions.json` exists and is valid JSON
- [ ] `schemaVersion` is 1
- [ ] `questions` array is non-empty
- [ ] Every entry has non-empty `hanja` and `reading`
- [ ] No duplicate `hanja + reading` pairs
- [ ] Total entries = 122

### 2. Rule Contract

- [ ] `shared/bubble_shooter_rule_contract_cases.json` exists and is valid JSON
- [ ] Contains at least 11 cases across 4 categories (shot_resolution, danger, generation, target_selection)
- [ ] Each case has `category`, `description`, `input`, `expected`

### 3. Web Consumes Canonical Dataset

- [ ] `app.py` contains `CANONICAL_QUESTIONS_PATH`
- [ ] `app.py` contains `_load_canonical_questions()` function
- [ ] `load_bubble_questions()` calls `_load_canonical_questions()` with legacy fallback
- [ ] No second active Web question list remains
- [ ] `git grep` confirms no hardcoded hanja pairs in `app.py`

### 4. Android Consumes Canonical Dataset

- [ ] `eduni-android-portal/app/src/main/assets/bubble_shooter_questions.json` matches `shared/bubble_shooter_questions.json`
- [ ] No hardcoded `String[][] pairs` dataset remains active in `NativeBubbleShooterActivity.java`
- [ ] `BubbleShooterRules.loadCanonicalQuestions()` exists and parses the JSON format

### 5. Web Contract Tests

- [ ] `tests/test_bubble_shooter_integration.py` contains Phase 2 tests
- [ ] Tests load and validate `shared/bubble_shooter_rule_contract_cases.json`
- [ ] Tests load and validate `shared/bubble_shooter_questions.json`
- [ ] All current Bubble Shooter integration tests pass; record the actual count (current baseline: 26 integration tests, plus 7 route tests = 33 Python focused tests)

### 6. Android JVM Contract Tests

- [ ] `eduni-android-portal/app/src/test/java/com/eduni/portal/BubbleShooterRulesTest.java` exists
- [ ] Tests cover: correct hit, clear, wrong hit, empty miss, danger false/true, generation valid/invalid, target eligibility, front-row preference, canonical loading
- [ ] All 20 JVM tests pass (`.\gradlew.bat testDebugUnitTest`)

### 7. Android Runtime Delegation (Prompt 32B)

- [ ] `BubbleShooterRules.java` is not just a test-only helper
- [ ] The helper is designed for runtime use (public methods, no test-only annotations)
- [ ] `NativeBubbleShooterActivity.java` delegates to `BubbleShooterRules` for `isDanger()`
- [ ] `NativeBubbleShooterActivity.java` delegates to `BubbleShooterRules` for `resolveShot()`
- [ ] `NativeBubbleShooterActivity.java` uses `BubbleShooterRules.loadCanonicalQuestions()` via `loadCanonicalDeck()`
- [ ] No hardcoded `String[][] pairs` array remains in `NativeBubbleShooterActivity.java`

### 7B. Target Selection Delegation (Prompt 32C)

- [ ] `NativeBubbleShooterActivity.chooseCurrent()` calls `BubbleShooterRules.getEligibleTargets()`
- [ ] `NativeBubbleShooterActivity.chooseCurrent()` calls `BubbleShooterRules.getFrontRow()`
- [ ] `toHelperBubbles()` adapter converts native Bubble → helper Bubble
- [ ] `findNativeByHelper()` mapper converts helper result back to native Bubble
- [ ] Dead `selectTargetFromHelper()` method is removed
- [ ] No duplicate local front-row/max-Y computation remains in active code

### 8. Generation Guard (Prompt 32B)

- [ ] `NativeBubbleShooterActivity.java` has a `generation` field (int, starts 0)
- [ ] `reset()` increments `generation`
- [ ] `handleHit()` captures `final int gen = generation` before `postDelayed`
- [ ] 520ms callback checks `BubbleShooterRules.isGenerationValid(gen, generation)` before proceeding

### 9. Wiring Tests (Prompt 32B + 32C)

- [ ] `NativeBubbleShooterWiringTest.java` exists
- [ ] Tests verify Activity delegates to BubbleShooterRules (resolveShot, isDanger, isGenerationValid)
- [ ] Tests verify Activity delegates target selection (getEligibleTargets, getFrontRow)
- [ ] Tests verify generation guard (stale callback rejection)
- [ ] Tests verify hardcoded pairs removal
- [ ] Tests verify canonical dataset loading
- [ ] Tests verify dead `selectTargetFromHelper()` removed
- [ ] Tests verify adapter methods exist (toHelperBubbles, findNativeByHelper)
- [ ] Pure JVM behavior tests: popped excluded, rear excluded, front-row retained, pipeline correct
- [ ] Combined Android JVM total: 51/51 (20 rules + 17 wiring + 14 contract fixture)

### 9B. Shared Contract Fixture (Prompt 32C)

- [ ] `shared/bubble_shooter_rule_contract_cases.json` is the single source of truth
- [ ] Android Gradle `sourceSets.test.resources.srcDirs` includes `../../shared`
- [ ] `ContractFixtureTest.java` reads the exact shared fixture (not a copy)
- [ ] `ContractFixtureTest.java` executes all 11 cases by category:
  - shot_resolution: 4 cases via `resolveShot()`
  - danger: 3 cases via `isDanger()`
  - generation: 2 cases via `isGenerationValid()`
  - target_selection: 2 cases via `getEligibleTargets()` / `getFrontRow()`
- [ ] `contract_fixture_runner.test.mjs` reads the same fixture for Web/Node
- [ ] No duplicate independently maintained contract fixture exists
- [ ] Fixture `target_front_row_preference` expected values match actual `getFrontRow()` semantics

### 10. Data Parity

- [ ] No duplicated active question source (Web or Android)
- [ ] Canonical JSON is the single source of truth
- [ ] `git diff --check` passes (no whitespace errors)

### 11. Phase 1 Regression

- [ ] All 19 JS unit tests pass
- [ ] All 13 JS contract fixture runner tests pass (11 cases + structural)
- [ ] All 33 Python tests pass (integration + routes)
- [ ] Content validation is VALID
- [ ] Shared logic markers present: `EDUNIBubbleShooterLogic`, `L.resolveShot`, `L.isDanger`, `L.selectTarget`, `L.pointerToCss`, `L.isGenerationValid`
- [ ] Generation counter functional
- [ ] `afterTurn(addBubble)` parameter correct

### 12. Browser Regression

- [ ] 34/34 checks pass (includes logic API, contract cases, canvas, stability)
- [ ] Checks include: shared global, canvas visible, resolveShot correct/miss/clear, isDanger, selectTarget, isGenerationValid, pointerToCss, cssToLogical, no console errors

### 13. No Unrelated Diff

- [ ] No Baduk changes
- [ ] No portal changes
- [ ] No deployment changes
- [ ] Diff scope limited to Bubble Shooter data/rules parity + runtime wiring + contract fixture

---

## Validation Commands

```powershell
# Web
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs tests/contract_fixture_runner.test.mjs
python -m pytest tests/test_bubble_shooter_integration.py tests/test_routes.py -q
python scripts/validate_content.py

# Android (rules + wiring + contract fixture)
cd ../eduni-android-portal
$env:ANDROID_HOME="C:\Users\GMK\AppData\Local\Android\Sdk"
.\gradlew.bat testDebugUnitTest

# Whitespace
cd ..
git diff --check

# Browser regression
python browser_regression.py
```

---

## Current implementation reference

- Expected implementation HEAD before any verifier-only report commit: `6a5fc3ed61cda25a93bf6ac52ca86a1d4edd8208`
- PR #65 must remain open/draft during verification.
- If the verifier writes only a report/prompt metadata commit, record both the verified product-code HEAD and the final report commit separately.

## Report Format

After verification, report:

- **Verdict**: PASS / CONDITIONAL PASS / FAIL
- Checklist results (all items checked)
- Any discrepancies found
- Any remaining risks
- Base sync status (behind_by, ahead_by)
- Recommendation: MERGE / CHANGES REQUESTED / BLOCKED
