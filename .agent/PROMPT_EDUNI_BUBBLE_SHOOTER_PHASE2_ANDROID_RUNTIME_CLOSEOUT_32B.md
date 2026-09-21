# EDUNI Bubble Shooter Phase 2 — Android Runtime Wiring Closeout (Prompt 32B)

## Why this prompt exists

Prompt 32 produced the canonical dataset, rule contract fixtures, Web integration, Android helper, and tests, but the implementation summary still lists two unfinished product-code items:

1. `BubbleShooterRules.java` is not yet wired into the actual `NativeBubbleShooterActivity.java` gameplay runtime.
2. The Android correct-hit `main.postDelayed(..., 520)` callback is not protected by a restart generation token.

Those are **implementation gaps**, not independent-verification tasks.

Do not run Prompt 33 as the final verifier until this closeout is complete.

---

## Repository

`JongPyoShin/eduni-links`

Target feature branch:

`feature/bubble-shooter-web-android-parity`

Base:

`feature/eduni-space-mvp`

Do not merge.

Do not deploy production.

---

# 1. Recover/publish the Phase 2 branch before editing

At the time this prompt was written, GitHub did **not** expose the claimed remote branch or Draft PR.

Do not recreate the Phase 2 work from scratch if a completed local worktree/branch exists.

First:

```powershell
git fetch --all --prune
git worktree list
git branch -a
```

Locate the local worktree/branch containing the Prompt 32 implementation.

Expected implementation evidence includes files equivalent to:

- `shared/bubble_shooter_questions.json`
- `shared/bubble_shooter_rule_contract_cases.json`
- `BubbleShooterRules.java`
- `BubbleShooterRulesTest.java`
- Web canonical-data integration
- `BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_PHASE2_VERIFY_33.md`

If the local Phase 2 work cannot be found, stop with `BLOCKED`. Do not fabricate or silently rebuild it from memory.

If found:

- confirm the branch is `feature/bubble-shooter-web-android-parity`
- confirm working tree state
- commit any intended Prompt 32 changes that are still uncommitted
- push the feature branch to `origin`
- create the Draft PR targeting `feature/eduni-space-mvp` if it truly does not exist
- if a Draft PR already exists after push, reuse it

Record the actual PR number and exact feature HEAD.

---

# 2. Sync current base safely

Fetch the latest:

`origin/feature/eduni-space-mvp`

The base may now include this Prompt 32B instruction commit.

Merge the current base normally into the published feature branch.

Do not rebase published history.

Do not reset --hard.

If a real conflict occurs in Phase 2 files, resolve narrowly while preserving both:
- current base production behavior
- Phase 2 parity work

After sync, require:

- `behind_by = 0`
- no unrelated Baduk/production changes in the PR-specific diff

---

# 3. Inspect the actual helper API first

Before editing `NativeBubbleShooterActivity.java`, read the real Phase 2 `BubbleShooterRules.java` and its tests.

Do not invent a second helper API if the existing helper already expresses the rule contract.

The runtime must use the existing helper contracts where practical.

If a tiny helper API adjustment is necessary to make runtime delegation clean, keep it backward-compatible with the shared contract tests and document it.

---

# 4. Wire Android runtime to BubbleShooterRules

The helper must no longer be test-only.

Update:

`eduni-android-portal/app/src/main/java/com/eduni/portal/NativeBubbleShooterActivity.java`

so actual gameplay delegates cross-platform core rules to `BubbleShooterRules`.

## Required runtime delegation

At minimum, actual runtime behavior must delegate these contracts:

### A. Shot outcome

`handleHit(...)` / miss handling must use the helper's shot-resolution result rather than independently re-encoding all of:

- correct vs miss
- +100 score
- pressure-bubble decision
- clear/final-bubble outcome where represented by the helper

The Activity may still perform UI state mutation/rendering, but the rule decision must come from the helper.

Do not keep a parallel active rule branch that can drift.

### B. Danger evaluation

The Android runtime danger decision must delegate to the helper's danger rule.

The Activity can convert live Bubble objects to the helper's minimal inputs.

### C. Target eligibility/front-row contract

Use the helper to determine the eligible/front-row candidate set.

Keep Android's native `Random` for choosing one candidate from that eligible set; identical JS/Java random sequences are not required.

Do not move rendering/layout into the helper.

### D. Generation validity

The runtime must use the helper's generation-validity contract for delayed callback protection.

---

# 5. Add Android generation token for the 520ms correct-hit delay

Current shipped Android behavior contains a delayed correct-hit continuation shaped like:

```java
main.postDelayed(new Runnable() {
    @Override
    public void run() {
        afterTurn(false);
    }
}, 520);
```

This callback can outlive `reset()`.

Add the smallest robust generation/token mechanism.

Recommended semantics:

- `int generation` lives in the native Game state
- every `reset()` invalidates prior work by advancing generation
- when scheduling the 520ms continuation, capture the current generation token
- when the callback fires, call the shared/helper generation-validity check
- if stale, return without mutating the new game
- if valid, continue exactly once

Equivalent implementation is acceptable if behavior is the same.

Do not rely only on `waiting`, `shooting`, or current target equality as the stale-callback guard.

Do not remove the user-visible 520ms praise timing unless a narrowly documented technical reason requires it.

---

# 6. Restart-race behavior required

Prove this sequence conceptually and in tests/runtime evidence:

1. Start native game generation N.
2. Correct hit occurs.
3. +100/praise state begins.
4. 520ms continuation for generation N is scheduled.
5. User resets before 520ms.
6. reset creates generation N+1 and clean score/deck/target.
7. Old generation-N callback fires.
8. helper generation check rejects it.
9. New game remains unchanged.

Required stale callback effects:

- no pressure bubble
- no target re-selection from old game
- no score mutation
- no waiting-state mutation
- no clear/game-over mutation

---

# 7. Add focused Android runtime-wiring tests

Keep the existing 20 JVM tests.

Add tests/checks proving the helper is used by runtime, not merely present.

Preferred coverage:

- Activity source/runtime adapter references `BubbleShooterRules`
- shot outcome path delegates
- danger path delegates
- target eligibility delegates
- generation validity delegates
- reset increments/invalidates generation
- delayed 520ms callback captures token and guards before `afterTurn`

If the project already has a practical Robolectric/instrumented-test setup, add a deterministic restart-race test.

If it does not, do **not** introduce a large new Android test framework solely for this task. Use:
- pure JVM generation tests
- targeted source/wiring assertions
- actual emulator/device smoke if available

---

# 8. Preserve native UI/input boundaries

Do not change:

- Canvas renderer architecture
- MotionEvent aiming
- gamepad/keyboard controls
- landscape policy
- exit menu
- general layout
- audio behavior
- scoring values
- pressure-bubble semantics
- current canonical dataset

This closeout is runtime parity wiring, not redesign.

---

# 9. Re-run full Phase 2 validation

At minimum re-run all Prompt 32 suites.

Expected historical minimum before this closeout:

- JS: 19/19
- Python integration + routes: 33/33
- full Python discovery: 152/152
- Android JVM: 20/20
- Browser: 30/30

Counts may increase because new Android wiring tests are added.

Run the actual repository-supported equivalents of:

```powershell
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python -m unittest discover -s tests
python scripts/validate_content.py
```

Run all Phase 2 data/contract tests.

Then Android:

```powershell
cd eduni-android-portal
.\gradlew.bat --no-daemon testDebugUnitTest
```

Use the actual supported Gradle task if different.

Finally:

```powershell
git diff --check
```

No real product failure may be dismissed as an environment issue.

---

# 10. Re-run Web browser regression only as needed

Because this change is Android-runtime-focused, do not needlessly rewrite Web code.

Still rerun the existing isolated Web Bubble Shooter browser suite to prove no parity/data regression:

- desktop 1280x800
- portrait 360x800
- landscape 800x360
- canonical data loaded
- correct +100
- no replacement pressure on correct
- miss adds exactly one pressure
- restart race clean
- zero console errors

Expected prior baseline: 30/30.

---

# 11. Android native smoke

If emulator/device is available in the normal workflow, verify the actual native activity:

- canonical 122-entry dataset loads
- native Bubble Shooter opens
- correct hit
- wrong/miss
- restart during the 520ms praise window
- wait > 520ms
- restarted state remains unchanged
- subsequent shot still works
- no crash/logcat exception

A deterministic test hook may be used only if it exercises the real native runtime path and is not shipped as user-facing debug UI.

If device/emulator is unavailable, report that explicitly. Do not fabricate evidence.

---

# 12. Update Phase 2 report

Update:

`BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`

Correct any earlier wording that implied implementation was complete while runtime delegation remained missing.

Add:

- exact runtime methods now delegating to `BubbleShooterRules`
- generation-token implementation
- restart-race evidence
- added test counts
- exact branch HEAD
- Draft PR number
- ahead/behind status
- Android runtime smoke status

---

# 13. Harden Prompt 33 before handoff

Review:

`.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_PHASE2_VERIFY_33.md`

Prompt 33 must be **verification-only**.

It must independently fail if any of these are true:

- Android still carries an active hardcoded question source
- Web and Android do not consume the canonical dataset
- rule-contract fixture is not shared
- `BubbleShooterRules` exists but runtime does not call it
- Android shot resolution remains independently duplicated
- danger rule remains independently duplicated
- front-row candidate contract remains independently duplicated
- 520ms callback lacks generation guard
- reset does not invalidate the old callback
- behind_by > 0
- unrelated product diff exists

Prompt 33 must not silently implement fixes.

If Prompt 33 needs wording updates to reflect the final runtime design, update it now.

---

# 14. Push and final status

Commit and push all closeout work to:

`feature/bubble-shooter-web-android-parity`

Re-fetch PR metadata and report:

- PR number
- exact HEAD
- base SHA
- ahead_by
- behind_by
- draft/open state
- mergeability if GitHub has finished calculating it

Final Prompt 32B verdict must be exactly one of:

- `IMPLEMENTATION COMPLETE — READY FOR PROMPT 33`
- `BLOCKED`
- `FAIL`

Do not mark merge-ready in Prompt 32B.

Do not merge.

Do not deploy.
