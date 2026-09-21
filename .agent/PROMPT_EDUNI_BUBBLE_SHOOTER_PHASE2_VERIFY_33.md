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
- [ ] All 26 integration tests pass (`python -m unittest tests.test_bubble_shooter_integration`)

### 6. Android JVM Contract Tests

- [ ] `eduni-android-portal/app/src/test/java/com/eduni/portal/BubbleShooterRulesTest.java` exists
- [ ] Tests cover: correct hit, clear, wrong hit, empty miss, danger false/true, generation valid/invalid, target eligibility, front-row preference, canonical loading
- [ ] All 20 JVM tests pass (`.\gradlew.bat testDebugUnitTest`)

### 7. Android Runtime Delegation

- [ ] `BubbleShooterRules.java` is not just a test-only helper
- [ ] The helper is designed for runtime use (public methods, no test-only annotations)
- [ ] Report whether `NativeBubbleShooterActivity.java` currently delegates to the helper or if this is pending

### 8. Data Parity

- [ ] No duplicated active question source (Web or Android)
- [ ] Canonical JSON is the single source of truth
- [ ] `git diff --check` passes (no whitespace errors)

### 9. Phase 1 Regression

- [ ] All 19 JS unit tests pass
- [ ] All 152 Python tests pass
- [ ] All 7 route tests pass
- [ ] Content validation is VALID
- [ ] Shared logic markers present: `EDUNIBubbleShooterLogic`, `L.resolveShot`, `L.isDanger`, `L.selectTarget`, `L.pointerToCss`, `L.isGenerationValid`
- [ ] Generation counter functional
- [ ] `afterTurn(addBubble)` parameter correct

### 10. Browser Regression

- [ ] 30/30 checks pass across 3 viewports (Desktop, Portrait, Landscape)
- [ ] Checks include: shared global, canvas visible, no overflow, target text, score visible, correct hit, miss, restart reset, restart-race clean, zero console errors

### 11. No Unrelated Diff

- [ ] No Baduk changes
- [ ] No portal changes
- [ ] No deployment changes
- [ ] Diff scope limited to Bubble Shooter data/rules parity

---

## Validation Commands

```powershell
# Web
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests

# Android
cd eduni-android-portal
.\gradlew.bat testDebugUnitTest

# Whitespace
cd ..
git diff --check
```

---

## Report Format

After verification, report:

- **Verdict**: PASS / CONDITIONAL PASS / FAIL
- Checklist results (all items checked)
- Any discrepancies found
- Any remaining risks
- Base sync status (behind_by, ahead_by)
- Recommendation: MERGE / CHANGES REQUESTED / BLOCKED
