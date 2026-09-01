# REPORT_JUNGLE_ADVENTURE_GAMEPLAY_01

## START / FINAL HEAD
- **START HEAD**: `e5f0cdb` (docs(agent): add jungle adventure gameplay rework prompt)
- **FINAL HEAD**: pending commit

## Changed Files

### New files (4)
- `src/content/bird_manifest.js` — bird data (bluebird, kingfisher, skyHawk)
- `src/content/bird_codex.js` — localStorage persistence for captured birds
- `src/content/bird_quiz.js` — quiz engine with RNG injection
- `src/content/bird_quiz_bank.js` — 65 elementary-level quiz questions

### Modified files (12)
- `src/content/chapter_state.js` — removed `firePitRound`/`firePitComplete`, added `clueQuizScore`/`clueQuizzesComplete`
- `src/content/camp_chapter.js` — replaced fire pit quiz with per-clue quiz mapping; removed FIRE_PIT_ROUNDS; added `addClueQuizScore`, `getClueQuizId`, `canMeetBluebird` using `clueQuizzesComplete`
- `src/content/interactables.js` — bluebird gate changed from `firePitComplete` to `canMeetBluebird` (uses `clueQuizzesComplete`)
- `src/content/sequence_controller.js` — ridge arrival gate changed from `firePitComplete` to `clueQuizzesComplete`
- `src/content/feedback.js` — all `firePitComplete` refs → `clueQuizzesComplete`
- `src/content/stage_visual_director.js` — camp phase mapping updated for new state fields
- `src/game.js` — removed fire pit quiz flow; added clue→quiz integration; bluebird encounter uses accumulated score for capture; camera initial offset for better framing
- `src/scene.js` — moved spawn-area props to fix foreground occlusion
- `src/three_camp_runtime.js` — updated visual phase refs
- `tests/chapter.test.js` — rewritten for Adventure Loop V2 (clue quiz, no fire pit)
- `tests/stage_visual_director.test.js` — updated camp helper and assertions for new state

## Root Causes

### A. Spawn / camera / foreground occlusion
- **Cause**: Props at (180,1078), (150,1080), (430,1090) were depth-sorted in front of player at (200,1040)
- **Fix**: Moved props to positions outside spawn radius; added camera initial Y offset (-80px) to show path ahead

### B. Stage scale consistency
- **Status**: Retained existing scale constants. Camp/Waterfall/Cave/GiantTree/SkyRidge use shared `CAMERA.ZOOM=1` and world-size 1600×1200. Player display width 112px = ~7% of world width. No scale drift detected.
- **Contract documented**: player screen-height occupancy ~12-16%, path width ~1.8-2.6x player width

## Adventure Loop V2 Implementation

### New flow (Camp)
1. **Hut** → start quest
2. **Feather clue** → clue description + quiz question 1 → score accumulates
3. **Footprints clue** → clue description + quiz question 2 → score accumulates
4. **Birdcall clue** → clue description + quiz question 3 → score accumulates
5. **Bluebird encounter** → check accumulated score:
   - Score ≥ 2: capture success → codex registration → reward ceremony
   - Score < 2: "아쉬워!" → retry loop (reset clues, try again)

### Clue → Quiz mapping
| Clue | Quiz ID | Category |
|------|---------|----------|
| feather | q001 | nature (깃털) |
| footprints | q004 | nature (개미굴) |
| birdcall | q005 | nature (곤충 다리) |

### Capture behavior
- **Score ≥ 2**: `captureBird(codex, "bluebird", score)` → localStorage persist → `completeBluebird()` → reward ceremony with badge
- **Score < 2**: Panel shows retry option → resets `discoveredClues`, `clueQuizScore`, `clueQuizzesComplete` → player can try again
- **Re-capture**: Already captured birds show updated score; `bestScore` and `attempts` tracked

### HUD
- Objective HUD: compact text chip at top (`#objective-hud`)
- No full-screen overlays during gameplay
- D-pad/A/B buttons unobstructed

## Tests
- **188/188 pass** (0 fail)
- chapter.test.js: rewritten for clue quiz flow (8 tests)
- stage_visual_director.test.js: updated camp helper (6 tests)
- All existing Waterfall/Cave/GiantTree/SkyRidge tests unchanged and passing

## Browser QA
- Server running at `http://localhost:8124` (PID 19656)
- `jungle-hub.html` loads (200)
- `/?renderer=three` loads (200)
- `bird-codex.html` loads (200)
- Camp spawn: player visible, no foreground occlusion
- Camera frames path ahead on start

## Remaining Issues
- Waterfall/Sky Ridge bird quiz integration not yet implemented (P1 scope — uses existing confirm flow)
- Thinking Orbs tech reference (POC LATER — not implemented this slice)
- Optional micro-discovery sparkles (not yet added)

## Final: **PASS**
- 188 tests pass
- Spawn occlusion fixed
- Adventure Loop V2 implemented for Camp
- 65-question quiz bank integrated
- Codex persistence working
- No regressions in other stages
