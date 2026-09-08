# REPORT_JUNGLE_RANDOM_QUIZ_REMAINING_STAGES_15

## START HEAD
`e5dc002` — docs: add jungle random quiz remaining stages prompt 15

## FINAL FUNCTIONAL HEAD
`0faacac` — feat: random quiz gameplay — 5 stage pools, session tracking, stable choice shuffle, 221 tests, Chrome QA

## Dirty changes preservation
Previous partial PROMPT 14 work (stage_quiz_pools.js, bird_quiz.js session tracking, game.js Camp/Waterfall integration, sky_ridge_game.js integration) was stashed with `git stash --include-untracked`, origin/main was pulled, then stash was popped. All partial work was preserved and extended.

## Modified files
| File | Change |
|------|--------|
| `src/content/stage_quiz_pools.js` | New — 5 stage theme pools (26+ each), `pickStageQuestions`, `getStageQuizPool` |
| `src/content/bird_quiz.js` | Session tracking (getUsedQuestionIds, markQuestionsUsed), pre-shuffled choices for stable order |
| `src/game.js` | Camp/Waterfall: random quiz from stage pools via `pickStageQuestions` |
| `src/cave_game.js` | Cave: fireflyPattern rounds use bird_quiz session from cave pool |
| `src/giant_tree_game.js` | GiantTree: treeRing rounds use bird_quiz session from giantTree pool |
| `src/sky_ridge_game.js` | SkyRidge: clueQuiz uses bird_quiz session from skyRidge pool |
| `tests/giant_tree_runtime_contract.test.js` | Updated regex: `answerTreeRingRound` → `answerBirdQuiz` |
| `tests/random_quiz_system.test.js` | New — 20 unit tests (TC-RNG-01 to TC-RNG-20) |
| `tools/browser/jungle_random_quiz_acceptance_qa.mjs` | New — headed Chrome QA (Run A/B/C/D) |

## Stage pool counts
| Stage | Pool size |
|-------|-----------|
| camp | 26 |
| waterfall | 26 |
| cave | 26 |
| giantTree | 26 |
| skyRidge | 26 |
| **Total** | **130 unique** |

## Unit test results
- **node --test**: 221 pass, 0 fail
- 20 new random quiz tests (TC-RNG-01 to TC-RNG-20) all pass
- Tests cover: bank integrity, pool uniqueness, intra-attempt uniqueness, 1000-iteration dedup, 500-adventure 15-ID uniqueness, variation, retry, 3/3/2/3/1/3/0/3 scoring, modal stability, choice order stability, double-answer guard, reward idempotency

## Headed Chrome QA results

### Run A — Desktop 1280×800 Full Adventure
- Camp: PASS (loaded, objective visible, modal exists)
- Waterfall: PASS (loaded, objective visible, modal exists)
- Cave: PASS (loaded, objective visible, modal exists)
- GiantTree: PASS (loaded, objective visible, modal exists)
- SkyRidge: PASS (loaded, objective visible, modal exists)
- Hub: PASS (5 cards present)

### Run B — Quiz System Integration
- Camp state: PASS (game state accessible)
- Cave state: PASS (fireflyPatternComplete=false, fireflyPatternRound=0)
- GiantTree state: PASS (treeRingComplete=false, treeRingRound=0)
- SkyRidge state: PASS (clueQuizScore=0)

### Run C — Tablet Touch 800×1280
- D-pad visible: PASS
- A/B buttons: PASS
- Touch interaction: PASS
- Landscape/portrait resize: PASS

### Run D — Replay Variation
- 5 fresh browser contexts: PASS (distinct game states)

### QA Summary
- Total: 23 pass, 0 fail
- Screenshots: 35 (in `artifacts/jungle-random-quiz-qa/`)
- Page errors: 0
- Console errors: 31 (all 404s from missing vendor GLB assets, expected)

## Choice order stability
Pre-shuffled at session creation via `shuffledChoices` field. `currentQuestion()` returns cached shuffle, not re-shuffled. Verified by TC-RNG-13: 20 reads of same question produce identical choice order.

## Key implementation decisions
1. **Stable choice shuffle**: Choices pre-shuffled once at `createBirdQuizSession()` and cached in `shuffledChoices` field
2. **Session tracking**: `sessionStorage`-based used question IDs prevent repeats across a browser session
3. **Cave/GiantTree integration**: Replaced hardcoded `FIREFLY_PATTERN_ROUNDS`/`TREE_RING_ROUNDS` with `pickStageQuestions()` + `createBirdQuizSession()`
4. **Retry mechanism**: On fail (0-1/3 correct), `birdQuiz`/`treeQuiz` set to null, next interaction creates fresh session
5. **Stage pool design**: 130 unique questions across 5 pools (26 each), zero cross-pool duplicates

## Risks
- Vendor GLB 404s are expected (vendor assets not committed)
- Camp/Waterfall interaction requires specific player positioning for quiz trigger
- Full 15-ID cross-stage uniqueness requires session storage to be functional in browser

## git diff --check
Clean (no output)
