# EDUNI Native Jungle Runtime Reliability Hardening — Astra Deep Task (Prompt 39B)

## Mission

Use Astra on **Native Jungle only**.

Time box:

- about 30 minutes
- up to roughly 60% of the available Codex budget

The goal is not to redesign Jungle.

The goal is to deeply audit and harden the **current Native Jungle runtime** around:

1. lifecycle / Handler tick ownership
2. async quiz request staleness and duplicate-request races
3. world-map / controller input routing
4. stage/reset transition invariants

Deliver working code + deterministic tests.

Do not touch Bubble Shooter, Baduk, Space, Portal, production deployment, or PR #67.

---

# 1. Repository / branch

Repository:

`JongPyoShin/eduni-links`

Base:

`feature/eduni-space-mvp`

Historical base near prompt creation:

`b6ca26a44f08948b0fbf642765891c65b6eb2517`

Before work:

```powershell
git fetch --all --prune
git rev-parse origin/feature/eduni-space-mvp
```

Use current remote base if it advanced.

Create:

`feature/jungle-runtime-reliability-hardening`

Create a Draft PR targeting:

`feature/eduni-space-mvp`

Suggested title:

`WIP: Native Jungle runtime reliability hardening`

Do not merge.
Do not deploy.
No physical Android device is available.

---

# 2. Read only targeted context

Read:

- root `AGENTS.md`
- `eduni-android-portal/README.md`
- `NativeJungleActivity.java`
- `EncounterDirector.java`
- `InputActionMapper.java`
- `PlayerLocomotionController.java`

Read additional Jungle files only when an exact call path requires them.

Do not inspect old prototype branches.

Do not scan the whole repository.

---

# 3. Budget discipline

Spend effort approximately:

- 35% runtime/control-flow audit
- 35% implementation
- 25% deterministic tests/stress
- 5% report

Do not spend the first half of the session writing architecture prose.

If time becomes tight, prioritize:

**proven bug fixes + tests > cleanup > documentation**

---

# 4. Preserve gameplay

Hard compatibility requirements:

- current 3-stage progression remains unchanged
- stage unlock persistence remains unchanged
- sticker/reward persistence remains unchanged
- current movement speed/physics remain unchanged
- current collision/move-mask behavior remains unchanged
- current quiz content/fallback remains unchanged
- current touch/controller mappings remain unchanged unless fixing proven duplicate routing
- current visuals/assets remain unchanged
- no new dependency
- no network API contract change
- no persistence schema migration

This task is runtime reliability, not UX redesign.

---

# 5. Audit focus A — Handler tick lifecycle

Current pattern includes:

- one main-thread `Handler`
- `tick` Runnable
- `resume()`
- `pause()`
- `removeCallbacks(tick)`
- `post(tick)`
- `postDelayed(this, 16)`

Prove the following invariants:

- repeated resume cannot create 2 active tick loops
- pause prevents future gameplay ticks
- resume after pause creates exactly 1 loop
- Activity finish/destroy cannot leave an active recurring tick
- no extra loop is created by reset/stage change

If destruction cleanup is incomplete, fix it minimally.

Prefer an explicit small lifecycle owner/helper only if it materially improves testability.

Do not replace the rendering loop architecture.

---

# 6. Audit focus B — async quiz request race

Current non-Camp bird flow includes roughly:

`A -> catchBird() -> new Thread(fetchQuiz) -> main.post(...) -> mode = QUIZ`

Investigate these exact races:

### B1. repeated A press

Before the first network response returns, repeated A may start multiple quiz fetches.

Determine whether this is reachable.

If yes:

- reproduce with deterministic test/harness
- prevent duplicate in-flight quiz acquisition

### B2. reset / stage transition during request

Sequence:

1. quiz request starts
2. game resets or another stage starts/world map opens
3. old response returns
4. old callback attempts to set `quiz`, `mode=QUIZ`, selected bird, etc.

Old responses must not mutate the new stage/session.

### B3. pause / Activity exit during request

A late callback must not resurrect UI state after the runtime is no longer active.

### Required design

Use the **smallest possible request/session token** or epoch mechanism.

It must be pure/testable where possible.

Do not build a generic framework.

Expected properties:

- request start captures session/quiz token
- reset/stage transition invalidates old token
- a second request cannot race the first into duplicate UI mutation
- callback checks token before applying
- completion clears in-flight state only for the matching request
- cancellation/invalidation is idempotent

---

# 7. Audit focus C — world-map/controller input routing

The current file contains accumulated world-map input patches.

Investigate specifically:

- `handleKey()`
- `nav()`
- `stageSelectMoveFromKey()`
- `eduniWorldMapConsumeKey()`
- `eduniWorldMapKeyV20_8()`
- `dispatchKeyEvent()`
- `onKeyDown()`
- `onKeyUp()`
- generic motion / HAT routing

## Suspicious code that must be explained

Current source contains a form of:

```java
boolean stageSelectMoveFromKey(int code, boolean dn) {
    if (eduniWorldMapConsumeKey(code, dn)) return true;
    if (stageSelectMoveFromKey(code, dn)) return true;
    ...
}
```

This looks recursively self-calling.

Do not assume it is a production bug until call reachability is established.

Required:

1. identify every call site
2. determine whether the function is reachable
3. if reachable, prove failure and fix
4. if dead, remove or safely neutralize dead recursion if doing so is low-risk
5. add regression test preventing reintroduction

Also inspect `nav()` for duplicated `showStageSelect` branches.

Consolidate only proven/dead duplicated routing.
Do not rewrite the whole input system.

---

# 8. Audit focus D — stage/reset state invariants

The runtime currently coordinates several flags:

- `showStartScreen`
- `showStageSelect`
- `eduniStagePlayingV20_10`
- `stageCompleteShown`
- `stageInputLock`
- `mode`
- `quiz`
- `campEncounter`
- movement/input state

Focus only on transition correctness for:

- intro -> world map
- world map -> selected stage
- stage -> completion
- next stage
- reset
- return to world map
- Activity pause/resume

Define a compact list of valid invariants.

Examples:

- active stage should not simultaneously be world-map-active
- reset must clear movement sources
- stage change must invalidate pending quiz request
- world map must not accept field action as bird interaction
- stage completion input lock must not leak movement/action into next state

Do **not** convert the full runtime to a large enum/FSM in this task.

A small pure `JungleRuntimeGuard` / `JungleSessionState` helper is acceptable only if it reduces risk and is covered by tests.

---

# 9. Network progress events

`postProgress()` and `postQuizAttemptDetailed()` run background threads.

Do not redesign telemetry/network behavior.

But inspect whether they read mutable runtime state from the background thread after the event was initiated.

If payload fields can drift because they are read later:

- snapshot the required event data on the game thread before starting the background thread

Do not block gameplay.
Do not introduce synchronization-heavy code.

This is secondary to quiz/session race safety.

---

# 10. Required implementation philosophy

Prefer small testable helpers.

Examples only:

- `JungleSessionEpoch`
- `JungleQuizRequestGuard`
- `JungleLoopGuard`

Do not create all three automatically.

Create only what audit evidence justifies.

Target:

- 1–3 small helpers maximum
- minimal edits to `NativeJungleActivity`
- no broad rewrite

If a hazard is already correctly guarded, leave it alone and document it.

---

# 11. Deterministic tests

Add JVM tests for every changed reliability mechanism.

## Quiz request/session guard

Must test at least:

- first request accepted
- second concurrent request rejected or superseded deterministically
- matching response accepted once
- duplicate response rejected
- reset invalidates response
- stage switch invalidates response
- pause/close invalidates response if applicable
- old response cannot clear a newer request
- repeated invalidate is safe

## Tick lifecycle

If a helper is introduced, test:

- resume twice -> one logical scheduled loop
- pause -> inactive
- resume again -> one active loop
- stop/destroy -> inactive
- repeated stop is safe

If no helper is needed, create focused wiring/source tests proving the current single-loop contract and any added destroy cleanup.

## Input routing

Test:

- no recursive self-call remains in reachable world-map path
- one D-pad press produces one world-map selection change
- key-up is consumed without another move
- field actions do not leak while world map active
- repeated key events remain appropriately guarded

---

# 12. Stress tests

Use deterministic JVM/pure tests.

Do not waste time on random sleeps.

Required minimum:

### Session/quiz guard

At least **500 deterministic state transitions** covering combinations of:

- start request
- duplicate start
- reset
- stage change
- response
- duplicate response
- invalidate

Assert:

- at most one accepted response per valid request
- zero accepted stale responses
- no in-flight state leak

### Lifecycle

At least **200 resume/pause/stop sequences**.

Assert:

- logical loop count never exceeds 1
- stopped state has no owned loop

### Input

At least **100 repeated world-map key sequences**.

Assert:

- exactly one stage movement per intended press
- no recursion/stack overflow path
- no double selection movement

Use fixed deterministic sequences or fixed seed.

---

# 13. Static/source cleanup allowed

Astra may remove clearly dead/duplicated Jungle runtime code when all are true:

- exact replacement path exists
- tests prove behavior
- no external call site
- diff stays narrow

Good candidates to investigate:

- recursive/dead `stageSelectMoveFromKey`
- repeated `showStageSelect` branches in `nav()`
- obsolete duplicated world-map input path

Do not delete large patch history merely because it looks ugly.

---

# 14. Runtime acceptance without physical device

No physical Android device is available.

Do not:

- run adb install
- start an emulator unless one already exists and starts instantly
- spend significant time configuring device infrastructure

Required validation is JVM/build/source based.

If a lightweight desktop JVM harness can exercise pure helpers, use it.

---

# 15. Android validation

From `eduni-android-portal` run:

```powershell
.\gradlew.bat --no-daemon testDebugUnitTest
```

Then:

```powershell
.\gradlew.bat --no-daemon assembleDebug
```

Record exact test counts if available.

APK installation is NOT required.

---

# 16. Repository validation

Run:

```powershell
python scripts/validate_content.py
python -m unittest discover -s tests
git diff --check
```

Use the repository-appropriate working directories.

Record known baseline failures separately.

Any new Jungle regression is blocking.

---

# 17. Diff scope

Expected changed product files should remain Jungle-only.

Allowed likely files:

- `NativeJungleActivity.java`
- 1–3 new small Jungle reliability helper classes
- Jungle JVM tests

Allowed docs:

- Prompt 39B report
- Prompt 40B verifier

Do not modify:

- Bubble Shooter
- Baduk
- Space
- Portal
- Docker/compose
- production configs
- unrelated Android games

---

# 18. Report

Create:

`EDUNI_JUNGLE_RUNTIME_RELIABILITY_REPORT_39B.md`

Include:

## Proven findings

For each issue:

- exact code path
- classification: PROVEN / PLAUSIBLE / NOT PRESENT
- reproduction/test
- fix or reason left unchanged

Must explicitly cover:

- tick lifecycle
- repeated quiz request
- stale quiz callback after reset/stage switch
- pause/exit behavior
- world-map recursion suspicion
- duplicated world-map routing
- mutable network-event snapshot risk

## Implementation

- helper classes introduced
- NativeJungleActivity changes
- why the abstraction is minimal

## Stress

Exact totals:

- quiz/session stress
- lifecycle stress
- input stress

## Regression

- JVM tests
- assembleDebug
- repository Python/content checks
- diff-check

## Compatibility

Confirm unchanged:

- stages
- progression
- movement
- collision
- rewards
- persistence schema
- visuals
- API contracts

## Remaining risks

Concrete only.

---

# 19. Final verdict

Use exactly one:

- `JUNGLE RELIABILITY PASS — READY FOR INDEPENDENT VERIFY`
- `PARTIAL PASS — CRITICAL RACES FIXED`
- `BLOCKED`
- `FAIL`

Do not call it merge-ready yet.

---

# 20. Independent verification

If verdict is PASS or PARTIAL PASS, create:

`.agent/PROMPT_EDUNI_JUNGLE_RUNTIME_RELIABILITY_VERIFY_40B.md`

Prompt 40B is verification-only.

It must independently verify:

- every reported PROVEN hazard
- stale quiz response rejection
- duplicate quiz-request behavior
- lifecycle single-loop behavior
- world-map input exactly-once behavior
- no recursive reachable input path
- stress totals
- full Android JVM/build regression
- no non-Jungle product diff
- base behind_by=0

Do not merge.
Do not deploy.

---

# 21. Final response format

Keep the final Astra response concise:

```text
<VERDICT>

PR: <url>
Branch: <branch>
SHA: <sha>

Proven hazards:
- ...

Fixes:
- ...

Stress:
- quiz/session: X/X
- lifecycle: X/X
- input: X/X

Android:
- JVM: ...
- assembleDebug: ...

Remaining risks:
- ...
```
