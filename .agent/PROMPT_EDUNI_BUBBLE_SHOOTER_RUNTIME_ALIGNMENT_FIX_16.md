# EDUNI Bubble Shooter — Runtime/Test Alignment Fix

Work only on branch:

`feature/bubble-shooter-audit-fix`

Base branch:

`feature/eduni-space-mvp`

PR:

`#63 WIP: stabilize Bubble Shooter gameplay and mobile aiming`

Do **not** merge automatically.

## 0. Current finding to close

Prompt 14 fixed the core gameplay bug in the served inline runtime, but the new shared module:

`nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`

is not actually used by the live `/bubble-shooter` runtime. The current Python integration test only proves that the file exists and exports functions; it does **not** prove that the served page executes that same implementation.

This recreates the exact class of defect previously fixed in Baduk: unit tests can pass against a parallel implementation while the live page uses separate inline logic.

The goal of this task is to make the tested shared logic and the served runtime the same implementation, with minimal changes.

## 1. Sync the feature branch first

The feature branch is currently behind `feature/eduni-space-mvp` by one commit because the base received the Baduk deploy-sync prompt after this branch was created.

Before editing:

```bash
git fetch origin
git checkout feature/bubble-shooter-audit-fix
git status
git merge --no-edit origin/feature/eduni-space-mvp
```

A clean rebase is also acceptable if that is the established workflow, but do not rewrite unrelated history unnecessarily.

Record:

- branch before sync,
- HEAD before sync,
- base HEAD,
- resulting HEAD after sync.

Do not discard Prompt 14 implementation changes.

## 2. Read minimum relevant files

Read:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_AUDIT_FIX_14.md`
- `nice-gui-1-1-7/app.py`
  - `SHOOTER_HTML_TEMPLATE`
  - `shooter_html()`
  - `/bubble-shooter`
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`
- `nice-gui-1-1-7/tests/bubble_shooter_logic.test.mjs`
- `nice-gui-1-1-7/tests/test_bubble_shooter_integration.py`
- `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`

Do not broaden the task into other games.

## 3. Required runtime architecture

The live `/bubble-shooter` page must execute `EDUNIBubbleShooterLogic` from `eduni_bubble_shooter_logic.js` for the rules that are covered by the shared module.

At minimum, the runtime must use shared logic for these contracts where applicable:

- correct vs miss outcome / pressure decision,
- target selection,
- danger decision,
- pointer/CSS -> logical coordinate conversion,
- stale generation validation.

It is acceptable to keep DOM/canvas mutation in `app.py`, but the **decision logic** tested by Node must not be duplicated independently in the inline script.

Preferred approach:

1. `shooter_html()` reads the shared JS file from `portal_app/static_games/`.
2. Inject that exact script into the generated Shooter HTML before the main inline game script executes.
3. The inline game script calls `window.EDUNIBubbleShooterLogic` for the shared decisions.
4. If the shared asset cannot be loaded, fail safe with a working game rather than a half-patched runtime. Document the fallback.

Do not add external dependencies or network script loading.

## 4. Preserve Prompt 14 gameplay contract

Do not regress these already verified rules:

### Correct

- remove exactly the hit correct bubble,
- +100 exactly once,
- no pressure bubble,
- praise exactly once,
- next target remains playable,
- clearing last bubble produces success once.

### Miss

- no score,
- no target removal,
- add exactly one pressure bubble,
- continue unless danger line crossed.

### Restart safety

- `startGame()` invalidates old delayed praise continuation,
- restarting during praise must not allow the old timeout to add pressure, change target, alter score, or change game-over state in the new game.

## 5. Critical integration tests

Update `tests/test_bubble_shooter_integration.py` so it no longer has a misleading test that only checks the shared file exists.

The test suite must prove all of the following:

1. `shooter_html()` injects or otherwise serves the contents of `eduni_bubble_shooter_logic.js`.
2. Generated/live Shooter HTML contains `EDUNIBubbleShooterLogic` before runtime calls it.
3. Runtime code actually calls shared functions, not just defines the module.
4. Correct flow derives pressure/score outcome from shared logic.
5. Target selection calls shared `selectTarget` or equivalent shared function.
6. Danger check calls shared `isDanger` or equivalent.
7. Pointer coordinate path calls the shared coordinate helper if that helper remains part of the module.
8. Generation timeout validation calls shared `isGenerationValid` if that helper remains part of the module.
9. If any helper is intentionally removed from the shared module, remove its Node-only parallel test too and explain why. Do not leave dead test-only abstraction.

The integration test should preferably call `shooter_html()` and inspect the actual generated page, not merely search the source file for filenames.

## 6. Node tests

Keep `tests/bubble_shooter_logic.test.mjs` focused on the exact shared module that the runtime now executes.

Retain coverage for:

- correct => +100, no pressure,
- miss => pressure once,
- clear outcome,
- live/front target selection,
- danger,
- coordinate conversion,
- generation validity,
- no mutation/double-application surprises where relevant.

If the runtime integration requires a small API adjustment, update both runtime and tests together.

## 7. Report metadata bug

`BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md` currently lists the Prompt 14 instruction commit as the verified commit.

Fix the report after implementation/verification so `Verified commit` points to the actual latest implementation commit that was tested.

Do not claim `MERGE READY` until the runtime/test alignment and final browser verification pass.

## 8. PR/base state

Before final verification, confirm PR #63 is no longer behind the latest base in a way that blocks merge.

Report:

```text
base HEAD:
feature HEAD:
merge-base:
ahead_by:
behind_by:
mergeable:
```

Do not solve a mergeability issue by dropping unrelated base changes.

## 9. Required automated validation

Run:

```bash
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

Report exact pass/fail/skip counts.

Known unrelated Windows `cp949` failures may be separated if reproduced and clearly pre-existing; do not hide them.

## 10. Browser verification — real served runtime

Run the actual app and verify `/bubble-shooter` from the served page, not a standalone test harness.

Required viewports:

- desktop ~1280x800,
- portrait 360x800,
- landscape ~800x360.

Verify:

1. no console/runtime error,
2. prompt target exists among live bubbles,
3. correct hit => one removed, +100, zero pressure,
4. miss => zero score, exactly one pressure,
5. restart during praise remains clean after old timeout would have fired,
6. multiple consecutive correct answers visibly reduce bubble count,
7. clear succeeds,
8. danger/game-over still works,
9. aiming remains accurate near center and edges,
10. resize/orientation does not drift coordinates.

Additionally use browser/devtools or runtime inspection to prove the served page has:

`window.EDUNIBubbleShooterLogic`

and that the gameplay path invokes the shared runtime implementation.

Do not mark runtime alignment PASS merely because the global exists.

## 11. Android scope

Do not redesign `NativeBubbleShooterActivity` in this task.

Only re-check that Prompt 14 core parity remains true:

- correct = no pressure,
- miss = pressure,
- +100 once,
- restart safe.

Question-data unification stays deferred to Phase 2.

## 12. Completion report

Update or append to:

`BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`

Add a section:

`Runtime/Test Alignment Closure`

Include:

- exact tested commit,
- base sync result,
- how the shared JS is injected/loaded,
- exact shared functions used by live runtime,
- automated test counts,
- browser counts by viewport,
- console error count,
- PR mergeability state,
- remaining risks,
- recommendation: `MERGE READY` or `DO NOT MERGE`.

## Acceptance criteria

PASS only if:

- Node tests and `/bubble-shooter` execute the same decision implementation,
- integration tests prove actual generated-page wiring,
- correct/miss progression still matches Prompt 14,
- stale restart callback remains blocked,
- mobile aiming still passes,
- latest base is integrated cleanly,
- report verified SHA is correct,
- full validation is acceptable,
- PR #63 is mergeable or the only remaining blocker is explicitly external/non-code.

If the shared module remains test-only while runtime continues separate inline decision logic, overall result is **FAIL / DO NOT MERGE**.
