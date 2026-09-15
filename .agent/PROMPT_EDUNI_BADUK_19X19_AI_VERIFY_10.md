# EDUNI Baduk PR #61 — 19×19 AI Final Verification

## Role

You are the final independent verification agent for PR #61.
Do not modify application code unless the user explicitly asks for a fix after you report a defect.
Do not merge the PR.

## Repository / PR

Repository: `https://github.com/JongPyoShin/eduni-links.git`

Verification branch: `feature/baduk-19x19-ai`

Pull Request: `#61 — WIP: improve 19x19 Baduk AI global move selection`

Expected verification HEAD: `3940301ca711c4988144a222d598b797d4b6beee`

At the start, fetch remote state and record the exact HEAD you actually verify. If HEAD differs, verify the latest remote HEAD and report it.

## Context

PR #60 already verified the shared Baduk v2 coach runtime and local two-player explanation flow.
PR #61 adds only a lightweight 19×19 AI strategy layer.

The most recent fix updates `tests/test_baduk_v2_integration.py` so its assertion matches the real 3-argument runtime call:

```python
source = integrate_v2_coach(source, logic_script, strategy_script)
```

Verify that this test fix is present in the commit under test.

## Required files to inspect first

```text
AGENTS.md
nice-gui-1-1-7/AGENTS.md
.agent/PROMPT_EDUNI_BADUK_19X19_AI_09.md
nice-gui-1-1-7/portal_app/baduk.py
nice-gui-1-1-7/portal_app/baduk_v2_integration.py
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_ai_strategy.js
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js
nice-gui-1-1-7/tests/baduk_19x19_ai.test.mjs
nice-gui-1-1-7/tests/test_baduk_19x19_ai.py
nice-gui-1-1-7/tests/test_baduk_v2_integration.py
```

## 1. Runtime / test alignment

Verify that the served `/baduk` response uses the same `eduni_baduk_ai_strategy.js` implementation exercised by Node tests.

PASS requires:

- `baduk.py` reads `eduni_baduk_ai_strategy.js`;
- `integrate_v2_coach(source, logic_script, strategy_script)` is called;
- final served v2 JavaScript references `window.EDUNIBadukAiStrategy`;
- candidate expansion is gated to `boardSize===19`;
- 9×9 and 13×13 do not receive the 19×19 strategic expansion;
- no second duplicated strategy implementation exists only for tests.

## 2. 19×19 candidate behavior

Verify that after stones already exist in one region, AI still considers distant strategic areas.

At minimum confirm candidates can include empty points such as:

- 4-4 corners;
- side star points;
- center;
- bounded global/open-area samples.

Candidate expansion must stay bounded. It must not evaluate all 361 intersections as the normal path.

## 3. Scoring behavior

Verify `aiAnalysis.components` contains the actual components used by scoring, including the new global components.

Confirm:

- `spread` / `opening` apply only to 19×19;
- the opening bonus tapers to zero by move 30;
- capture / atari tactical values still dominate pure opening spread;
- `jitter` remains random tie-break noise and is never used as an explanation reason.

## 4. Coach explanation

When spread/opening is the strongest meaningful component, the user-facing coach explanation must describe observable board geometry, for example that the move spreads into a large/open region.

When capture is stronger, capture explanation must win.

Do not accept an explanation that is unrelated to the actual score components.

## 5. Regression checks

Verify existing behavior remains intact:

- 9×9 AI plays normally;
- 13×13 AI plays normally;
- 19×19 board resets correctly;
- coach preview / confirm still works;
- AI reply still works;
- local two-player explanation from PR #60 still works;
- no console errors.

## 6. Focused automated tests

Run from `nice-gui-1-1-7`:

```powershell
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_board_levels.test.mjs
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_game
```

Record actual counts and exit codes.

Specifically confirm `tests/test_baduk_v2_integration.py` passes with the 3-argument assertion.

## 7. Full repository validation

Run:

```powershell
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

If the same Windows cp949 failures from earlier verification recur unchanged, report them separately as pre-existing and do not hide them.

## 8. Browser verification

Launch the real application and verify actual user behavior.

### Desktop

Check:

- `/baduk` loads successfully;
- select 19×19;
- play several opening moves;
- AI can respond outside the immediate local cluster;
- coach explanation matches the real `spread/opening` or tactical component;
- no visible layout issue;
- no Baduk-related console error.

### 9×9 / 13×13 regression

Switch to each level and make at least one human move plus AI reply.

Confirm normal play and no 19×19-only behavior leakage.

### Mobile

Viewport: `360×800`

Confirm:

- 19×19 board fits;
- no horizontal overflow;
- level selector works;
- intersections remain usable;
- coach card is readable;
- AI interaction still works.

Capture screenshots if the environment supports it.

## 9. Route smoke

Verify actual responses for:

```text
/baduk
/baduk/
/games/eduni-baduk
/portal
```

Use real HTTP/browser results, not source inspection alone.

## 10. Dependency / PR base check

PR #61 was created with base `fix/baduk-v2-coach-runtime`, because it depends on PR #60.

Check the current state of PR #60.

- If PR #60 is still open: report that PR #61 must remain dependent/draft.
- If PR #60 has been merged into the intended parent branch: report that PR #61 should be rebased or retargeted to the correct merged branch before final merge.
- Do not change the base or merge automatically.

## PASS criteria

PASS only if all of the following are true:

- shared runtime/test strategy alignment confirmed;
- 19×19 can consider distant strategic moves;
- candidate count is bounded;
- opening/global bonus tapers by move 30;
- tactical capture/atari remains dominant;
- explanation maps to actual score component and ignores jitter;
- 9×9 and 13×13 regressions pass;
- focused tests pass;
- full validation has no new PR-caused failure;
- browser desktop/mobile checks pass;
- route smoke passes;
- latest 3-arg integration test fix is present.

## Final report format

```text
BADUK PR #61 FINAL VERIFICATION

Verified branch:
Verified commit:

Overall:
PASS / CONDITIONAL PASS / FAIL

1. Runtime/test alignment
- Result:
- Evidence:

2. 19×19 global candidates
- Result:
- Evidence:

3. Scoring / tactical priority
- Result:
- Evidence:

4. Coach explanation
- Result:
- Evidence:

5. 9×9 / 13×13 regression
- Result:
- Evidence:

6. Automated tests
- baduk_19x19_ai.test.mjs:
- baduk_coach_logic.test.mjs:
- baduk_board_levels.test.mjs:
- test_baduk_19x19_ai:
- test_baduk_v2_integration:
- test_baduk_game:
- validate_content:
- full unittest:
- git diff --check:

7. Browser QA
- Desktop 19×19:
- 9×9:
- 13×13:
- Mobile 360×800:
- Console:

8. Route smoke
- /baduk:
- /baduk/:
- /games/eduni-baduk:
- /portal:

9. PR #60 dependency/base status
- Result:
- Required action before merge:

10. Findings
[BLOCKER]
[HIGH]
[MEDIUM]
[LOW]

11. Recommendation
MERGE READY
or
DO NOT MERGE
```

Anything not actually executed must be marked `NOT VERIFIED` rather than inferred from source code.
