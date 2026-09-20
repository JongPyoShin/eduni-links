# EDUNI 8081 Baduk + Bubble Shooter — Production Deploy Report (Prompt 31)

## Verdict

`DEPLOYMENT PASS`

The merged Baduk PR #64 and Bubble Shooter PR #63 were rebuilt and deployed by recreating only the `eduni-game` service on port 8081. Both games passed all automated tests and browser smoke verification in production.

## Source and ancestry

- branch: `feature/eduni-space-mvp`
- deployed/current branch HEAD: `a931d3487bd930e802c9972460af3300e10e0cb3`
- Baduk merge contained: `e5a034ae348b14638f88b94d840d36c19c6ef7ea` (confirmed ancestor)
- Bubble Shooter merge contained: `fac610cbfd7b08fead9b60dd44ad17c4c633306e` (confirmed ancestor)
- Prompt 31 commit: `2ab3c1ff1bf5fb315497cac9710c958757d1b0a9`

Both ancestry checks passed before the rebuild. Runtime logs preserved at original paths.

## Pre/post production ownership

Pre-deploy:

- service/container: `eduni-game` / `e0978b176406`
- image ID: `sha256:49d43e487ecdcea06ec700d61166e0ef002441abdb6ead7a415d7adc0438b55a`
- binding: `100.75.214.95:8081 -> 8080/tcp`
- status: Up 19 minutes (healthy)

Deployment command:

```powershell
cd D:\Codex\Worktrees\eduni-space-mvp
docker compose up -d --build --force-recreate --no-deps eduni-game
```

Post-deploy:

- service/container: `eduni-game` / `80dc9dcf9b53`
- image ID: `sha256:fd7c92302a463f58af34e96c400398750f037d9f20384ec24c7caf1908705b63`
- created: 2026-09-20T23:25:02
- started: 2026-09-20T23:25:03
- binding unchanged: `100.75.214.95:8081 -> 8080/tcp`
- no other container or production 8080 service was touched

## Runtime-log preservation

Before and after deployment, both files were unchanged:

| File | Size | Last Modified |
|------|------|---------------|
| `nice-gui-1-1-7/work/baduk-8081-stderr.log` | 0 bytes | 2026-09-17 07:37:18 |
| `nice-gui-1-1-7/work/baduk-8081-stdout.log` | 300 bytes | 2026-09-17 07:37:19 |

## Automated verification

All focused suites passed from `D:\Codex\Worktrees\eduni-space-mvp\nice-gui-1-1-7`:

### Baduk
| Suite | Result |
|-------|--------|
| test_baduk_endgame_safety | **9/9** |
| test_baduk_v2_integration | **14/14** |
| test_baduk_persistence_integration | **7/7** |
| test_baduk_19x19_ai | **4/4** |
| test_baduk_game | **8/8** |
| baduk_coach_logic.test.mjs | **21/21** |
| baduk_19x19_ai.test.mjs | **6/6** |
| baduk_board_levels.test.mjs | **5/5** |
| baduk_persistence.test.mjs | **14/14** |

### Bubble Shooter
| Suite | Result |
|-------|--------|
| bubble_shooter_logic.test.mjs | **19/19** |
| test_bubble_shooter_integration | **15/15** |
| test_routes | **7/7** |

### Infrastructure
| Check | Result |
|-------|--------|
| validate_content.py | **VALID** |
| git diff --check | **clean** |
| Full discovery (python) | **141/141** |

## Production routes and served markers

External `http://100.75.214.95:8081` responses:

| Route | HTTP | Size |
|-------|------|------|
| `/` | 200 | 26,131 bytes |
| `/bubble` | 200 | 24,164 bytes |
| `/bubble-shooter` | 200 | 437,351 bytes |
| `/baduk` | 200 | 63,742 bytes |
| `/baduk/` | 200 | 63,742 bytes |
| `/games/eduni-baduk` | 200 | 473 bytes |
| `/portal` | 200 | 26,131 bytes |

Baduk served markers all present: `analyzeAiDanger`, `id="undo"`, `undo:undoMove`, `showHint`, `규칙 보기`, `const token=++aiGeneration`, `aiForcedPasses`, `finishAiResignation`, `largeSelfAtariRisk`.

Bubble Shooter served wiring all present: `EDUNIBubbleShooterLogic`, `eduni-shooter-logic`, `const L = window.EDUNIBubbleShooterLogic`, `L.resolveShot`, `L.isDanger`, `L.selectTarget`, `L.pointerToCss`, `L.isGenerationValid`, `state.generation`.

## Browser smoke — Bubble Shooter

| Viewport | Checks | Result |
|----------|--------|--------|
| Desktop 1280x800 | 10 | **10/10 PASS** |
| Mobile 360x800 | 10 | **10/10 PASS** |

Verified:
- Shared global `EDUNIBubbleShooterLogic` exists
- L wired in inline script
- Canvas visible, renders bubbles
- Target text displayed in status
- Correct hit scores +100
- Miss does not score
- Restart-race: restart -> hit -> restart -> clean state (score=0)
- Zero console errors

## Browser smoke — Baduk

| Viewport | Checks | Result |
|----------|--------|--------|
| Desktop 1280x800 | 11 | **11/11 PASS** |

Verified:
- Canvas visible
- `무르기` (undo), `힌트` (hint), `규칙 보기` (rules) buttons present
- Human move -> exactly one AI response (moveCount=2)
- Undo reverts to moveCount=0
- Different move after undo -> fresh AI response (moveCount=2)
- Hint shows recommendation message
- Rules toggle works
- Board size switch 9->13->19->9
- Zero console errors

## Stability and rollback

- Container logs: startup line only; no traceback
- No duplicate Baduk AI callback
- No stale Bubble Shooter restart callback
- No input freeze on either game
- No runaway timers or request loops
- Rollback required: **no**
- Rollback target retained: old container `e0978b176406`, image `sha256:49d43e...38b55a`
- Production 8080/other containers touched: **no**

## Remaining risks

1. **Android uses separate implementation** — `NativeBubbleShooterActivity.java` is independent; question-data unification deferred to Phase 2.
2. **`cssToLogical` is a passthrough** — exists as an explicit contract for future DPR handling changes; no behavioral difference.
