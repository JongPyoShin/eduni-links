# EDUNI Bubble Shooter — Final Base Sync + Merge Verification (Prompt 21)

Work only on branch:

`feature/bubble-shooter-audit-fix`

Base branch:

`feature/eduni-space-mvp`

Do not merge automatically.

## Context

Prompt 16 closed the runtime/test alignment blocker at commit `d263a5c6b406fef21b607323560ca07b63f89ab9`.

At that time the implementation had:

- shared `EDUNIBubbleShooterLogic` injected before the inline game script,
- live runtime delegation through `const L = window.EDUNIBubbleShooterLogic`,
- `resolveShot`, `isDanger`, `selectTarget`, `pointerToCss`, `isGenerationValid` used by served `/bubble-shooter`,
- JS 19/19,
- Python integration 15/15,
- routes 7/7,
- browser QA 48/48,
- zero console errors.

After that verification, the base branch advanced with three Baduk instruction-only commits (Prompts 17–19). Therefore the Bubble Shooter branch is now behind current base even though no Bubble Shooter code blocker is known.

## 1. Sync latest base

Fetch latest refs and report:

```bash
git fetch origin
git checkout feature/bubble-shooter-audit-fix
git status --short --branch
git rev-parse HEAD
git rev-parse origin/feature/eduni-space-mvp
git merge-base HEAD origin/feature/eduni-space-mvp
```

Merge the latest base into the feature branch using a normal merge. Do not squash or rebase published history unless explicitly required.

Expected current base is `4a37891300815446fb2d949b1989f28cafef9272` or later.

Resolve no conflict by deleting Bubble Shooter work. If a real code conflict appears, stop and report it.

## 2. Confirm PR diff scope

After sync, compare feature to base.

The PR diff should remain limited to Bubble Shooter work plus its prompt/report files:

- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_AUDIT_FIX_14.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_RUNTIME_ALIGNMENT_FIX_16.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_FINAL_SYNC_VERIFY_21.md`
- `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`
- `nice-gui-1-1-7/tests/bubble_shooter_logic.test.mjs`
- `nice-gui-1-1-7/tests/test_bubble_shooter_integration.py`

No Baduk implementation file should become a PR-specific diff merely because the base was merged.

## 3. Deterministic restart-race browser verification

This is the only remaining Prompt 14 browser case that was not fully exercised previously.

Use the actual served `/bubble-shooter` page and perform a deterministic correct-hit sequence. Do not rely on random shooting.

Required sequence:

1. Start a fresh game.
2. Identify the current requested Hanja and its exact matching live bubble.
3. Fire a shot that definitely produces a correct hit.
4. Confirm praise/delayed continuation has started.
5. Before the 980 ms praise timeout completes, press `다시 시작` / restart.
6. Wait at least 1.5 seconds, longer than the old callback delay.
7. Verify the restarted game remains unchanged by the old callback:
   - score remains the restarted value,
   - no extra pressure bubble appears,
   - current target remains valid,
   - no stale praise continuation changes the new game,
   - no console error.
8. Repeat once more to prove it is reproducible.

This must use the served runtime path that calls `L.isGenerationValid()`; source inspection alone is not sufficient.

If deterministic aiming is hard through pointer automation, use the app's own runtime objects/coordinates only to identify and execute the same real hit flow. Do not bypass `showPraise()` or call `isGenerationValid()` directly as a substitute for gameplay.

## 4. Focused regression after base sync

Run:

```bash
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python scripts/validate_content.py
cd ..
git diff --check
```

Expected minimum:

- JS 19/19 PASS
- integration 15/15 PASS
- routes 7/7 PASS
- validate_content VALID
- diff check clean

Then run the full Python discovery once. Existing Windows cp949 failures may remain, but identify them precisely and prove no new Bubble Shooter failure was introduced.

## 5. Quick viewport smoke

Because Prompt 16 already ran full 48/48 browser QA, a full duplicate run is not required unless the base merge touched runtime code.

At minimum smoke the served page at:

- desktop ~1280x800
- portrait 360x800
- landscape 800x360

Confirm:

- page loads,
- shared global exists,
- one correct hit works,
- one miss works,
- no horizontal overflow,
- zero console errors.

If base sync creates any runtime conflict or modifies `app.py`, rerun the full 48-check matrix instead.

## 6. Report cleanup

Update `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md` so the final section reflects the actual final verified feature HEAD after this sync.

Also clean stale/contradictory metadata where practical:

- integration count should be 15, not the old 11,
- full-discover count should match the latest run,
- final verified SHA must be the actual final verification commit,
- explicitly state the deterministic restart-race result,
- state current `ahead_by / behind_by` versus base.

Do not claim `MERGE READY` unless behind_by is 0 and the deterministic restart-race browser case passes.

## 7. PR metadata

Update PR #63 body if needed so it no longer shows stale 11-test counts or malformed control characters.

Keep PR Draft during verification.

Final verdict must be exactly one of:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL — DO NOT MERGE`

Do not merge automatically.
