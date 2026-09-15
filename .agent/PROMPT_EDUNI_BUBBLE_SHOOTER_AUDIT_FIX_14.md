# EDUNI Bubble Shooter Phase 1 — Audit + Stabilization

Work only on branch:

`feature/bubble-shooter-audit-fix`

Base branch:

`feature/eduni-space-mvp`

Expected starting parent is the merged Baduk save/resume state (`26757fa00fd35607c3639546b5acd1511bc19ccf`) or a later fast-forward of the same base. Fetch first and report the actual HEAD before changing code.

Do **not** merge this work automatically.

## 0. Read first

Read and obey:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`

Then inspect the existing Bubble Shooter implementations before editing:

- `nice-gui-1-1-7/app.py`
  - `SHOOTER_HTML_TEMPLATE`
  - `shooter_html()`
  - `/bubble-shooter`
  - `load_bubble_questions()`
- `nice-gui-1-1-7/tests/test_routes.py`
- `nice-gui-1-1-7/portal_app/routes.py` portal card/link
- `eduni-android-portal/app/src/main/java/com/eduni/portal/MainActivity.java`
- `eduni-android-portal/app/src/main/java/com/eduni/portal/NativeBubbleShooterActivity.java`
- `eduni-android-portal/app/src/main/AndroidManifest.xml`

Important architectural fact: the web route `/bubble-shooter` is a NiceGUI/Canvas game, but the Android portal intercepts Bubble Shooter URLs and opens `NativeBubbleShooterActivity`. Treat these as two implementations of the same game. Do not assume a web-only fix reaches Android users.

## 1. Goal

Stabilize Bubble Shooter before adding flashy new features.

The Phase 1 target is:

1. make the core turn rules explicit and consistent,
2. fix mobile/canvas aiming correctness,
3. make the web game logic regression-testable,
4. check Android parity for the same core mechanics,
5. preserve the existing Hanja learning experience and routes,
6. produce a browser-tested Draft PR.

This is **not** a visual redesign phase and **not** the combo/stage/power-up phase.

## 2. Canonical game contract

Use the following behavior as the Phase 1 contract unless current code proves a rule is required for compatibility. If deviating, document why.

### Correct shot

- A shot hitting the requested Hanja bubble is correct.
- Remove exactly that target bubble.
- Add `+100` score exactly once.
- Show the existing short praise feedback.
- **Do not add a replacement/pressure bubble for a correct answer.**
- After praise completes, choose the next target from the remaining live bubbles.
- If there are no live bubbles, finish with clear/success state.

Reason: a child must feel visible progress for a correct answer. The current web flow appears to remove one bubble and then call a turn function that adds one back, which can make a correct answer feel like no progress.

### Wrong shot / miss

- Do not remove the target bubble.
- Do not award score.
- Give concise retry feedback.
- Add exactly one pressure bubble / advance pressure exactly once.
- Then choose the next valid target if the game is still alive.
- If the danger line is crossed, finish game exactly once.

### State safety

For one physical/user shot:

- exactly one hit/miss resolution,
- exactly one score mutation,
- at most one pressure-row mutation,
- at most one delayed praise continuation,
- no turn may continue after `gameOver`,
- restart/new game must invalidate or safely ignore any delayed callback from the previous game.

Do not allow a stale praise timeout to mutate a newly restarted game.

## 3. Target-selection rules

Keep the beginner-friendly behavior of selecting a target from the visually accessible/front-most live row.

Verify:

- the requested Hanja actually exists among live bubbles,
- the selected target is not already popped/removed,
- an empty live set finishes the game instead of throwing,
- resize/re-layout does not leave `current` pointing at an invalid bubble,
- no `undefined`, `NaN`, or empty target text is shown.

Do not add advanced path-finding or physics AI.

## 4. Web Canvas coordinate audit — important

Audit `resizeCanvas()`, `pointerPoint()`, CSS canvas sizing, DPR handling, and shot collision coordinates.

The current implementation uses CSS pointer coordinates but also clamps internal logical canvas dimensions to minimum values (for example 320x480). This can cause aiming/collision offsets when the rendered CSS canvas is smaller than the logical coordinate system.

Fix the coordinate contract so that:

- pointer/touch position and game logical position are always in the same coordinate system,
- DPR changes only backing-store resolution, not logical hit/aim coordinates,
- portrait mobile works,
- landscape mobile works,
- resize/orientation change re-lays out bubbles without corrupting the current game,
- no dead strip or offset aiming near canvas edges.

Prefer a small explicit helper such as CSS-point -> logical-point conversion if needed.

Do not solve this with hard-coded device-specific offsets.

## 5. Web code structure / testability

Do not leave all critical rules untestable inside one giant HTML string.

Extract the **minimum useful pure logic** into a shared/testable JavaScript module under something like:

`nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`

Possible responsibilities:

- target/front-row selection,
- correct vs miss turn outcome,
- score delta,
- whether to add pressure,
- danger/game-over decision inputs,
- coordinate conversion helpers if pure.

Keep DOM/canvas drawing in the page implementation.

Do **not** perform a broad rewrite of all `app.py` games. Do not refactor Tetris, `/bubble`, Baduk, Jungle, Facto, etc.

If moving the complete shooter template out of `app.py` is clearly safer and reduces duplication, a small `portal_app/bubble_shooter.py` extraction is allowed, but only for Bubble Shooter. Preserve `/bubble-shooter` behavior and launch path.

## 6. Android parity

Because `MainActivity` intercepts `/bubble-shooter` and launches `NativeBubbleShooterActivity`, inspect the native implementation against the canonical game contract.

For Phase 1:

- align **core progression semantics** between web and native:
  - correct removes one and does not add pressure,
  - miss adds one pressure bubble,
  - +100 only once for a correct answer,
  - clear/game-over happens once,
  - restart cannot receive a stale previous-turn callback.
- preserve native landscape mode and controller support.
- do not redesign Android UI.
- do not replace the native implementation with WebView in this phase.
- do not change app routing/interception unless a concrete bug requires it.

### Question data difference

The web version loads Hanja quiz JSON via `load_bubble_questions()`, while native currently contains a hard-coded Hanja/sound pair list.

Do **not** build a new network/API sync architecture in Phase 1.

Instead:

1. document this divergence in the final report,
2. verify native target prompts are internally consistent with its own bubble list,
3. keep the web JSON bank as the canonical web learning source,
4. propose data unification as a later phase unless a tiny safe shared asset solution already exists in the repo.

Do not expand Phase 1 into a content migration project.

## 7. Feedback / UX constraints

Keep feedback child-friendly and short.

Preserve:

- current score display,
- praise pop,
- sound toggle,
- restart button,
- answer/explanation UI if currently used,
- Hanja + 뜻/음 learning intent.

Improve only where needed for clarity:

- clearly distinguish correct vs miss,
- ensure controls stay usable at 360px width,
- ensure no overlay permanently traps the game,
- ensure restart always works from normal play, praise wait, clear, and game-over states.

Do not add combo systems, levels, stars, power-ups, boss rounds, persistence, telemetry, login, server state, camera, mic, location, or external uploads in this phase.

## 8. Tests — required

Add focused tests. Route existence alone is not sufficient.

### JavaScript unit tests

Create something like:

`nice-gui-1-1-7/tests/bubble_shooter_logic.test.mjs`

At minimum cover:

1. correct result => remove target / +100 / no pressure,
2. miss result => no score / pressure exactly once,
3. target selection only chooses a valid front/live bubble,
4. zero live bubbles => clear outcome,
5. danger condition => game-over outcome,
6. coordinate conversion is correct when CSS size != logical/backing size,
7. DPR does not alter logical pointer coordinates,
8. turn result cannot double-apply when resolved twice,
9. stale generation/session token (if used) blocks old delayed continuation after restart.

### Python/integration tests

Add a focused Python integration test, for example:

`nice-gui-1-1-7/tests/test_bubble_shooter_integration.py`

Verify at minimum:

- `/bubble-shooter` remains declared,
- page/runtime includes the shared Bubble Shooter logic,
- question fallback remains safe,
- source does not accidentally depend on server persistence,
- expected restart/pointercancel/mobile contracts remain present,
- existing `/bubble` remains untouched.

If the implementation shape differs, test equivalent contracts rather than string trivia.

### Android verification

If Android source is modified, add or update the smallest practical test/static verification available in this repository. If no automated Android unit harness exists, document that fact and require emulator/browser-equivalent manual verification instead of pretending it was tested.

## 9. Browser QA — required

Run the actual app and test the real `/bubble-shooter` route.

Required viewports:

- desktop around 1280x800,
- portrait mobile 360x800,
- landscape mobile around 800x360.

Verify:

### Basic play

- page loads with no console error,
- Hanja bubbles render,
- prompt target exists on screen,
- drag/aim line follows pointer/touch accurately,
- releasing fires in the intended direction,
- wall bounce/collision works if present,
- edge aiming has no coordinate offset.

### Correct flow

- hit correct bubble,
- exactly +100,
- exactly one bubble disappears,
- no replacement pressure bubble is added for that correct answer,
- praise appears once,
- next target becomes playable,
- repeated correct answers visibly reduce live bubble count,
- clearing all bubbles reaches success state.

### Miss flow

- wrong bubble or miss does not add score,
- target remains,
- exactly one pressure bubble/advance occurs,
- game continues unless danger line is crossed.

### Restart race check

Specifically test:

1. hit a correct bubble,
2. while praise/delayed continuation is pending, press restart,
3. wait longer than the old praise timeout,
4. verify the new game is not mutated by the previous game callback.

### Responsive

- 360x800: no horizontal scroll, controls tappable, canvas not clipped,
- 800x360: game remains playable and major controls visible,
- orientation/resize does not make aim coordinates drift.

Capture screenshots for desktop, portrait, and landscape.

## 10. Route / regression smoke

Verify HTTP 200 or equivalent successful render for:

- `/`
- `/bubble`
- `/bubble-shooter`
- `/portal`

Also verify portal Bubble Shooter link still resolves correctly.

Do not change the public static redirect contract for `bubble-shooter/index.html` unless a verified bug requires it.

## 11. Validation commands

Run focused tests first, then full validation once before commit.

Expected focused commands (adjust only if filenames differ):

```bash
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
```

Then:

```bash
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

Known unrelated Windows `cp949` failures must be reported precisely if encountered; do not hide them and do not rewrite unrelated files merely to make them disappear.

## 12. Deliverables

On the feature branch:

1. implementation changes,
2. focused tests,
3. browser QA evidence/screenshots if the workflow stores them,
4. report:

`BUBBLE_SHOOTER_PHASE1_AUDIT_FIX_REPORT.md`

The report must include:

- verified branch + commit,
- files changed,
- original defects/findings,
- exact gameplay contract after fix,
- web/native differences that remain,
- automated test results,
- browser QA results by viewport,
- console errors count,
- route smoke results,
- remaining risks,
- recommendation: `MERGE READY` or `DO NOT MERGE`.

## 13. PR

Open a **Draft PR**:

- head: `feature/bubble-shooter-audit-fix`
- base: `feature/eduni-space-mvp`
- title suggestion: `WIP: stabilize Bubble Shooter gameplay and mobile aiming`

Do not merge automatically.

## Acceptance criteria

PASS only if all of the following are true:

- correct answers visibly reduce bubble count,
- misses increase pressure exactly once,
- score changes exactly once per correct answer,
- target always maps to a live visible bubble,
- mobile aim coordinates are correct at CSS/backing-size differences,
- restart cannot be corrupted by stale delayed callbacks,
- web Bubble Shooter has focused automated logic tests,
- Android native core progression semantics are verified/aligned where necessary,
- `/bubble-shooter` and existing routes remain compatible,
- desktop + portrait + landscape browser QA pass,
- no new console/runtime error,
- no unrelated broad refactor.

If any required item was not actually executed, mark it `NOT VERIFIED`, not PASS.
