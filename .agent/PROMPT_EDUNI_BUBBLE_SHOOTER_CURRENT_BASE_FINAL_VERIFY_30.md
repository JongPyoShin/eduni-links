# EDUNI Bubble Shooter PR #63 — Current Base Sync + Final Merge-Readiness Verification (Prompt 30)

## Objective

Bring PR #63 up to the **current** `feature/eduni-space-mvp` base, preserve all Bubble Shooter Phase 1 work, resolve only legitimate sync conflicts, then rerun focused automated + browser verification and produce a final merge-readiness verdict.

Do **not** merge PR #63 automatically.

Repository:

`JongPyoShin/eduni-links`

Feature branch:

`feature/bubble-shooter-audit-fix`

PR:

`#63 — Bubble Shooter: stabilize gameplay, shared logic, and mobile aiming`

Base branch:

`feature/eduni-space-mvp`

At Prompt creation time:

- feature head: `4c68f7f6120f473655451ddcb6e6d70971b84aa9`
- base head: `94a251c73e7893f39d8e250f2157e15b7a0c3547`
- comparison: ahead 8 / behind 37
- PR is open and mergeable, but **not current with base**

The exact base SHA may advance after this prompt is committed. Always use the current remote `origin/feature/eduni-space-mvp` at execution time.

---

## Existing Bubble Shooter Phase 1 contract

The feature branch is intended to preserve these behaviors:

1. Correct answer:
   - awards the correct score
   - removes the hit bubble
   - does **not** immediately add a replacement pressure bubble

2. Miss / wrong hit:
   - adds exactly one pressure bubble
   - does not accidentally add multiple bubbles

3. Restart race:
   - stale praise/delayed callbacks from the previous game cannot mutate a restarted game
   - generation/token protection remains active

4. Shared runtime logic:
   - served `/bubble-shooter` injects and uses `EDUNIBubbleShooterLogic`
   - runtime delegates through the shared logic instead of silently duplicating divergent logic

5. Mobile aiming:
   - pointer/touch coordinates remain correct on portrait and landscape
   - no horizontal overflow or unusable controls

6. Existing routes remain compatible.

Previously verified historical evidence included:

- JS Bubble Shooter logic: 19/19
- Python Bubble Shooter integration: 15/15
- browser QA matrix: 48/48
- deterministic restart-race browser verification
- zero new Bubble Shooter console errors

Those results are historical evidence only. This Prompt must verify the **post-sync current HEAD**.

---

# 1. Read repository instructions

Before modifying the branch, read and obey:

- root `AGENTS.md`
- any relevant nested `AGENTS.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_AUDIT_FIX_14.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_RUNTIME_ALIGNMENT_FIX_16.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_FINAL_SYNC_VERIFY_21.md`
- `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`

Also note that the base now contains later Baduk work. Do not remove or regress unrelated Baduk functionality while resolving Bubble Shooter sync.

---

# 2. Confirm exact refs before sync

Run equivalent commands:

```powershell
git fetch --all --prune
git checkout feature/bubble-shooter-audit-fix
git status --short --branch
git rev-parse HEAD
git rev-parse origin/feature/bubble-shooter-audit-fix
git rev-parse origin/feature/eduni-space-mvp
git merge-base HEAD origin/feature/eduni-space-mvp
```

Record:

- local feature HEAD
- remote feature HEAD
- current base HEAD
- ahead/behind counts

The feature worktree must not contain unrelated tracked modifications.

Known local runtime logs under:

`nice-gui-1-1-7/work/*.log`

must never be deleted merely to obtain a clean status. The latest base intentionally ignores those runtime logs. Preserve them if present.

If there are any **other** local tracked/untracked files that could be overwritten by sync, stop and report them before changing history.

---

# 3. Sync current base into PR #63

Because this is a published feature branch, use a normal merge from the current base.

Preferred shape:

```powershell
git merge origin/feature/eduni-space-mvp
```

Do not:

- rebase published history
- squash the Bubble Shooter commits
- reset --hard
- discard unrelated base work
- resolve conflicts by simply choosing `ours` or `theirs` wholesale

## Conflict policy

If there is no conflict, continue.

If a conflict occurs, especially in `nice-gui-1-1-7/app.py`:

1. identify what the base changed
2. identify what Bubble Shooter changed
3. preserve both when they are logically independent
4. keep Bubble Shooter Phase 1 contract intact
5. keep all current base routes/features intact
6. make the smallest targeted resolution

If the conflict is ambiguous or requires redesign beyond Bubble Shooter, report it as a blocker instead of broad refactoring.

After resolving:

```powershell
git status --short
git diff --check
```

Commit the sync resolution normally.

Push `feature/bubble-shooter-audit-fix`.

---

# 4. Confirm post-sync PR diff scope

After the base merge, compare:

```powershell
git diff --name-status origin/feature/eduni-space-mvp...HEAD
```

The PR-specific diff should remain limited to Bubble Shooter implementation/tests/report/prompt files, primarily:

- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_AUDIT_FIX_14.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_RUNTIME_ALIGNMENT_FIX_16.md`
- `.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_FINAL_SYNC_VERIFY_21.md`
- this Prompt 30
- `BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`
- `nice-gui-1-1-7/tests/bubble_shooter_logic.test.mjs`
- `nice-gui-1-1-7/tests/test_bubble_shooter_integration.py`

If base-only Baduk implementation files appear as PR-specific changes, investigate the sync before proceeding.

Required final comparison:

- `behind_by = 0`

Do not call the PR merge-ready while it remains behind base.

---

# 5. Static served-runtime alignment

Before browser QA, inspect the actual served Bubble Shooter HTML/runtime.

Verify the current `/bubble-shooter` source still contains and uses:

- `EDUNIBubbleShooterLogic`
- shared logic script injection
- `const L = window.EDUNIBubbleShooterLogic`
- `L.resolveShot`
- `L.isDanger`
- `L.selectTarget`
- `L.pointerToCss`
- `L.isGenerationValid`

Verify the restart-generation mechanism remains present.

Verify the served runtime does **not** silently fall back to an obsolete path because a marker failed after the base merge.

If there is a fail-safe integration mechanism, prove the normal current source matches its expected markers.

---

# 6. Automated verification

From `nice-gui-1-1-7` run:

```powershell
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python scripts/validate_content.py
```

Then run:

```powershell
python -m unittest discover -s tests
```

From repo root:

```powershell
git diff --check
```

Expected focused minimum based on the prior implementation:

- Bubble Shooter JS: 19/19 PASS
- Bubble Shooter Python integration: 15/15 PASS
- route tests PASS
- content validation PASS
- diff-check PASS

For full discovery:

- classify every failure
- distinguish product regression from Windows cp949/subprocess environment issues
- no actual Bubble Shooter regression may be ignored

If current counts differ because the base added tests, report the actual counts rather than forcing historical totals.

---

# 7. Run exact current PR HEAD on isolated runtime

Do not use production as the verification target.

Run the exact checked-out PR #63 HEAD on an isolated port such as:

`http://127.0.0.1:8163/bubble-shooter`

Record:

- exact Git SHA
- URL
- PID/container
- startup command

Prove the served page comes from this current checkout.

Do not modify production 8080 or 8081 for this verification.

---

# 8. Deterministic core gameplay browser QA

Use headed Chrome against the isolated runtime.

## 8.1 Correct-answer behavior

1. Start a fresh game.
2. Identify the requested Hanja.
3. Identify the exact correct live bubble.
4. Record:
   - score
   - bubble count
   - current target
5. Fire a deterministic shot that hits the correct bubble.
6. Verify:
   - score increases correctly
   - hit bubble disappears
   - no immediate pressure replacement bubble is added
   - target advances correctly after praise flow
   - no duplicate continuation occurs

Do not substitute a direct function call for the real gameplay event path.

## 8.2 Miss / wrong-hit behavior

Perform a deterministic miss or wrong hit.

Verify:

- exactly one pressure bubble is added
- no score is incorrectly awarded
- no double bubble addition
- next input remains usable

## 8.3 Several-turn progression

Complete several alternating correct/miss actions.

Check that bubble count changes consistently with the contract and does not drift from duplicate timers/callbacks.

---

# 9. Restart-race blocker verification

This is mandatory.

Required sequence:

1. Fresh game.
2. Deterministically hit the correct bubble.
3. Confirm praise/delayed continuation starts.
4. Before the old callback delay completes, press restart.
5. Wait at least 1.5 seconds.
6. Confirm the new game remains unchanged by the stale callback:
   - restarted score remains at reset value
   - bubble count remains valid
   - target remains the restarted target
   - no stale praise mutation
   - no extra pressure bubble
   - no console error
7. Repeat once.

Prove the served runtime passes through the generation check / `L.isGenerationValid()` path.

---

# 10. Mobile and viewport QA

Run at minimum:

- desktop: 1280×800
- portrait: 360×800
- landscape: 800×360

At each viewport verify:

- no horizontal overflow
- shooter and bubbles remain visible
- target/question UI remains readable
- restart control is usable
- touch/pointer aiming maps to the expected bubble
- at least one correct shot
- at least one miss
- game remains playable after resize/orientation change
- no console error

Because base has moved substantially since the historical 48/48 run, if any layout/runtime code involved in Bubble Shooter changed during the sync, rerun the full previous 48-check browser matrix rather than only smoke testing.

---

# 11. Route and regression checks

Verify HTTP behavior for relevant routes, including at least:

- `/bubble-shooter`
- `/portal`

Also confirm Bubble Shooter's portal/navigation entry still works.

If the app has an alias/legacy route for Bubble Shooter, verify it as well.

Do not alter unrelated routes.

---

# 12. Console and timer stability

During headed-browser QA:

- zero new Bubble Shooter JavaScript errors
- no duplicate delayed callback
- no stale callback after restart
- no input freeze
- no invisible overlay blocking interaction
- no runaway timers
- no repeated target mutation from one shot

Inspect server stderr/logs for Bubble Shooter runtime exceptions.

---

# 13. Update final Bubble Shooter report

Update:

`BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`

Add a clearly dated/current final verification section with:

- pre-sync feature SHA
- base SHA merged
- post-sync feature SHA
- conflict summary
- changed files
- focused test results
- full discovery results
- deterministic correct-hit result
- miss result
- restart-race result
- desktop/portrait/landscape result
- console result
- routes result
- final ahead/behind versus base
- remaining risks

Do not erase useful historical Phase 1 evidence.

---

# 14. PR #63 metadata

Review PR #63 after final verification.

Update the PR body if it still contains stale test counts or obsolete verification status.

The PR should accurately state the final post-sync evidence.

Do not merge automatically.

---

# 15. Final verification report

Create:

`BUBBLE_SHOOTER_FINAL_SYNC_VERIFY_REPORT_30.md`

The report must include:

- exact final feature HEAD
- exact current base HEAD
- `ahead_by / behind_by`
- whether base merge had conflicts
- any conflict resolution details
- exact automated test counts
- browser runtime URL
- correct-hit evidence
- miss evidence
- restart-race evidence
- mobile/desktop evidence
- console/server-log status
- route status
- PR diff scope
- remaining risks

Final verdict must be exactly one of:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL — DO NOT MERGE`

## PASS requirements

`PASS — MERGE READY` requires all of:

1. `behind_by = 0`
2. Bubble Shooter focused automated tests pass
3. no Bubble Shooter product regression in full discovery
4. served runtime uses shared logic correctly
5. deterministic correct-hit behavior passes
6. deterministic miss behavior passes
7. restart-race test passes twice
8. desktop + portrait + landscape browser QA passes
9. zero blocking console/runtime error
10. PR diff contains no accidental unrelated base changes

Do not merge PR #63.

Do not deploy production.
