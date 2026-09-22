# EDUNI Runtime Reliability Core — Astra Deep Task (Prompt 39)

## Mission

Use Astra for a high-reasoning, time-boxed reliability task across EDUNI.

This is **not** a UI task.
This is **not** a broad refactor for its own sake.
This is **not** a production deployment task.

The goal is:

> Audit the state / timer / callback / restart / restore control flow of four representative EDUNI games, derive the smallest proven runtime-reliability abstraction, apply it to **Bubble Shooter + Baduk only**, and stress-test race conditions hard enough to justify the abstraction.

The four audit targets are:

1. Bubble Shooter
2. Baduk
3. Space
4. Jungle

Only Bubble Shooter + Baduk may receive product-code migration in this task.

Space + Jungle are **audit-only** and must remain behavior/code unchanged except for optional tests/docs that do not alter runtime.

---

# 0. Time / token budget — important

This task is intentionally designed for roughly:

- one focused Astra session
- about 30 minutes of execution
- up to roughly 60% of the available Codex budget

Do not spend the budget on exhaustive repository reading.

Priority order:

1. real control-flow audit
2. concrete hazard discovery
3. minimal shared reliability design
4. Bubble Shooter + Baduk implementation
5. stress / adversarial tests
6. concise documentation

Do not spend more than ~20% of effort on prose/reporting.

If time becomes constrained, preserve this priority:

**working code + stress tests > architecture prose > migration roadmap**

---

# 1. Repository / branch rules

Repository:

`JongPyoShin/eduni-links`

Base branch:

`feature/eduni-space-mvp`

Base SHA at prompt creation:

`ea65c3029b466e73e110b4e149bdf2468338f859`

Before creating a branch:

```powershell
git fetch --all --prune
git rev-parse origin/feature/eduni-space-mvp
```

If the remote base has advanced, use the **current remote base**, not the historical SHA above.

Create:

`feature/eduni-runtime-reliability-core`

Create a Draft PR targeting:

`feature/eduni-space-mvp`

Suggested title:

`WIP: EDUNI runtime reliability core — Bubble + Baduk reference integration`

Do not merge.

Do not deploy.

Do not touch production 8081/8080.

---

# 2. Important parallel-work boundary

Bubble Shooter Phase 3 currently exists separately in PR #67:

`feature/bubble-shooter-phase3-visible-ux`

Do **not** stack this reliability task on PR #67.

Do not cherry-pick Phase 3 UX work into this branch.

Do not modify PR #67.

This task starts from the current `feature/eduni-space-mvp` base.

If Phase 3 is merged into the base before this task begins, preserve the merged behavior and work from the then-current base.

The reliability abstraction must be compatible with later Phase 3 composition, but Phase 3 UX is not part of this task.

---

# 3. Read instructions first

Read:

- root `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`

Then perform **targeted exploration only**.

Do not scan the whole repository.

---

# 4. Audit targets — exact starting points

## A. Bubble Shooter

Start with:

- `nice-gui-1-1-7/app.py`
  - `SHOOTER_HTML_TEMPLATE`
  - `startGame()`
  - `handleHit()`
  - `missShot()`
  - `showPraise()`
  - `finishGame()`
  - generation / delayed callbacks
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`
- current Bubble Shooter tests

Known control mechanisms already present:

- `state.generation`
- delayed praise callback
- requestAnimationFrame loop
- restart
- `waiting`
- `gameOver`
- shot state

Do not assume these are wrong.
Trace actual transition ownership.

## B. Baduk

Start with:

- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py`
- `nice-gui-1-1-7/portal_app/baduk_endgame_safety.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js`
- Baduk persistence/runtime tests

Known existing reliability logic includes:

- `aiGeneration`
- `aiTimer`
- `invalidateAi()`
- `scheduleAi()`
- undo snapshots
- reset
- save / restore
- AI-turn restore behavior
- pass / resignation endgame paths

Again: do not replace proven logic merely to create a shared abstraction.

## C. Space — audit only

Start with:

- `nice-gui-1-1-7/portal_app/static_games/eduni_space.html`
- `nice-gui-1-1-7/portal_app/space_routes.py`
- corresponding tests

Audit:

- state ownership
- round/question transition
- restart/new-game behavior
- localStorage persistence
- timers / async callbacks if present
- duplicate input risks
- stale callbacks if present

Do not migrate Space in Prompt 39.

## D. Jungle — audit only

Prefer current canonical runtime on the base branch.

For Native Android Jungle, inspect only targeted control-flow files such as:

- `eduni-android-portal/app/src/main/java/com/eduni/portal/NativeJungleActivity.java`
- `EncounterDirector.java`
- relevant input/state/persistence helpers actually referenced by the runtime

Audit:

- state machine ownership
- handler/timer/callback ownership
- pause/resume
- input duplication
- persistence / restore
- encounter transition invalidation
- delayed callbacks if any

Do not migrate Jungle in Prompt 39.

Do not revisit old experimental Jungle branches.

---

# 5. First deliverable: four-game reliability map

Before implementing a shared core, produce a compact internal audit table.

For each game identify:

- authoritative state owner
- lifecycle/reset entry point
- timer sources
- async callback sources
- animation-loop ownership
- persistence/save source
- restore source
- input gates
- terminal/game-over state
- generation/version token if any
- current cancellation mechanism
- possible stale-callback surface
- possible duplicate-transition surface

Classify each concrete hazard:

- `PROVEN`
- `PLAUSIBLE`
- `NOT PRESENT`

Do not call something a bug only because the code looks complex.

A `PROVEN` hazard needs one of:

- deterministic test reproduction
- browser reproduction
- direct code path showing an unavoidable invalid transition

A `PLAUSIBLE` hazard needs an exact interleaving/path.

---

# 6. Architecture decision gate

After the four-game audit, decide whether a shared reliability core is justified.

The target concept may resemble:

- generation / epoch guard
- timer registry
- lifecycle invalidation
- guarded delayed callback
- guarded one-shot transition

Possible names:

- `GameSessionGuard`
- `GenerationGuard`
- `TimerRegistry`
- another smaller design

These names are suggestions, not requirements.

## Hard rule

Do **not** introduce a large generic `GameSession` framework unless the actual audit proves that both Bubble Shooter and Baduk benefit.

Prefer the smallest primitive that removes duplicate reliability logic.

A good result may be only 50–150 lines of shared pure JS plus thin adapters.

A bad result is a 500-line framework that hides game semantics.

---

# 7. Required invariants for the shared core

If a shared core is implemented, it must provide explicit, testable semantics for at least:

### Epoch / generation

- current epoch can be read
- reset/invalidate advances epoch
- callback can capture epoch
- stale callback is rejected

### Timers

If timer ownership is included:

- scheduled timer can be associated with current epoch
- reset/invalidate cancels owned timers where practical
- callback also re-checks epoch when it fires
- firing/cancel is idempotent
- no double execution

### Lifecycle

Must support the required reliability use cases without knowing game-specific rules:

- new game / restart
- undo or state replacement
- restore
- terminal state

Do not encode Bubble-specific or Baduk-specific gameplay into the core.

---

# 8. Bubble Shooter reference integration

Apply the minimal core to Bubble Shooter.

Preserve all current base behavior.

Required proof:

- correct hit +100
- correct hit no pressure bubble
- miss exactly one pressure bubble
- restart invalidates pending delayed continuation
- stale praise/continuation cannot mutate restarted game
- requestAnimationFrame loop remains single-owner
- no extra animation loop after restart
- no double attempt / double pressure side effects
- no change to canonical 122-entry dataset
- no change to route contracts

Replace duplicated manual generation/timer logic only where the new core is clearly safer.

Do not redesign UI.

Do not pull Phase 3 UX into this branch.

---

# 9. Baduk reference integration

Apply the same reliability primitive to Baduk only if it preserves or improves existing semantics.

The following must remain correct:

- human move -> exactly one AI response
- repeated clicks during AI turn do not queue duplicate AI moves
- new game cancels old AI
- undo cancels old AI
- restore cannot allow stale pre-restore AI callback
- save remains consistent
- restored AI turn schedules exactly one AI response
- pass/endgame/resignation transitions do not duplicate
- hint/rules do not mutate the game
- board-size/level/mode switches cannot receive old callbacks

Do not weaken the already-proven `aiGeneration` / `aiTimer` guarantees.

If the shared core cannot improve Baduk without increasing risk, stop migration and document why.

A principled **“Bubble uses shared core; Baduk retains local core because semantics differ”** is acceptable only with strong evidence.

But attempt a real shared design first.

---

# 10. Do not migrate Space or Jungle

For Space and Jungle, produce migration notes only:

For each:

- reusable core fit: HIGH / MEDIUM / LOW
- exact integration points
- blockers
- expected benefit
- what must remain game-specific

Do not modify their runtime source.

This keeps the 30-minute scope bounded.

---

# 11. Adversarial / stress testing — major part of the task

Spend meaningful budget here.

## Shared core pure stress

Create deterministic tests covering at least:

- 1,000 epoch invalidations
- stale callbacks from many old epochs
- repeated cancel
- repeated invalidate
- callback fires after cancel attempt
- multiple timers in same epoch
- reset during callback scheduling
- terminal/invalidate ordering

No random-only test without seed/reproducibility.

If fuzz/property-style tests are used, print/retain the seed on failure.

## Bubble stress

Run a deterministic or semi-deterministic stress harness for at least:

- 100 restart/callback interleavings
- repeated correct -> immediate restart
- miss -> restart
- restart while feedback/praise delay pending
- repeated restart clicks

Assert:

- one current epoch
- no stale mutation
- no duplicate pressure
- no duplicate score
- no growing timer leak

## Baduk stress

Cover at least:

- 100 schedule/invalidate/undo/reset interleavings
- repeated AI schedule requests
- new game during pending AI
- undo during pending AI
- restore during pending AI
- AI callback after invalidation
- repeated pass/endgame edge transitions where feasible

Assert:

- max one valid AI callback per AI turn
- no stale board mutation
- no duplicate AI move
- timer ownership returns to zero when expected

If 100 browser-level loops are too expensive, use pure/runtime harnesses for the bulk and headed browser for focused acceptance.

---

# 12. Browser validation

Use an isolated local/test server only.

Do not touch production.

## Bubble Shooter

Desktop:

- 1280×800

Mobile:

- 360×800

Minimum live checks:

- page loads
- correct flow
- miss flow
- restart during pending delayed callback
- repeated restart
- no console errors
- no page errors
- no duplicate visible side effect

## Baduk

At minimum:

- 9×9 AI game
- one human move -> exactly one AI move
- rapid extra click during AI turn
- undo during/after AI scheduling
- new game during pending AI
- no stale AI move afterward
- no console errors

Use existing reliable browser interaction patterns.

---

# 13. Existing regression suites

Run focused tests during implementation.

Before final commit run the repository-required validations.

## Bubble / Web

Run existing Bubble unit/contract/integration/route suites.

## Baduk

Run all focused Baduk runtime/persistence/coach/endgame tests relevant to changed code.

## Android

Because Jungle audit reads Android code but does not modify it, run existing Android JVM tests if the environment permits within the time budget.

If Android build is too costly after all source validation is already clean, at minimum run the focused tests for any shared files that Android could consume. However, if Android source is changed accidentally, full JVM validation becomes mandatory.

## Repository validation

From repo root:

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

Record known baseline failures separately.

Any new Bubble/Baduk regression is blocking.

---

# 14. Performance / complexity guardrails

The shared core must not:

- add polling
- add background workers
- add network calls
- add external dependencies
- create a second animation loop
- create global listeners that games cannot dispose
- change persistence schema without necessity
- change user-visible gameplay
- touch production

Prefer:

- pure small helper
- explicit ownership
- deterministic tests
- thin integration adapters

Measure or at least inspect timer/listener counts before/after where possible.

---

# 15. Scope guardrails

Do not modify:

- Bubble canonical question dataset
- Phase 3 branch / PR #67
- Space runtime
- Jungle runtime
- production Docker/compose
- portal unrelated UI
- unrelated Android UI
- unrelated Baduk features

No broad formatting.

No mass renames.

No dependency upgrade.

---

# 16. Required report

Create:

`EDUNI_RUNTIME_RELIABILITY_CORE_REPORT_39.md`

It must include:

## A. Four-game audit table

Bubble / Baduk / Space / Jungle:

- lifecycle
- timers
- callbacks
- persistence
- input gating
- proven/plausible hazards

## B. Architecture decision

- exact shared primitive chosen
- why
- alternatives rejected
- what intentionally remains game-specific

## C. Integration

Bubble:

- before
- after
- removed duplicate reliability logic
- compatibility proof

Baduk:

- before
- after
- compatibility proof

## D. Stress results

Exact counts:

- shared core
- Bubble
- Baduk
- browser

## E. Regression totals

- JS
- Python
- Baduk focused
- Android if run
- full discovery
- content validation
- diff-check

## F. Migration notes

Space:
- fit
- exact future integration points

Jungle:
- fit
- exact future integration points

## G. Complexity

Report:

- shared-core LOC
- net product LOC delta
- duplicate generation/timer code removed
- any remaining duplicated lifecycle logic

## H. Remaining risks

Concrete only.

---

# 17. Final verdict

Use exactly one:

- `RUNTIME RELIABILITY PASS — READY FOR INDEPENDENT VERIFY`
- `PARTIAL PASS — SHARED CORE PROVEN, MIGRATION LIMITED`
- `BLOCKED`
- `FAIL`

Do not claim merge-ready in Prompt 39.

---

# 18. Prepare independent verifier

If implementation reaches either PASS or PARTIAL PASS, create:

`.agent/PROMPT_EDUNI_RUNTIME_RELIABILITY_VERIFY_40.md`

Prompt 40 must be verification-only.

It must independently verify:

- four-game audit claims
- shared-core semantics
- Bubble behavior
- Baduk exactly-one-AI semantics
- restart/undo/restore race safety
- stress tests
- no Space/Jungle runtime changes
- no Phase 3 contamination
- no unrelated diff
- base behind_by=0

Prompt 40 must not merge or deploy.

---

# 19. Commit / push rules

Commit implementation, tests, report, and Prompt 40 to:

`feature/eduni-runtime-reliability-core`

Push the branch.

Keep PR Draft.

Do not merge.

Do not deploy.

Final response should be concise and include only:

- verdict
- PR URL
- branch
- final SHA
- changed product files
- key hazards found
- shared abstraction chosen
- stress counts
- regression totals
- remaining risks
