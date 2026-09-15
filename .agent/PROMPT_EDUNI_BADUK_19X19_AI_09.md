# EDUNI Baduk — 19×19 Lightweight AI Expansion

## Role

Improve only the 19×19 (`standard`) Baduk AI so it considers meaningful global moves in addition to local tactical moves. Preserve the verified PR #60 coach/runtime behavior and do not redesign unrelated game code.

## Repository / branch

Repository: `https://github.com/JongPyoShin/eduni-links.git`

Work branch: `feature/baduk-19x19-ai`

Parent verified HEAD: `f3c1a0e56147ae4d2843619432fee558e2082cac`

Read first:

```text
AGENTS.md
nice-gui-1-1-7/AGENTS.md
.agent/PROMPT_EDUNI_BADUK_BEGINNER_REALTIME_COACH_06.md
.agent/PROMPT_EDUNI_BADUK_NEMOTRON_VERIFY_07.md
.agent/PROMPT_EDUNI_BADUK_MIMO_BROWSER_VERIFY_08.md
nice-gui-1-1-7/portal_app/baduk_v2_integration.py
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_v2.html
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js
nice-gui-1-1-7/tests/baduk_board_levels.test.mjs
nice-gui-1-1-7/tests/test_baduk_v2_integration.py
```

## Problem

The current 19×19 AI builds candidates almost entirely near stones already on the board. After the opening move it can therefore cluster locally and fail to consider distant corners, side star points, or another large open area.

The goal is not to build a strong Go engine. Keep the AI deterministic enough to test, browser-only, lightweight, and appropriate for an educational family app.

## Required behavior

### 1. Preserve 9×9 and 13×13 behavior

Do not change candidate generation or scoring behavior for beginner 9×9 and intermediate 13×13 except for shared code paths that are provably behavior-neutral.

### 2. Expand only 19×19 candidate generation

For standard 19×19, candidate moves must be the union of:

- existing local tactical candidates around stones;
- empty 19×19 strategic anchors (at minimum the four 4-4 corners, side star points, and center);
- a small number of global/open-area candidates so the AI can consider a distant empty region even when stones already exist elsewhere.

Do not fall back to evaluating all 361 intersections every move unless there are no usable candidates.

### 3. Add a real global/spread scoring component

For 19×19 only, score should include a bounded component derived from observable board geometry, such as distance from the nearest existing stone and/or opening strategic anchors.

Requirements:

- tactical capture and atari must remain higher priority than opening spread;
- the global bonus should be strongest in the opening and taper later;
- randomness (`jitter`) must remain a tie-break/noise component and must never be explained as strategy;
- the new score component must be recorded in `move.aiAnalysis.components` so explanations are based on the score actually used.

### 4. AI explanation

If the global/spread component is the strongest meaningful component, the coach may explain that the AI chose a move because it spreads into a large/open part of the board.

Do not invent intent. Explanation must map to an actual non-random score component.

### 5. Runtime/test alignment

The code exercised by regression tests must be the same logic used by the served `/baduk` runtime. Avoid creating another tested-but-unused implementation.

## Suggested lightweight design

Prefer a small pure/shared JavaScript strategy helper for 19×19 candidate expansion and extra scoring, then wire it into the existing v2 runtime integration. This is preferred over duplicating a second large inline AI implementation.

The helper should be easy to test in Node without a browser DOM.

## Required tests

Add focused regression coverage proving at least:

1. 9×9 candidate behavior remains local/current behavior.
2. 13×13 candidate behavior remains local/current behavior.
3. On 19×19, after a stone exists in one area, candidate generation still includes a distant empty 4-4 corner or another strategic anchor.
4. 19×19 global candidate expansion remains bounded and does not blindly return all empty points.
5. A capture candidate still outranks a pure spread move when capture is available.
6. Opening spread/global score decreases or disappears in later game state.
7. AI explanation can identify the real global/spread component and ignores jitter.
8. Existing Baduk coach, board-level, and integration tests remain green.

## Validation

Run focused tests first, then repository validation:

```powershell
cd nice-gui-1-1-7
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_board_levels.test.mjs
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_game
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

If Windows cp949 failures reproduce and are unchanged from the verified PR #60 baseline, report them separately as pre-existing rather than hiding them.

## Browser acceptance

Before merge, verify at least:

- 19×19 AI can choose/respond outside the immediate cluster in an opening position;
- 9×9 and 13×13 still play normally;
- AI coach explanation remains visible and factual;
- no browser console error;
- 360×800 remains usable.

## Scope guard

Do not add network AI, WASM engines, external dependencies, analytics, storage, or server-side game state. Do not modify unrelated portal/game/deployment code.

Do not merge automatically.
