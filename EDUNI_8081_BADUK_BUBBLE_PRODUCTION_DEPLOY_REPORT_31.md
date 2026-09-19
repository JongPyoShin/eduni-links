# EDUNI 8081 Baduk + Bubble Shooter unified deployment report

## Verdict

`DEPLOYMENT PASS`

The current `feature/eduni-space-mvp` base was rebuilt once and deployed by
recreating only `eduni-game`. Baduk PR #64 and Bubble Shooter PR #63 are both
served by the production 8081 service.

## Source and ancestry

- branch: `feature/eduni-space-mvp`
- deployed/current branch HEAD: `76658d5df13fee321ac5b774ecd5b0446e0ec0bd`
- Baduk merge contained: `e5a034ae348b14638f88b94d840d36c19c6ef7ea`
- Bubble Shooter merge contained: `fac610cbfd7b08fead9b60dd44ad17c4c633306e`
- required Prompt 31 commit: `2ab3c1ff1bf5fb315497cac9710c958757d1b0a9`

Both ancestry checks passed before the rebuild. The two preserved runtime logs
remained at their original paths and were not moved, deleted, truncated, or
added to Git.

## Pre/post production ownership

Pre-deploy:

- service/container: `eduni-game` / `8d1adacbef99`
- image ID: `sha256:91d19bd7f73240ca9ee83eefd51f6a0167faf31c22c5280f251b00fe59f98c50`
- PID: `26193`, running/healthy
- binding: `100.75.214.95:8081 -> 8080/tcp`

Deployment command:

```powershell
docker compose up -d --build --force-recreate --no-deps eduni-game
```

Post-deploy:

- service/container: `eduni-game` / `e0978b176406`
- image ID: `sha256:49d43e487ecdcea06ec700d61166e0ef002441abdb6ead7a415d7adc0438b55`
- PID: `27174`, running/healthy
- binding unchanged: `100.75.214.95:8081 -> 8080/tcp`
- no other container or production 8080 service was touched

## Runtime-log preservation

Before and after deployment, both files were unchanged:

| File | Size | SHA-256 |
|---|---:|---|
| `nice-gui-1-1-7/work/baduk-8081-stderr.log` | 0 | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` |
| `nice-gui-1-1-7/work/baduk-8081-stdout.log` | 300 | `464A7F250133052C013941CD39B284FDA3F1135D74410CB312A25D12000A0FF9` |

## Automated verification

All Prompt 31 focused suites passed:

- Baduk Python: 9/9, 14/14, 7/7, 4/4, 8/8
- Baduk Node: 21/21, 6/6, 5/5, 14/14
- Bubble Shooter Node: 19/19
- Bubble Shooter Python integration: 15/15
- routes: 7/7
- `validate_content.py`: passed
- full discovery: **141/141**
- `git diff --check`: passed

## Production routes and served markers

External `http://100.75.214.95:8081` responses:

- `/`: 200
- `/bubble`: 200
- `/bubble-shooter`: 200, 437,351 bytes
- `/baduk`: 200, 63,742 bytes
- `/baduk/`: 200
- `/games/eduni-baduk`: 200
- `/portal`: 200

Baduk served markers all present: `analyzeAiDanger`, `id="undo"`,
`undo:undoMove`, `showHint`, `규칙 보기`, `const token=++aiGeneration`,
`aiForcedPasses`, `finishAiResignation`, `largeSelfAtariRisk`.

Bubble Shooter served wiring all present: `EDUNIBubbleShooterLogic`,
`eduni-shooter-logic`, `const L = window.EDUNIBubbleShooterLogic`,
`L.resolveShot`, `L.isDanger`, `L.selectTarget`, `L.pointerToCss`,
`L.isGenerationValid`, and `afterTurn(addBubble)`.

## Headed Chrome QA

### Bubble Shooter

- Desktop real headed Chrome: correct hit scored `+100` and removed the target.
- Desktop miss: score stayed `0` and exactly one pressure bubble was added.
- Restart race: restart during the delayed success callback returned to clean
  score `0`/one initial bubble; no stale mutation or extra bubble appeared.
- 360×800 viewport: canvas and controls remained visible with no horizontal
  overflow (`innerWidth=360`, `scrollWidth=360`, canvas `340×650.5`).
- The current mobile canvas correct-hit pointer chain could not be reliably
  re-exercised through this session's CDP/CUA mobile bridge; Prompt 30's same
  merged runtime had already passed the full 360×800 14/14 Playwright matrix.

### Baduk

- Production `/baduk` loaded the current 9×9 UI with `무르기`, `힌트`, and
  `규칙 보기`.
- Existing headed Chrome production smoke verified 9×9 human→one-AI response,
  undo/race, hint without auto-play, rules lesson, and 13×13/19×19/back-to-9×9
  switching on the same deployed Baduk runtime.
- Production localStorage checkerboard fixture produced one forced AI pass with
  `moveCount=61`, `consecutivePasses=1`, `gameOver=false`, and the visible
  no-legal-move explanation.

## Stability and rollback

- Fresh headed Chrome CDP reloads for both pages: zero runtime exception or
  error/assert log entries.
- Container logs: startup line only; no traceback.
- No duplicate Baduk AI callback, stale Bubble Shooter restart callback, or
  visible error card.
- Rollback required: `no`.
- Rollback target retained: old container `8d1adacbef99` and image ID above.
- Production 8080/other containers touched: `no`.

Remaining risk is limited to repeating the mobile Bubble Shooter correct-hit
gesture with a browser bridge that preserves this canvas's pointer chain; the
same current merged runtime's Prompt 30 mobile matrix and all shared-logic
tests passed.
