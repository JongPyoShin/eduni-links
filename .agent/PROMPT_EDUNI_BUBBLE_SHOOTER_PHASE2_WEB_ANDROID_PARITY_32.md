# EDUNI Bubble Shooter Phase 2 — Web/Android Data + Rules Parity (Prompt 32)

## Objective

Start Bubble Shooter Phase 2 after the successful production deployment of PR #63.

The goal is **not** to rewrite Android as WebView or force JavaScript into the native app.

The goal is to remove the two remaining sources of drift:

1. Web and Android currently maintain separate Hanja question data.
2. Web and Android implement the same core turn rules separately without an executable parity contract.

Phase 2 should introduce:

- one canonical Bubble Shooter question dataset
- explicit shared rule-contract fixtures
- Web tests and Android/JVM tests that prove both implementations obey the same contract
- the smallest runtime changes needed to consume the unified dataset

Keep the Android renderer/input loop native.

Do not deploy production in this task.

---

# Repository / base

Repository:

`JongPyoShin/eduni-links`

Base branch:

`feature/eduni-space-mvp`

Current production already includes:

- Baduk PR #64
- Bubble Shooter PR #63

Production deployment report:

`EDUNI_8081_BADUK_BUBBLE_PRODUCTION_DEPLOY_REPORT_31.md`

Current Bubble Shooter production behavior is considered the compatibility baseline.

---

# 1. Create Phase 2 branch and Draft PR

Fetch latest base first.

Create a dedicated branch from the current remote base:

`feature/bubble-shooter-web-android-parity`

Open a Draft PR targeting:

`feature/eduni-space-mvp`

Suggested title:

`WIP: unify Bubble Shooter Web/Android data and rule contracts`

Do not work directly on the base branch.

Do not merge automatically.

---

# 2. Read relevant instructions and current implementation

Read:

- root `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `EDUNI_8081_BADUK_BUBBLE_PRODUCTION_DEPLOY_REPORT_31.md`
- `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`
- `BUBBLE_SHOOTER_FINAL_SYNC_VERIFY_REPORT_30.md`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`
- `eduni-android-portal/app/src/main/java/com/eduni/portal/NativeBubbleShooterActivity.java`
- Android Gradle/module configuration relevant to assets and JVM unit tests

Before editing, document the current Web and Android question sources and rule differences.

---

# 3. Preserve Phase 1 behavior

Phase 2 must not regress these already-shipped contracts.

## Web

Correct hit:
- +100 score
- hit bubble removed
- no pressure bubble added

Miss / wrong hit:
- no score
- exactly one pressure bubble added

Restart race:
- stale delayed callback from the old game cannot mutate a restarted game

Shared Web runtime:
- `EDUNIBubbleShooterLogic`
- `L.resolveShot`
- `L.isDanger`
- `L.selectTarget`
- `L.pointerToCss`
- `L.isGenerationValid`

## Android

Keep:
- native Canvas renderer
- native touch/gamepad/keyboard input
- landscape behavior
- exit menu
- restart behavior
- current visual gameplay unless a parity bug requires a targeted fix

Do not replace the native activity with a WebView.

---

# 4. Canonical question dataset

Create one canonical, UTF-8 JSON dataset in a neutral repository location.

Preferred path:

`shared/bubble_shooter_questions.json`

If repository structure makes another neutral location materially cleaner, document why.

Suggested schema:

```json
{
  "schemaVersion": 1,
  "questions": [
    {
      "hanja": "家",
      "reading": "가"
    }
  ]
}
```

Requirements:

- `schemaVersion` required
- `questions` non-empty
- every entry has non-empty `hanja`
- every entry has non-empty `reading`
- no duplicate exact `hanja + reading` pair
- UTF-8 only
- deterministic order in source control
- no runtime network dependency

The initial canonical data should represent the union/intentional selected set of the currently shipped Web and Android datasets.

If the Web and Android lists differ:
- produce a diff
- explain which entries are Web-only / Android-only
- preserve valid educational content
- do not silently delete entries

If an entry appears questionable or malformed, report it rather than guessing.

---

# 5. Web consumes canonical dataset

Update the Web Bubble Shooter path so question data comes from the canonical JSON rather than a second hardcoded list.

Requirements:

- load/read the canonical JSON server-side or at serve-time using the existing app architecture
- no extra external HTTP request
- fail safely if the dataset is malformed or missing
- do not silently serve an empty game
- preserve current page route and gameplay behavior
- preserve current shared JS logic injection

The Web runtime should not create a new divergent copy of the question list.

Add focused tests proving:

- canonical file loads
- schema validation
- served Bubble Shooter contains data from canonical source
- known first/representative entries appear
- duplicate/malformed fixture is rejected by validator

---

# 6. Android consumes the same canonical dataset

The native Android activity must use the same canonical source of truth.

Preferred implementation order:

1. Configure Android assets/resources so the canonical JSON is packaged into the app without maintaining a second manually edited question list.
2. Parse the packaged JSON in native Java.
3. Build the in-memory deck from that parsed data.

Avoid copying the same question list into Java source.

If Gradle can safely include the neutral shared-data directory as an asset source, use that approach and document it.

If direct external asset source configuration is brittle in this project, use a deterministic build-time copy task from the canonical JSON into generated assets, with tests/checks that prevent drift.

Do not require an online fetch.

Android must show a clear safe failure state if packaged question data is invalid instead of crashing.

---

# 7. Define executable cross-platform rule contract

Create a neutral rule-contract fixture file, for example:

`shared/bubble_shooter_rule_contract_cases.json`

This file should describe inputs and expected outputs for the core rules that both platforms share.

Minimum cases:

## Shot resolution

1. correct hit with remaining bubbles
   - type = correct
   - score delta = +100
   - pressure = false
   - hit bubble removed
   - game not over

2. correct hit on final bubble
   - type = clear
   - score delta = +100
   - pressure = false
   - cleared/game over

3. wrong bubble hit
   - type = miss
   - score delta = 0
   - pressure = true

4. top/empty miss
   - type = miss
   - score delta = 0
   - pressure = true

## Danger

5. all live bubbles above safe threshold
   - danger = false

6. one live bubble crossing threshold
   - danger = true

7. popped bubble crossing threshold
   - ignored

## Generation / stale callback

8. expected generation == actual
   - valid

9. mismatch
   - invalid

## Target selection eligibility

10. only live bubbles eligible
11. front-row preference contract represented in a deterministic way

For random selection, the contract should define the **eligible candidate set**, not demand identical RNG sequences across JS and Java.

---

# 8. Refactor Android core rules into testable pure logic

Move only the cross-platform rules out of the giant Activity/Game class into a small pure Java helper, for example:

`BubbleShooterRules.java`

The helper should contain pure/testable equivalents of the rule contract, such as:

- shot resolution outcome
- danger evaluation
- generation validity
- target eligibility/front-row candidate selection

Do not move rendering, Canvas, MotionEvent, layout, audio, Activity lifecycle, or input handling into this helper.

Keep the refactor narrow.

The Android runtime should actually delegate to the helper for the relevant rules. A helper used only by tests is not sufficient.

---

# 9. Web contract tests

Extend or add Node tests so the JS shared logic is tested against:

`shared/bubble_shooter_rule_contract_cases.json`

The same fixture should drive the assertions.

Keep existing Phase 1 JS tests.

Do not replace useful targeted tests merely to reduce test count.

---

# 10. Android JVM contract tests

Add JVM unit tests under the Android module that load the same rule-contract fixture or a build-generated copy from the canonical shared location.

The tests must verify the Java helper against the same expected outcomes.

Minimum proof:

- correct hit
- final clear
- wrong hit
- empty miss
- danger false/true
- popped danger ignored
- generation match/mismatch
- target candidate eligibility

No emulator should be required for these pure-rule tests.

If Android local JVM tests need a deterministic copied fixture, create the smallest Gradle wiring necessary and document it.

---

# 11. Data parity test

Add an automated repository-level test/check proving:

- Web source loads `shared/bubble_shooter_questions.json`
- Android build packages/consumes the same canonical file
- no hardcoded active Android `String[][] pairs` dataset remains
- no second active Web question list remains

If a tiny fallback dataset is retained for safe error UI/testing, it must be clearly marked as fallback and must not be the normal gameplay source.

---

# 12. Restart-race parity

The Web generation guard is already proven.

Audit Android delayed callbacks.

If Android has delayed callbacks that can survive `reset()`, introduce the minimal native generation/token guard so restart semantics match the Web contract.

Do not add async complexity if Android currently has no stale delayed mutation path.

Add a JVM or targeted runtime test if feasible.

Clearly report whether Android required a change.

---

# 13. Validation

Run all existing Bubble Shooter Web tests plus new parity tests.

Minimum Web:

```powershell
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python scripts/validate_content.py
```

Run new data/contract tests.

Run full Python discovery:

```powershell
python -m unittest discover -s tests
```

Run Android JVM tests with the repository's supported Gradle command, for example the appropriate equivalent of:

```powershell
cd eduni-android-portal
.\gradlew.bat testDebugUnitTest
```

Do not assume the exact task name; inspect the module first.

If Android build/test environment lacks SDK/JDK prerequisites, distinguish environment blocker from code failure.

Also run:

```powershell
git diff --check
```

---

# 14. Browser regression

Run the current feature branch on an isolated local port.

Verify `/bubble-shooter` in headed Chrome:

- desktop 1280×800
- portrait 360×800
- landscape 800×360

At minimum:

- canonical data loads
- target text appears
- correct hit +100
- hit bubble removed
- no replacement pressure bubble on correct hit
- miss adds exactly one pressure bubble
- restart race remains clean
- no horizontal overflow
- zero console errors

Use the Prompt 30 proven canvas interaction method:

`locator.click(position)`

Do not treat `page.mouse` failure to dispatch this game's pointer chain as a product defect.

---

# 15. Android runtime smoke

If an Android emulator/device is available in the normal workflow, run a focused native smoke:

- app launches native Bubble Shooter
- question deck loads from packaged canonical JSON
- visible target is valid
- correct hit works
- miss works
- restart works
- gamepad/keyboard path still responds if available
- no crash / parsing exception

If no emulator/device is available, do not fabricate runtime evidence. Report JVM/build validation only.

---

# 16. Scope guard

Phase 2 must not include:

- Baduk changes
- unrelated portal redesign
- Bubble Shooter visual redesign
- WebView migration
- analytics/telemetry
- cloud question fetching
- user accounts
- scoring-system redesign
- new difficulty system
- broad Gradle modernization

Keep the PR focused on data/rule parity.

---

# 17. Reports

Create:

`BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`

Include:

- source branch / base SHA
- Web question source before/after
- Android question source before/after
- dataset entry counts
- Web-only / Android-only differences discovered
- canonical schema
- rule-contract cases
- Web contract-test results
- Android JVM contract-test results
- Android runtime delegation proof
- restart-race audit result
- browser regression results
- Android runtime smoke status
- full Python result
- diff scope
- remaining risks

---

# 18. Verification handoff prompt

After implementation and focused tests pass, create a separate verifier prompt:

`.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_PHASE2_VERIFY_33.md`

That verifier must independently check:

- no duplicated active question source
- canonical JSON validation
- Web runtime consumes canonical dataset
- Android packaged runtime consumes canonical dataset
- same contract fixture drives Web + Java tests
- Android runtime actually delegates to pure rules helper
- no Phase 1 regression
- no unrelated diff
- base current / behind_by = 0

Do not self-declare merge-ready solely from the implementation run.

Final implementation verdict for Prompt 32 should be:

- `IMPLEMENTATION COMPLETE — READY FOR INDEPENDENT VERIFY`
- `BLOCKED`
- `FAIL`

Do not merge.

Do not deploy production.
