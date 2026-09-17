# Baduk PR #64 production deployment report (Prompt 28)

## Verdict

`DEPLOYMENT FAIL`

Deployment was intentionally stopped before any production mutation. Prompt 28
requires stopping when the production checkout is dirty; the actual checkout
contains two untracked runtime log files. The configured 8081 endpoint also
refused connections during the preflight capture, while the existing container
remained healthy internally.

## Target and source

- target branch: `feature/eduni-space-mvp`
- checkout: `D:\Codex\Worktrees\eduni-space-mvp`
- checkout HEAD: `3668602a0a272643bc1f2d020c90af5e5bd44302`
- merged PR #64 commit: `e5a034ae348b14638f88b94d840d36c19c6ef7ea`
- source markers in the checkout: all required markers present, including
  `analyzeAiDanger`, `undo:undoMove`, `const token=++aiGeneration`,
  `showHint`, `규칙 보기`, `aiForcedPasses`, `assessAiNoMove`,
  `finishAiResignation`, `AI 기권 — 흑 승!`, `largeSelfAtariRisk`,
  `ownGroupSizeAfter`, `내 집은 끝까지 메우지 않아도 돼요`,
  `integrate_v2_coach`, and `integrate_endgame_safety`.

## Pre-deploy ownership and state

- Docker service/container: `eduni-game` / `21a8d013e1e2`
- image: `eduni-space-mvp-eduni-game`
- image ID: `sha256:d6f8b40c11d7df74e41658a6301ff1d47952401102c634de105a1e739112dc49`
- container process: PID `649`, `python app.py`
- container status: running, healthy
- configured binding: `100.75.214.95:8081 -> 8080/tcp`
- container created: `2026-09-16T22:38:57Z`
- container started: `2026-09-17T14:13:20Z`
- internal `http://127.0.0.1:8080/baduk`: HTTP 200, 46,571 bytes
- pre-deploy `http://127.0.0.1:8081/baduk`: connection refused
- pre-deploy `http://100.75.214.95:8081/baduk`: connection refused

The internally served container page is the stale pre-PR runtime: the required
`analyzeAiDanger`, `aiForcedPasses`, `finishAiResignation`, and
`largeSelfAtariRisk` markers were absent. No restart or rebuild was attempted.

## Deployment blocker

`git status --short --untracked-files=all` reported:

```text
?? nice-gui-1-1-7/work/baduk-8081-stderr.log
?? nice-gui-1-1-7/work/baduk-8081-stdout.log
```

These files were preserved. No reset, clean, stash, deletion, branch switch,
merge, container restart, image rebuild, or production data change occurred.

## Focused source tests

All requested pre-deploy tests passed from `nice-gui-1-1-7` with
`PYTHONUTF8=1`:

- `test_baduk_endgame_safety`: 9/9
- `test_baduk_v2_integration`: 14/14
- `test_baduk_persistence_integration`: 7/7
- `test_baduk_19x19_ai`: 4/4
- `test_baduk_game`: 8/8
- Node coach logic: 21/21
- Node 19×19 AI: 6/6
- Node board levels: 5/5
- Node persistence: 14/14
- `validate_content.py`: passed
- `git diff --check`: passed

## Post-deploy/browser/rollback status

Not run because deployment was blocked before mutation. Therefore there is no
new production browser smoke, no new external served-marker evidence, and no
new production console/log result. The pre-deploy container/image/process data
above is sufficient to identify the rollback target if a later approved deploy
is performed.

- deployed SHA: none
- new container/image/PID: none
- rollback required: no (no change made)
- production 8080 touched: no
- production 8081 changed: no

## Next safe action

Resolve or explicitly account for the two preserved untracked runtime logs,
then rerun Prompt 28 from a clean verified checkout. Do not discard these files
as part of that resolution.
