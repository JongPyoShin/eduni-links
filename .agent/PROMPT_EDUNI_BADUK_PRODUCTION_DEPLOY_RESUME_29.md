# EDUNI Baduk production deploy resume after runtime-log blocker (Prompt 29)

## Goal

Resume the already-approved production 8081 deployment for merged Baduk PR #64 after resolving the previous checkout-dirty blocker **without deleting or moving the preserved runtime logs**.

This task continues Prompt 28.

## Current source of truth

Repository:

`JongPyoShin/eduni-links`

Target branch:

`feature/eduni-space-mvp`

Application merge commit that must be contained in the deployed branch:

`e5a034ae348b14638f88b94d840d36c19c6ef7ea`

Previous blocker-report commit:

`81a07d4d56230f699be76202bdc618c6381f682c`

Runtime-log ignore fix commit:

`134a800dd555ac3fafe5206ddeb8d234683aa591`

Do **not** hardcode a final deployment HEAD beyond these ancestry requirements, because this Prompt file itself advances the branch. At execution time, deploy the current remote head of `origin/feature/eduni-space-mvp` after verifying it contains the application merge commit above.

## Important preservation rule

The following existing files must remain preserved exactly where they are:

- `nice-gui-1-1-7/work/baduk-8081-stderr.log`
- `nice-gui-1-1-7/work/baduk-8081-stdout.log`

Do not:

- delete them
- truncate them
- move them
- rename them
- overwrite them
- stash them
- add them to Git

They are runtime artifacts and are now intentionally ignored by:

`nice-gui-1-1-7/work/*.log`

Before any checkout update, record for each file if present:

- full path
- byte size
- last modified time
- SHA-256

After the branch update, verify the same files still exist and have the same size/hash unless the existing runtime process legitimately appended new log content during the check. If content grows, report the before/after sizes and hashes; do not treat legitimate append-only runtime logging as data loss.

## 1. Confirm current production state is still unchanged

Re-identify the owner of production port 8081.

Expected historical state from Prompt 28:

- service/container: `eduni-game`
- container ID: `21a8d013e1e2`
- image: `eduni-space-mvp-eduni-game`
- image ID: `sha256:d6f8b40c11d7df74e41658a6301ff1d47952401102c634de105a1e739112dc49`

Do not assume these are unchanged. Record current values.

Confirm no deployment occurred since the blocker report.

## 2. Preserve and inspect the two runtime logs

In the production checkout:

`D:\Codex\Worktrees\eduni-space-mvp`

record both logs as described above.

Then run:

```powershell
git status --short --untracked-files=all
git status --ignored --short
```

Before syncing, the two files may still appear as untracked if the local checkout has not yet received the ignore commit. That is expected.

Do not clean them.

## 3. Safe fast-forward to the current remote branch

Run:

```powershell
git fetch --all --prune
git branch --show-current
git rev-parse HEAD
git rev-parse origin/feature/eduni-space-mvp
git merge-base --is-ancestor e5a034ae348b14638f88b94d840d36c19c6ef7ea origin/feature/eduni-space-mvp
```

Required:

- current branch is `feature/eduni-space-mvp`, or the checkout is safely switched to it only after verifying no tracked/local work would be lost
- remote target contains `e5a034ae...`
- local tracked files are otherwise clean

Update only by safe fast-forward, e.g. equivalent of:

```powershell
git pull --ff-only
```

Do not use reset --hard.

After fast-forward:

```powershell
git status --short --untracked-files=all
git status --ignored --short
git rev-parse HEAD
```

Expected result:

- the two runtime logs remain physically present
- they are ignored due to `nice-gui-1-1-7/work/*.log`
- normal `git status --short` is clean
- HEAD equals current `origin/feature/eduni-space-mvp`

If any other untracked/modified file remains, stop and report.

## 4. Reconfirm log preservation

Recompute SHA-256, size, and timestamps for:

- `baduk-8081-stderr.log`
- `baduk-8081-stdout.log`

Confirm no deletion/truncation occurred.

If logs changed only because the still-running runtime appended output, state that explicitly.

## 5. Re-run Prompt 28 deployment preflight

Follow Prompt 28 from the pre-build source verification section onward, with these clarifications:

- deployment target is the **current remote HEAD** of `feature/eduni-space-mvp`
- it must contain merge commit `e5a034ae...`
- the ignored runtime logs are not a dirty-checkout blocker
- do not reclassify those two known ignored logs as unsafe local source changes
- any other dirty tracked/untracked file is still a blocker

Required source markers remain:

- `analyzeAiDanger`
- `undo:undoMove`
- `const token=++aiGeneration`
- stale-token guard
- `showHint`
- `규칙 보기`
- `aiForcedPasses`
- `assessAiNoMove`
- `finishAiResignation`
- `AI 기권 — 흑 승!`
- `largeSelfAtariRisk`
- `ownGroupSizeAfter`
- `내 집은 끝까지 메우지 않아도 돼요`
- `integrate_v2_coach`
- `integrate_endgame_safety`

## 6. Required focused tests before deployment

Run the same Prompt 28 focused suites:

```powershell
python -m unittest tests.test_baduk_endgame_safety
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_game
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python scripts/validate_content.py
git diff --check
```

Use `PYTHONUTF8=1` if needed, as in the previous successful preflight.

Any real product test failure blocks deployment.

## 7. Deploy only the 8081 service

Continue with the actual production mechanism discovered in Prompt 28.

If still Docker/`eduni-game`:

- rebuild only the 8081 game service/image
- recreate/restart only `eduni-game`
- do not touch production 8080
- keep exact rollback identity of previous container/image

Record old and new:

- container ID
- image ID
- PID
- service health
- deployed Git SHA

## 8. Post-deploy verification

Repeat the Prompt 28 production checks against:

- `http://127.0.0.1:8081/baduk`
- `http://100.75.214.95:8081/baduk`

If localhost binding semantics mean 127.0.0.1:8081 is not expected to work because the host bind is specifically `100.75.214.95:8081`, document that accurately rather than treating it as an application failure. The externally configured Tailscale address must work.

Verify served current markers and headed-Chrome smoke:

- normal 9×9 human + exactly one AI move
- AI explanation
- undo
- alternate move after undo
- hint
- rules
- 13×13 / 19×19 switch
- input-freeze smoke
- no JS console errors
- no duplicate/stale AI callbacks

For endgame safety, exercise at least one browser-local fixture if practical:

- large-group warning, or
- AI forced-pass explanation

Prompt 27 already proved the dedicated two-forced-pass AI resignation path on the merged feature implementation; production source markers plus a clean deploy are acceptable evidence if reproducing that full fixture again would add operational risk. State whether it was re-exercised.

## 9. Report

Update/replace the deployment verdict in:

`BADUK_PR64_PRODUCTION_DEPLOY_REPORT_28.md`

or, if preserving the blocker report verbatim is clearer, create:

`BADUK_PR64_PRODUCTION_DEPLOY_REPORT_29.md`

Prefer creating the new Prompt 29 report so the original blocker evidence remains intact.

Required verdict:

- `DEPLOYMENT PASS`
- or `DEPLOYMENT FAIL`

Include:

- final deployed branch HEAD
- confirmation it contains `e5a034ae...`
- before/after runtime-log hashes/sizes and preservation result
- ignore rule confirmation
- old/new container/image/PID
- tests
- HTTP checks
- headed-browser smoke
- endgame smoke status
- console/log health
- rollback required yes/no
- production 8080 untouched yes/no

Commit and push the report to `feature/eduni-space-mvp`.

Do not merge anything.
