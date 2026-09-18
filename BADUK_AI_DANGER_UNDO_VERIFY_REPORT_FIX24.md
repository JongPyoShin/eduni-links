# Baduk PR #64 post-fix verification (Prompt 24)

### VERDICT

`CONDITIONAL PASS`

The compact-function integration blocker is fixed and the isolated current-HEAD runtime now serves the danger/undo/hint/rules features. Core browser blockers passed, but mobile 360x800 and a separate browser two-liberty caution fixture were not independently completed, and four legacy Python wrapper assertions remain.

### HEAD / ISOLATED SERVER

- branch: `feature/baduk-ai-danger-coach`
- verified HEAD: `38efeec6fb0c2d9c85bc3aefa982370ef231af0f`
- fix commits included: `35dc16c` and `7eb1e1c`
- checkout: `D:\Codex\Worktrees\baduk-pr64-verify`
- isolated URL: `http://127.0.0.1:8164/baduk`
- isolated PID: `31936` (`python app.py`, `PORT=8164`, `EDUNI_HOST=127.0.0.1`), stopped after QA
- production `100.75.214.95:8081`: **untouched**; Docker container remained `21a8d013e1e2` and healthy.

### COMPACT-BOUNDARY-BLOCKER

- Actual v2 source still contains compact `}function finishByScore` adjacency.
- The updated `_PASS_TURN_PATTERN` accepts whitespace/compact boundaries with `\s*`; it no longer requires a literal newline.
- `integrate_v2_coach()` output changed from the original: source length `32243`, integrated length `60648`.
- Integrated output contained all required markers: `analyzeAiDanger`, `id="undo"`, `undo:undoMove`, `const token=++aiGeneration`, `if(token!==aiGeneration)return`, `showHint`, `규칙 보기`, `숨 쉴 곳(활로)`, `EDUNIBadukPersistence`, and `EDUNIBadukAiStrategy`.
- Served isolated `/baduk` was HTTP 200, length `60664`, and contained the same feature markers.

### AUTOMATED-TESTS

- Node `baduk_coach_logic`: 21/21 passed.
- Node `baduk_19x19_ai`: 6/6 passed.
- Node `baduk_board_levels`: 5/5 passed.
- Node `baduk_persistence`: 14/14 passed.
- Python `test_baduk_v2_integration`: 14/14 passed.
- Python `test_baduk_persistence_integration`: 7/7 passed.
- Python `test_baduk_19x19_ai`: 3/4 passed; one stale wrapper assertion expects the old `# fail 0` output format although the underlying Node suite passes 6/6.
- Python `test_baduk_game`: 5/8 passed; three legacy wrapper/asset assertions remain stale against the current shared-runtime integration.
- Full unittest discovery: 117 tests, 4 failures (the same stale wrapper assertions).
- `python scripts/validate_content.py`: passed (`VALID: 1 enabled activities`).
- `git diff --check`: passed.

The remaining failures are stale assertions in test wrappers, not failures of the current Node or integration product paths. They still block a strict `PASS` under Prompt 24's merge criteria.

### BROWSER-QA

#### AI danger / safe

- Safe 9x9 move: exactly one AI response (move count 2), one card, calm text `지금은 크게 위험하지 않아요`.
- Critical capture: live headed Chrome showed `내 돌이 잡혔어요`, exact `잡힌 돌 1개`, and the captured-stone explanation.
- New one-liberty danger: live headed Chrome showed `이 돌이 위험해요`, `단수 · 숨 쉴 곳 1개`, and `잡힐 수 있어요`.
- Two-liberty caution: deterministic Node tests passed; a separate browser fixture was not independently completed (`NOT VERIFIED`).
- False-positive remote danger: covered by deterministic shared-logic tests; not separately reproduced through a browser fixture.

#### Undo / race / persistence

- Completed AI cycle: human + one AI response reached move count 2; `무르기` restored move count 0, black turn, zero captures, and disabled undo.
- Undo during AI thinking: immediate undo left move count 0 after waiting beyond the AI delay; no delayed AI stone or stale card appeared.
- Persistence: after undo and reload, move count remained 0, black turn restored, undo disabled, and no danger card returned.
- Local mode: one move produced move count 1, white turn, factual local card, and no AI danger card.

#### Hint / rules

- `힌트` did not auto-play; it showed `추천 자리`, a highlighted candidate, and explicit `여기에 두기` confirmation.
- Repeating hint without changing the board produced identical card text/category and left move count at 0.
- `규칙 보기` opened a non-modal guide covering intersections/turns, `숨 쉴 곳(활로)`, capture, suicide exception, `패`, two passes, and komi. Closing preserved move count and input controls.

#### Stress / levels / console

- 9x9 direct AI stress: 20 consecutive human/AI cycles completed from move count 2 to 42; every cycle returned `흑 차례`, and no freeze occurred.
- 13x13 and 19x19: board labels switched correctly; AI move + undo cycle completed on both. 19x19 displayed the global-opening safe explanation.
- 9x9 danger and undo were exercised; 13x13/19x19 danger-specific fixtures were not separately created.
- Console errors/warnings: none captured in the isolated headed tab.
- Routes: `/baduk`, `/baduk/`, `/games/eduni-baduk`, `/portal` all returned HTTP 200 on 8164.
- Mobile 360x800 viewport: `NOT VERIFIED` because the connected headed-browser control did not expose a viewport override in this run.

### CHANGES-MADE

- No product or production deployment changes.
- Isolated PID `31936` stopped after verification.
- Added this report only.

### REMAINING-RISKS

- Replace/fix the four stale Python wrapper assertions before strict merge readiness.
- Complete a browser-controlled 360x800 run and a deterministic browser two-liberty caution fixture.
- Repeat 13x13/19x19 danger-specific browser fixtures if merge policy requires per-level danger evidence.
