# Baduk PR #64 production deployment report (Prompt 28)

## Verdict

`DEPLOYMENT PASS`

The merged Baduk PR #64 was rebuilt and deployed by recreating only the
`eduni-game` service. Production 8081 now serves the merged endgame/coach
runtime and passed headed-Chrome smoke verification.

## Source

- branch: `feature/eduni-space-mvp`
- checkout HEAD: `81a07d4d56230f699be76202bdc618c6381f682c` (report-only commit on top of the merged feature branch)
- deployed feature merge: `e5a034ae348b14638f88b94d840d36c19c6ef7ea`
- Prompt 28 commit: `3668602a0a272643bc1f2d020c90af5e5bd44302`
- preserved pre-existing logs: `D:\Codex\deployment-preserved\baduk-8081-20260919\`

## Ownership and deployment action

Pre-deploy:

- container: `eduni-game` / `21a8d013e1e2`
- image ID: `sha256:d6f8b40c11d7df74e41658a6301ff1d47952401102c634de105a1e739112dc49`
- process: PID `649`, `python app.py`
- status: running/healthy, configured `100.75.214.95:8081 -> 8080/tcp`
- external and localhost 8081 were refusing connections; container-internal `/baduk` was 200 but lacked the PR #64 markers.

Action performed:

```powershell
docker compose up -d --build --force-recreate --no-deps eduni-game
```

No other Docker service was restarted or rebuilt.

Post-deploy:

- container: `eduni-game` / `8d1adacbef99`
- image ID: `sha256:91d19bd7f73240ca9ee83eefd51f6a0167faf31c22c5280f251b00fe59f98c50`
- status: running/healthy
- process: `python app.py` inside the recreated container
- external binding: `100.75.214.95:8081 -> 8080/tcp`

## HTTP and served source

External production responses:

- `/baduk`: HTTP 200, 63,742 bytes
- `/baduk/`: HTTP 200
- `/games/eduni-baduk`: HTTP 200
- `/portal`: HTTP 200

The served `/baduk` contained all required markers:

- `analyzeAiDanger`
- `id="undo"`
- `undo:undoMove`
- `showHint`
- `규칙 보기`
- `const token=++aiGeneration`
- `aiForcedPasses`
- `finishAiResignation`
- `largeSelfAtariRisk`

The compose binding is intentionally interface-specific, so
`127.0.0.1:8081` remains refused while the authoritative Tailscale endpoint
`100.75.214.95:8081` is healthy.

## Focused tests

All passed from `nice-gui-1-1-7` with `PYTHONUTF8=1`:

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

## Headed Chrome production QA

Verified in a separate headed Chrome profile against
`http://100.75.214.95:8081/baduk` using DevTools Protocol (the Browser Control
daemon was unavailable due a local permission error).

- 9×9: visible `무르기`, `힌트`, `규칙 보기`; real pointer placement produced exactly one AI response (`moveCount=2`).
- Undo: reverted human+AI to `moveCount=0`; a different real pointer placement produced exactly one fresh AI response.
- Hint: showed a recommendation and reason (`활로 6개`) without changing `moveCount`; explicit `여기에 두기` remained available.
- Rules: showed `내 집은 끝까지 메우지 않아도 돼요`; closing left the board state unchanged.
- Board sizes: 13×13 and 19×19 both accepted a real move and exactly one AI response; switching back to 9×9 reset to a playable board.
- Input freeze: coach ON produced a visible preview card without committing a stone (`moveCount=0`); coach OFF and level/new-game transitions remained playable.
- Endgame safety fixture: production localStorage checkerboard restore caused one forced AI pass with `moveCount=61`, `consecutivePasses=1`, `gameOver=false`, and the visible no-legal-move explanation.
- CDP `Runtime.exceptionThrown` / `Log.entryAdded` capture during a fresh production reload: zero error/assert entries.

## Stability and rollback

- recent `eduni-game` logs: startup only; no traceback observed
- no duplicate AI response, stale undo callback, request loop, or visible error
- rollback required: `no`
- rollback target retained: pre-deploy container `21a8d013e1e2` and image ID recorded above
- production 8080/other services touched: `no`

## Remaining risk

The authoritative interface-specific endpoint is healthy. Localhost 8081 is
intentionally unavailable because the compose binding is restricted to
`100.75.214.95`; do not broaden that binding without a separate authorization.
