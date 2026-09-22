# EDUNI Bubble Shooter Phase 3 — Independent Verify (Prompt 38)

## Objective

Independently verify the Phase 3 visible UX implementation for Bubble Shooter.

This is a **verification-only** prompt.

Do not implement product changes.
Do not deploy production.
Do not merge.

---

## Repository / base

Repository:

`JongPyoShin/eduni-links`

Feature branch:

`feature/bubble-shooter-phase3-visible-ux`

Target:

`feature/eduni-space-mvp`

---

# 1. Read and verify scope

Read:

- `BUBBLE_SHOOTER_PHASE3_VISIBLE_UX_REPORT.md`
- `nice-gui-1-1-7/app.py` (template changes)

Confirm:

- only `nice-gui-1-1-7/app.py` changed (no other source files)
- shared logic file `eduni_bubble_shooter_logic.js` is unchanged
- canonical dataset `shared/bubble_shooter_questions.json` is unchanged
- Android source files are unchanged
- production Dockerfile/compose unchanged
- Baduk/portal unchanged

---

# 2. Automated regression re-run

Run all suites independently.

## JS

```powershell
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs tests/contract_fixture_runner.test.mjs
```

Expected: 32/32

## Python

```powershell
cd nice-gui-1-1-7
python -m pytest tests/test_bubble_shooter_integration.py tests/test_routes.py -q
python scripts/validate_content.py
python -m unittest discover -s tests -q
```

Record actual counts. Known baseline issue: 3 Baduk Node cp949 errors on Windows.

## Android JVM

```powershell
cd eduni-android-portal
.\gradlew.bat --no-daemon testDebugUnitTest
```

Expected: BUILD SUCCESSFUL (UP-TO-DATE)

## Whitespace

```powershell
git diff --check
```

Must pass.

---

# 3. Template content verification

Read the template in `app.py` and verify these elements exist:

### HTML elements
- `#shooterMission` — mission card container
- `#shooterMissionLabel` — "이번 문제" label
- `#shooterMissionText` — current target text
- `#shooterProgressText` — "X / 10" counter
- `#shooterProgressFill` — progress bar fill
- `#shooterStreak` — streak indicator
- `#shooterFeedback` — correct/wrong flash
- `#shooterResultStats` — result statistics container

### CSS classes
- `.shooter-mission` — mission card styling
- `.shooter-hud` — progress + streak container
- `.progress-bar` / `.progress-fill` — progress bar
- `.hud-streak` — streak styling
- `.shooter-feedback` — feedback flash
- `.result-stats` — result statistics grid
- `.shooter-feedback.correct` — green feedback
- `.shooter-feedback.wrong` — warm feedback
- `@keyframes feedback-pop` — feedback animation

### JavaScript state fields
- `state.correctCount`
- `state.attemptCount`
- `state.streak`
- `state.bestStreak`
- `state.roundGoal` (= 10)
- `state.feedbackTimer`

### JavaScript functions
- `updateHUD()` — updates progress text, fill bar, streak
- `showFeedback(type, text)` — shows correct/wrong flash
- `showResult(isSuccess)` — shows end-of-round statistics

---

# 4. State contract verification

For each contract, provide exact evidence (line number or test result):

### Mission card
- [ ] `chooseCurrent()` updates `#shooterMissionText`
- [ ] Mission does NOT contain answer Hanja (only meaning/sound)

### Progress
- [ ] `correctCount` increments only on correct hit
- [ ] `attemptCount` increments on every shot outcome (correct, wrong, top miss)
- [ ] `attemptCount` does NOT increment on pointer down/aim/cancel/restart
- [ ] Progress text shows `correctCount / 10`
- [ ] Progress fill width = `correctCount / 10 * 100 %`
- [ ] 10th correct triggers `showResult(true)`
- [ ] All bubbles cleared before 10 also triggers `finishGame(true)` → `showResult(true)`

### Streak
- [ ] Correct hit: `streak += 1`
- [ ] Wrong/miss: `streak = 0`
- [ ] `bestStreak` tracks max
- [ ] Streak >= 2 shows "연속 N"
- [ ] Streak >= 3 shows "연속 N 🔥"
- [ ] Restart: streak = 0, bestStreak = 0

### Attempts / Accuracy
- [ ] `attemptCount` increments exactly once per completed shot
- [ ] Accuracy = `correctCount / attemptCount * 100`, rounded
- [ ] Division by zero avoided

### Feedback
- [ ] Correct: green `.correct` class, "정답! +N" or "N연속! 잘했어! 🔥"
- [ ] Wrong: warm `.wrong` class, "아까워! 다시 찾아보자"
- [ ] Auto-hides after timeout
- [ ] Previous feedback cleared on new feedback

### Result screen
- [ ] Shows correct count, accuracy %, best streak, score
- [ ] "한 번 더!" button starts fresh round
- [ ] Game-over shows same structure with retry copy

### Restart safety
- [ ] All state fields reset (score, correctCount, attemptCount, streak, bestStreak)
- [ ] Progress text = "0 / 10"
- [ ] Overlay hidden, resultStats hidden, feedback hidden
- [ ] Generation incremented (stale callback protection)

---

# 5. Browser verification

Start a local test server on a free port (NOT production 8081).

### Desktop 1280×800

- [ ] Mission card visible with target text
- [ ] Mission does NOT reveal answer Hanja
- [ ] Progress starts at "0 / 10"
- [ ] Streak starts empty
- [ ] Correct hit: score +100, progress +1, streak +1, correct feedback visible
- [ ] Second consecutive correct: streak = 2
- [ ] Miss/wrong: attempt increments, progress unchanged, streak resets 0, one pressure bubble, miss feedback visible
- [ ] Restart resets all metrics (score=0, progress=0/10, streak=empty)
- [ ] 10th correct produces success result screen
- [ ] Result shows score/correct/accuracy/best streak
- [ ] "한 번 더!" starts clean round
- [ ] Zero console/page errors

### Mobile 360×800

- [ ] Mission visible
- [ ] HUD does not overflow
- [ ] Progress visible
- [ ] Buttons remain tappable
- [ ] Canvas playable
- [ ] Result overlay fits viewport
- [ ] No horizontal overflow
- [ ] Zero console/page errors

### Baduk

- [ ] `/baduk` loads
- [ ] 9×9 board visible
- [ ] Zero console errors

---

# 6. No Android UI changes

Verify:

- [ ] `NativeBubbleShooterActivity.java` not modified
- [ ] Android Canvas drawing not modified
- [ ] Android layout not modified

---

# 7. No production changes

Verify:

- [ ] `docker-compose.yml` not modified
- [ ] `nice-gui-1-1-7/Dockerfile` not modified
- [ ] Production 8081 not touched
- [ ] Production 8080 not touched

---

# 8. No unrelated diff

Verify diff contains ONLY:

- `nice-gui-1-1-7/app.py`

No changes to Baduk, portal, canonical dataset, shared logic, Android, deployment config.

---

# 9. Report

Create:

`BUBBLE_SHOOTER_PHASE3_VERIFY_REPORT.md`

Include:

- verification date
- branch verified
- implementation SHA
- automated test totals
- template content checklist (with pass/fail for each element)
- state contract checklist (with pass/fail for each contract)
- browser desktop results
- browser mobile results
- baduk smoke
- Android unchanged confirmation
- production unchanged confirmation
- diff scope confirmation

Final verdict exactly one of:

- `PHASE3 VERIFY PASS — READY FOR MERGE`
- `PHASE3 VERIFY FAIL`
- `BLOCKED`

Do not merge.
Do not deploy.
