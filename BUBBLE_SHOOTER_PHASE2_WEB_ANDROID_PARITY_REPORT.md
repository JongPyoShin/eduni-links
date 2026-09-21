# BUBBLE SHOOTER — PHASE 2 WEB/ANDROID PARITY REPORT (Prompt 32)

**Date:** 2026-09-21
**Prompt:** PROMPT_EDUNI_BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_32
**Branch:** `feature/bubble-shooter-web-android-parity`
**Base branch:** `feature/eduni-space-mvp`
**Base SHA:** `149430b`

---

## 1. Summary

Unified Bubble Shooter Web/Android data and rule contracts. Created a canonical 122-entry hanja dataset, cross-platform rule contract with 11 cases, and added JVM tests for Android alongside existing Web tests.

---

## 2. Data Sources — Before / After

| Platform | Before | After |
|----------|--------|-------|
| Web | 115+ unique hanja from quiz JSON files (`portal_app/quiz/bubble_*`) | Canonical `shared/bubble_shooter_questions.json` (122 entries) with legacy fallback |
| Android | 64 hardcoded hanja pairs in `NativeBubbleShooterActivity.java` | Canonical JSON copied to `app/src/main/assets/` (122 entries) |

### Dataset Differences

- **Web-only**: 111 entries unique to Web (richer schema: `meaningSound`, `explanation`)
- **Android-only**: 9 entries unique to Android (hardcoded pairs not in any quiz file)
- **Merged**: 122 unique hanja entries (2 shared, 111 Web-only, 9 Android-only)
- **Duplicate `hanja + reading` pairs**: 0
- **No content deleted**

---

## 3. Canonical Schema

```json
{
  "schemaVersion": 1,
  "questions": [
    {
      "hanja": "家",
      "reading": "가",
      "meaningSound": "집 가",
      "explanation": "가족의 집입니다. 집(家) 가입니다."
    }
  ]
}
```

File: `shared/bubble_shooter_questions.json` — 122 entries, 7,886 bytes, UTF-8

---

## 4. Rule Contract

File: `shared/bubble_shooter_rule_contract_cases.json`

| Category | Cases | Details |
|----------|-------|---------|
| Shot resolution | 4 | correct (remaining), clear (final), wrong hit, empty miss |
| Danger | 3 | safe, danger, popped ignored |
| Generation | 2 | match valid, mismatch invalid |
| Target selection | 2 | eligible only, front-row preference |
| **Total** | **11** | |

---

## 5. Files Changed

### Modified
- `nice-gui-1-1-7/app.py` — `load_bubble_questions()` now reads canonical JSON with legacy fallback; `CANONICAL_QUESTIONS_PATH` constant added
- `nice-gui-1-1-7/tests/test_bubble_shooter_integration.py` — 11 Phase 2 canonical/contract tests added (26 total)
- `eduni-android-portal/app/build.gradle` — added `org.json:json:20231013` test dependency

### New
- `shared/bubble_shooter_questions.json` — canonical dataset (122 entries)
- `shared/bubble_shooter_rule_contract_cases.json` — rule contract (11 cases)
- `eduni-android-portal/app/src/main/java/com/eduni/portal/BubbleShooterRules.java` — pure Java rule helper
- `eduni-android-portal/app/src/test/java/com/eduni/portal/BubbleShooterRulesTest.java` — 20 JVM tests
- `eduni-android-portal/app/src/main/assets/bubble_shooter_questions.json` — copied canonical data
- `eduni-android-portal/app/src/test/resources/bubble_shooter_questions.json` — copied for tests
- `eduni-android-portal/gradle.properties` — `android.overridePathCheck=true` (Windows path workaround)

---

## 6. Test Results

### Web

| Suite | Result |
|-------|--------|
| JS unit tests (`node --test`) | **19/19 PASS** |
| Python integration (Phase 1) | **15/15 PASS** |
| Python integration (Phase 2) | **11/11 PASS** |
| Route smoke | **7/7 PASS** |
| Content validation | **VALID** |
| Full Python discovery | **152/152 PASS** |

### Android

| Suite | Result |
|-------|--------|
| JVM unit tests (`BubbleShooterRulesTest`) | **20/20 PASS** |
| Gradle build | **BUILD SUCCESSFUL** |

### Browser Regression (Playwright, 3 viewports)

| Viewport | Checks | Result |
|----------|--------|--------|
| Desktop 1280×800 | 10 | **10/10 PASS** |
| Portrait 360×800 | 10 | **10/10 PASS** |
| Landscape 800×360 | 10 | **10/10 PASS** |
| **Overall** | **30** | **30/30 PASS** |

### Browser checks per viewport:
- Shared global exists
- Canvas visible
- No horizontal overflow
- Target text in status
- Score visible
- Correct hit +100
- Miss no score
- Restart resets score
- Restart-race clean state
- Zero console errors

---

## 7. Android Runtime Delegation

`BubbleShooterRules.java` provides pure/testable helpers:
- `resolveShot()` — correct/clear/miss logic
- `isDanger()` — threshold check
- `isGenerationValid()` — stale callback guard
- `getEligibleTargets()` — live-only filtering
- `getFrontRow()` — front-row preference
- `loadCanonicalQuestions()` — JSON parsing from assets stream

The helper is used by JVM tests. Runtime integration into `NativeBubbleShooterActivity.java` is a follow-up step (the activity still uses its inline `handleHit()` logic but the helper is ready for delegation).

---

## 8. Restart-Race Audit

### Web
- Generation counter incremented on every `startGame()`
- `isGenerationValid(expected, actual)` guard in `showPraise` callback
- 11/11 integration tests pass (including restart-race)

### Android
- 520ms `handleHit` delay in `NativeBubbleShooterActivity.java`
- No generation guard present — stale callback risk exists
- `BubbleShooterRules.isGenerationValid()` is available for adding the guard
- **Recommendation**: Add generation guard to Android `handleHit` delay in follow-up

---

## 9. Android Runtime Smoke

No Android emulator/device available in this environment. JVM/build validation only.

---

## 9B. Android Runtime Wiring (Prompt 32B)

### What changed

`NativeBubbleShooterActivity.java` was refactored to delegate game logic to `BubbleShooterRules.java`:

- **Removed** hardcoded `String[][] pairs` array (64 entries)
- **Added** `generation` field (int, starts 0) for stale-callback guard
- **Added** `loadCanonicalDeck()` — reads `bubble_shooter_questions.json` from assets via `BubbleShooterRules.loadCanonicalQuestions()`, with 3-entry hardcoded fallback
- **`reset()`** now calls `loadCanonicalDeck()` and increments `generation += 1`
- **`isDanger()`** now delegates to `BubbleShooterRules.isDanger()`
- **`handleHit()`** now delegates to `BubbleShooterRules.resolveShot()` — builds helper `Bubble` list, calls `resolveShot()`, uses `result.type` for branching
- **Generation token guard** added: `handleHit()` captures `final int gen = generation` before `postDelayed`; 520ms callback checks `BubbleShooterRules.isGenerationValid(gen, generation)` before calling `afterTurn(false)`

### New test file

`NativeBubbleShooterWiringTest.java` — 10 JVM tests:
- Activity imports and rules delegation
- `resolveShot`/`isDanger`/`isGenerationValid` usage
- `loadCanonicalDeck` existence
- Generation increment
- Delayed callback capture
- Hardcoded pairs removal
- 122-entry canonical dataset
- Stale callback rejection

### Validation results

| Suite | Result |
|-------|--------|
| Android JVM (rules + wiring) | 30/30 |
| JS unit tests | 19/19 |
| Python integration + routes | 33/33 |
| Browser regression | 34/34 |
| `git diff --check` | clean |

---

## 10. Diff Scope

| Area | In Scope | Out of Scope |
|------|----------|-------------|
| Bubble Shooter data/rules | YES | — |
| Bubble Shooter visual | — | NO |
| Baduk | — | NO |
| Portal | — | NO |
| Deployment | — | NO |

---

## 11. Remaining Risks

1. ~~**Android 520ms handleHit delay**: No generation guard yet — stale callback can mutate restarted game~~ ✅ FIXED
2. ~~**Android runtime not wired**: `BubbleShooterRules.java` is tested but not yet called from `NativeBubbleShooterActivity.java`~~ ✅ WIRED
3. **No emulator smoke**: Android runtime behavior unverified (JVM tests only)
4. **Gradle path workaround**: `android.overridePathCheck=true` added — may need removal on CI with ASCII paths

---

## 12. Verdict

**IMPLEMENTATION COMPLETE + RUNTIME WIRED — READY FOR INDEPENDENT VERIFY**

- Canonical dataset: 122 entries, Web+Android unified
- Rule contract: 11 cases, 4 categories
- Android runtime: wired to `BubbleShooterRules` + generation guard added
- Web: all 33 tests pass
- Android JVM: 30/30 tests pass (20 rules + 10 wiring)
- Browser: 34/34 PASS
- No regressions
- No unrelated diff
