# EDUNI Bubble Shooter Phase 3 — Visible UX Upgrade (Prompt 37)

## Objective

Make Bubble Shooter visibly feel like a new version.

Phase 1 fixed gameplay correctness.
Phase 2 unified data/rules and production packaging.
Phase 3 must deliver **user-visible, child-friendly UX improvements** on Web.

This is a **Web-first UX phase**.

Do not change Android UI in this task.
Do not deploy production.
Do not merge without explicit authorization.

---

## Repository / base

Repository:

`JongPyoShin/eduni-links`

Base branch:

`feature/eduni-space-mvp`

Current base HEAD at prompt creation:

`989a6982bdbe5bb77a664db96d70909db27234c8`

Create a dedicated branch:

`feature/bubble-shooter-phase3-visible-ux`

Create a Draft PR targeting:

`feature/eduni-space-mvp`

Suggested PR title:

`WIP: Bubble Shooter Phase 3 — visible child UX upgrade`

---

# 1. Preserve all Phase 1 / Phase 2 behavior

Before changing UI, verify current runtime contracts remain intact:

- correct hit = +100
- correct hit removes the hit bubble
- correct hit does **not** add pressure
- miss/wrong hit adds exactly one pressure bubble
- restart race remains generation-safe
- canonical dataset remains 122 entries
- no legacy fallback in packaged runtime
- shared logic remains:
  - `resolveShot`
  - `isDanger`
  - `selectTarget`
  - `pointerToCss`
  - `cssToLogical`
  - `isGenerationValid`

Do not weaken or duplicate Phase 2 contracts.

---

# 2. UX goal

When a user opens:

`/bubble-shooter`

they should immediately recognize a new version.

The experience is for an early-elementary child.

Prioritize:

- very clear current target
- visible progress
- immediate success/failure feedback
- simple motivation
- minimal reading burden
- large touch targets
- no clutter

Do not redesign it into an adult dashboard.

---

# 3. Add a visible target mission card

The current target is mostly conveyed in status text and the cannon bubble.

Add a clear mission card above or integrated directly above the play field.

Required information:

- label: `이번 문제`
- prominently display the current reading/meaning, e.g. `집 가`
- child-facing instruction such as:
  `맞는 한자 버블을 찾아 쏴!`

Add stable test selectors, e.g.:

- `#shooterMission`
- `#shooterMissionLabel`
- `#shooterMissionText`

The card must update whenever `chooseCurrent()` selects a new target.

Do not show the answer Hanja itself in the mission card.

---

# 4. Add round progress

Introduce a short visible round goal so play has a clear endpoint.

Use:

`10 correct answers = one round complete`

Add state fields such as:

- `correctCount`
- `roundGoal = 10`

Add a visible progress component:

`3 / 10`

and a progress bar.

Suggested selectors:

- `#shooterProgressText`
- `#shooterProgressFill`

Rules:

- increment only on correct hit
- miss does not increment
- restart resets to 0
- progress never exceeds 10
- after the 10th correct answer, finish the round with a success result screen
- do not require clearing every board bubble to complete the new child-facing round

If all bubbles are cleared before 10 for any edge case, treat it as successful round completion.

---

# 5. Add streak / combo feedback

Track consecutive correct answers.

State:

- `streak`
- `bestStreak`

Rules:

- correct hit -> streak +1
- miss/wrong hit -> streak resets to 0
- restart -> current streak resets to 0
- bestStreak resets for a fresh round

Important:

Do **not** change the Phase 1 score contract.
A correct answer is still +100.

The streak is a visual motivational metric only.

Show:

- `연속 2`
- `연속 3 🔥` for meaningful streaks

Suggested selector:

- `#shooterStreak`

Keep copy simple and child-friendly.

---

# 6. Add visible correct / wrong feedback

Current feedback exists, but the result should feel much more obvious.

## Correct

On correct hit:

- brief green/positive stage flash or banner
- praise text
- visible `+100`
- streak indicator updates immediately
- existing praise character may remain

Suggested stable element:

- `#shooterFeedback`

Example copy:

`정답! +100`

For streak >= 3:

`3연속! 잘했어! 🔥`

## Wrong / miss

On miss or wrong Hanja:

- brief warm/red/orange feedback
- clear copy:
  `아까워! 다시 찾아보자`
- streak resets visibly
- pressure-bubble behavior remains exactly as Phase 1

Do not use punitive language.

Do not block the game with a modal after every wrong answer.

---

# 7. Improve end-of-round result screen

When 10 correct answers are reached, show a visually distinct success overlay.

Display:

- `스테이지 완료!`
- score
- correct count
- attempts
- accuracy
- best streak

Example:

```text
스테이지 완료!
정답 10개
정확도 83%
최고 연속 4
점수 1000
```

Add:

- `한 번 더!` button
- restart must begin a fresh round

Suggested selectors:

- `#shooterResultStats`
- `#shooterNextButton`

Game-over from danger line should use the same result structure, but copy should indicate retry rather than success.

---

# 8. Track attempts and accuracy correctly

Add:

- `attemptCount`

Increment exactly once for every completed shot outcome:

- correct hit
- wrong bubble hit
- top miss

Do not increment on:

- pointer down
- aiming
- cancelled pointer
- restart

Accuracy:

`correctCount / attemptCount * 100`

Round to a whole percent.

Avoid division by zero.

---

# 9. Visual polish

Improve the existing visual hierarchy without rewriting the whole game.

Required:

- mission card visually distinct from score
- progress bar visually obvious
- score / progress / streak fit together as one compact HUD
- result overlay looks celebratory on success
- responsive layout at:
  - Desktop 1280×800
  - Mobile 360×800

Keep the existing canvas and aiming mechanics.

Do not add heavy libraries.

Use existing CSS/DOM/canvas only.

Avoid excessive animation.

Respect `prefers-reduced-motion` where practical.

---

# 10. Child-friendly copy

Use short Korean copy.

Preferred style:

- `이번 문제`
- `맞는 한자 버블을 찾아 쏴!`
- `정답! +100`
- `아까워! 다시 찾아보자`
- `연속 3 🔥`
- `스테이지 완료!`
- `한 번 더!`

Avoid long explanation text during active play.

Existing explanation support may remain available for result/learning contexts.

---

# 11. Keep current answer visibility correct

The cannon/shot bubble may continue to show the reading/meaning.

The board bubbles continue to show Hanja.

The mission card must **not reveal the answer Hanja**.

Add a browser assertion for this.

---

# 12. State reset / restart safety

Extend restart coverage.

After restart require:

- score = 0
- correctCount = 0
- attemptCount = 0
- streak = 0
- bestStreak = 0
- progress text = 0 / 10
- stale praise/feedback callbacks cannot mutate the new round
- old generation callbacks cannot finish or increment the new round

Use the existing generation mechanism.
Do not create an unrelated second stale-callback system.

---

# 13. Phase 3 browser tests

Add automated browser/regression coverage for visible UX.

Minimum Desktop 1280×800 checks:

- mission card visible
- mission does not contain answer Hanja
- progress starts 0/10
- streak starts 0
- correct hit:
  - score +100
  - progress +1
  - streak +1
  - correct feedback visible
- second consecutive correct:
  - streak = 2
- miss/wrong:
  - attempt increments
  - progress unchanged
  - streak resets 0
  - one pressure bubble added
  - miss feedback visible
- restart resets all metrics
- 10th correct produces success result screen
- result shows score/correct/accuracy/best streak
- `한 번 더!` starts clean round
- zero console/page errors

Minimum Mobile 360×800 checks:

- mission visible
- HUD does not overflow
- progress visible
- buttons remain tappable
- canvas playable
- result overlay fits viewport
- no horizontal overflow
- zero console/page errors

Use reliable canvas interaction:

`locator.click(position)`

Do not use `page.mouse` if it bypasses the current pointer chain.

---

# 14. Unit/integration coverage

Extend current tests as needed.

Do not move product logic into tests.

At minimum cover deterministic state semantics for:

- progress increment
- miss leaves progress unchanged
- streak increment/reset
- attempts
- accuracy calculation
- round completion at 10
- restart reset

A small Web-only pure helper is acceptable if it genuinely improves testability.

Do not alter shared shot-resolution contract merely for UI metrics.

---

# 15. Regression gates

Re-run all existing Bubble Shooter suites.

Required:

## JS

Existing:

- `bubble_shooter_logic.test.mjs`
- `contract_fixture_runner.test.mjs`

Plus Phase 3 tests.

## Python

- Bubble Shooter integration
- routes
- packaging regression
- content validation
- full discovery, recording known baseline issues separately

## Android JVM

Phase 3 does not change Android UI, but run existing JVM tests to prove no cross-platform contract regression.

Expected current baseline:

- Android JVM: 43/43

## Whitespace

`git diff --check`

Must pass.

---

# 16. No Android UI implementation in Prompt 37

Do not modify:

- `NativeBubbleShooterActivity.java` visual layout
- Android Canvas drawing
- Android app navigation

Reason:

There is no physical Android device available now.

Phase 3 first establishes and validates the visible Web UX.

After the user reviews the Web result, Android visual parity can be a separate phase.

Shared rule behavior must remain compatible.

---

# 17. Do not deploy production

Prompt 37 is implementation + verification only.

Do not:

- restart 8081
- recreate production container
- deploy to production
- modify 8080
- install Android APK

Use an isolated local/test server for browser QA.

---

# 18. Report

Create:

`BUBBLE_SHOOTER_PHASE3_VISIBLE_UX_REPORT.md`

Include:

- branch
- base SHA
- final implementation SHA
- PR number
- screenshots not required, but browser evidence required
- before/after UX summary
- mission card behavior
- progress behavior
- streak behavior
- attempt/accuracy behavior
- round completion behavior
- restart/generation safety
- desktop browser totals
- mobile browser totals
- JS totals
- Python totals
- Android JVM totals
- diff scope
- remaining risks

Final verdict exactly one of:

- `PHASE3 IMPLEMENTATION PASS — READY FOR INDEPENDENT VERIFY`
- `BLOCKED`
- `FAIL`

---

# 19. Prepare Prompt 38

If and only if Phase 3 implementation passes, create:

`.agent/PROMPT_EDUNI_BUBBLE_SHOOTER_PHASE3_VERIFY_38.md`

Prompt 38 must be **verification-only**.

It must independently verify:

- all new visible UX requirements
- 10-answer round semantics
- streak/attempt/accuracy math
- restart/generation safety
- mission does not expose answer Hanja
- Desktop + Mobile browser behavior
- no Phase 1/2 regression
- no Android UI changes
- no unrelated Baduk/portal/deployment diff
- base behind_by = 0

Do not merge.
Do not deploy.
