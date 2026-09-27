# EDUNI Mobile Game Polish — Implement 56

## Mission

Polish the unfinished mobile experience of three EDUNI games:

1. `/link` — **의준 링크**
2. `/bubble` — **버블 게임**
3. `/bubble-shooter` — **한자 슈터**

Repository: `JongPyoShin/eduni-links`
Branch: `feature/eduni-mobile-game-polish`

Branch baseline:

`6024366fdc0199b239269bb11609eaa7861bdc3b`

The user specifically reported:

- On mobile, **의준 링크 looks too small because the permanent left action panel consumes valuable width.**
- **버블 게임 is effectively not visible / unusable on the mobile screen.**
- **한자 슈터 looks visually outdated and needs a modern redesign.**

This task is product implementation + local verification only.

Do not merge.
Do not deploy.
Do not touch production 8081.
Do not touch host 8080.
Do not touch AI-2 work.
Do not modify unrelated games.

## Read first

Read:

- `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `nice-gui-1-1-7/portal_app/routes.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_link.html`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`
- `nice-gui-1-1-7/tests/test_routes.py`
- any existing tests that directly cover bubble/link/shooter

Before changing code, inspect the actual rendered DOM of all three pages in a local browser.
Do not assume CSS-only causes without reproducing them.

---

# A. Shared mobile quality contract

All three games must satisfy the following on mobile:

### Required viewport support

Verify at minimum:

- portrait: approximately `360×800`
- portrait: approximately `390×844`
- portrait: approximately `412×915`
- landscape: approximately `800×360`

Use CSS viewport dimensions, not outer browser window dimensions.

### Layout contract

At each viewport:

- no horizontal scrollbar
- no essential control clipped off-screen
- no game board/canvas hidden below a fixed wrapper
- no content rendered at desktop scale then shrunk unreadably
- safe-area insets respected
- touch targets are comfortably tappable
- text does not overlap controls
- overlays/modals fit within viewport and can scroll internally if needed
- back/close/restart controls remain reachable

### Mobile interaction contract

- touch remains the primary interaction
- no hover-only functionality
- no accidental page zoom requirement
- no control requires pixel-perfect tapping
- orientation change/resizing recalculates the game layout safely

### Visual contract

Use a cohesive, modern EDUNI visual language:

- child-friendly
- clean
- playful but not cluttered
- rounded cards/buttons
- strong contrast
- large readable labels
- subtle depth/gradients
- modern spacing
- system fonts only; no new CDN dependency

Do not make the games visually identical, but they should feel like the same product family.

---

# B. 의준 링크 — remove mobile left-panel penalty

Primary file:

`nice-gui-1-1-7/portal_app/static_games/eduni_link.html`

## Current problem

The game currently uses a permanent two-column layout:

- left `.side-actions`
- right `.play-area`

with a fixed `--side-w` (roughly 64–96 px depending on viewport).

On narrow phones this permanently sacrifices a large share of usable width, making the board look unnecessarily small.

## Required mobile redesign

### 1. No permanent left sidebar on narrow mobile

For narrow/mobile layouts, remove the permanent side-column footprint.

The play area must use essentially the full available screen width.

Do NOT simply reduce `--side-w` to an even smaller unusable strip.

Preferred mobile UX:

- move primary actions into a compact **bottom action dock**
- keep the board centered and dominant
- use safe-area bottom padding
- the dock must not cover game tiles

### 2. Simplify mobile actions

The current sidebar exposes many controls at once.

For mobile, show only the most frequently needed actions directly, for example:

- 일시정지
- 힌트
- 섞기
- 더보기

Move secondary controls into a compact sheet/modal/menu opened by **더보기**, including:

- 새 게임
- 도감
- 부모 메뉴
- 소리

Equivalent UX is acceptable if all existing actions remain available.

Do not remove functionality.

### 3. Preserve desktop/tablet behavior

Desktop/wide layouts may keep the current side toolbar if it still works well.

Use an intentional breakpoint based on actual available layout width, not user-agent sniffing.

### 4. Maximize game board

On mobile:

- board should receive the majority of viewport area
- top status area should become more compact
- avoid tall decorative chrome
- `resizeBoardAndCanvas()` must calculate tile size from the new real available game-panel dimensions
- no tile may render outside the board container
- connecting path canvas must stay aligned after resize/orientation change

### 5. Modal behavior

Codex, parent menu, result, pause, etc.:

- must fit 360 px width
- must not require horizontal scrolling
- internal vertical scrolling is allowed
- action buttons remain visible/reachable

### 6. Regression protection

Preserve:

- tile linking rules
- path drawing
- hints
- shuffle
- stages
- score
- combo
- timer
- pause
- sound
- codex
- parent settings
- localStorage persistence
- face images
- all current game data

Do not rewrite the game engine.

---

# C. 버블 게임 — make mobile actually visible and playable

Primary source:

`nice-gui-1-1-7/app.py`

Relevant template:

`BUBBLE_HTML_TEMPLATE`

Route:

`/bubble`

## Current problem

The user reports that on mobile the Bubble game screen is not visible/usable.

The current implementation mixes:

- NiceGUI/Quasar outer wrappers
- global fixed/full-height assumptions
- `overflow: hidden`
- a shell with viewport-derived height
- large prompt/bubble sizing

This must be reproduced in the browser and corrected based on the real runtime DOM.

## Required implementation

### 1. Fix the actual root sizing problem

Inspect the runtime DOM generated by NiceGUI.

Ensure the game owns the usable viewport correctly across relevant wrappers.

Do not blindly add more `overflow:hidden`.

Audit wrappers such as the actual NiceGUI/Quasar root/page/content elements and remove unintended:

- default padding
- margins
- min-height conflicts
- wrapper scroll clipping

The game root must be visible immediately after route load.

### 2. Full mobile fit

On portrait phone:

- header visible
- question visible
- bubble answer field visible
- feedback visible
- bottom actions visible

All at once where reasonable.

If the vertical height is very short, prefer compacting chrome rather than hiding the core game.

### 3. Bubble sizing

Current answer bubbles can be too large on narrow screens.

Make mobile bubble sizing responsive to:

- field width
- field height
- answer count

Requirements:

- every answer bubble remains fully or substantially tappable
- bubbles must not permanently render outside the visible field
- no severe overlap that blocks a choice
- text inside bubbles remains readable
- animation remains smooth

Do not solve by making answer text tiny.

### 4. Position generation

If the current random/absolute placement can place options outside the usable area on narrow screens, make placement bounds depend on the actual measured field dimensions.

On resize/orientation change, preserve a valid visible arrangement.

### 5. Short-height landscape

At approximately 800×360:

- prompt must not consume excessive height
- answer field still has usable height
- action buttons remain reachable

### 6. Preserve behavior

Keep:

- question data
- correctness logic
- 10-round flow
- score/stars
- feedback
- answer explanation
- sound toggle
- restart
- animations

Do not change learning content semantics.

---

# D. 한자 슈터 — modern UI redesign

Primary source:

`nice-gui-1-1-7/app.py`

Relevant template:

`SHOOTER_HTML_TEMPLATE`

Supporting logic:

`nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js`

Route:

`/bubble-shooter`

## Goal

Keep the underlying shooter game mechanics, but replace the outdated visual presentation with a polished modern mobile-first arcade UI.

The result should look like a current EDUNI children's game, not a legacy web demo.

## Design direction

Use a bright modern arcade visual system, for example:

- deep navy / blue-violet game background
- cyan / mint / yellow accent colors
- soft glass-like cards
- strong rounded corners
- restrained shadows/glow
- large target Hanja card
- compact score/progress chips
- polished launcher/cannon area
- clearer aim path
- readable bubbles
- visually distinct correct/wrong feedback

Avoid:

- dated flat gray boxes
- tiny labels
- dense text blocks
- excessive borders
- desktop form-like controls
- retro browser-game appearance

No external graphics dependency is required.

CSS shapes/canvas/system fonts are preferred.

## Required layout

On mobile portrait, structure the game around:

1. **compact top HUD**
   - progress/round
   - score/stars/status as appropriate

2. **target card**
   - target Hanja visually dominant
   - reading/question prompt clearly secondary

3. **main shooter canvas**
   - largest area of the screen
   - bubbles remain large enough to read/tap/aim
   - cannon/launcher visually centered and clear

4. **compact bottom controls**
   - sound/restart or required controls
   - no tall footer

### Feedback

Correct/wrong/result feedback should feel integrated:

- concise
- large enough to read
- no giant modal covering the game unnecessarily for routine feedback

Final/result overlays may be modal.

## Game logic must remain stable

Preserve:

- canonical question loading
- target/answer mapping
- collision rules
- aiming
- wall bounce
- shot physics
- scoring
- round progression
- sound
- praise characters
- explanations
- correct/wrong behavior
- shared shooter JS contract

Do not replace the gameplay engine just for visual modernization.

Only change JS when necessary for responsive sizing/layout integration.

---

# E. Portal launch compatibility

Do not change canonical routes:

- `/link`
- `/bubble`
- `/bubble-shooter`
- `/portal`

Portal cards must still launch the same routes.

Do not change static public redirect behavior unless required for a verified bug.

No port change.

---

# F. NiceGUI game-page full-bleed contract

For `/bubble` and `/bubble-shooter`, explicitly verify the NiceGUI shell does not add visible desktop-style whitespace/padding around the game on mobile.

If required, add narrowly scoped page/game CSS to make only these game routes full-bleed.

Do not globally break normal Portal/Reading pages.

Add/update viewport meta to include safe mobile behavior such as `viewport-fit=cover` where appropriate.

---

# G. Automated tests

Add focused regression tests for the mobile contracts.

Tests should verify at least:

## Link

- mobile breakpoint no longer keeps a permanent two-column side panel
- mobile bottom/compact actions exist
- all previous actions remain wired/reachable
- board resize handler remains present

## Bubble

- route remains declared
- responsive/mobile layout contract exists
- viewport-fit/mobile root sizing is present
- core header/stage/actions remain present
- no regression to question flow identifiers

## Shooter

- route remains declared
- redesigned mobile layout classes/sections exist
- core shooter canvas/target/HUD controls remain present
- shooter logic script remains included
- game route still uses canonical question dataset

Prefer behavior/source contract tests over brittle exact-color assertions.

Run at minimum:

~~~powershell
cd nice-gui-1-1-7
python -m unittest tests.test_routes
python -m unittest tests.test_ai
python scripts/validate_content.py
$env:PYTHONUTF8='1'
python -m unittest discover -s tests
Remove-Item Env:PYTHONUTF8
python -m compileall -q portal_app tests app.py
cd ..
git diff --check
~~~

If a new focused test module is added, run it explicitly too.

Record exact totals.

---

# H. Browser acceptance — mandatory

Browser verification is mandatory for this task.

Use an isolated local high port only.

Never:

- use production 8081
- touch host 8080

Verify each route:

- `/link`
- `/bubble`
- `/bubble-shooter`

at all required viewport groups.

At minimum capture screenshots for:

- 390×844 portrait for each game
- 800×360 landscape for each game

## Link acceptance

At 390×844:

- no permanent left-side action strip consuming board width
- board clearly larger than before
- primary controls reachable
- secondary controls reachable
- no horizontal overflow
- board/path alignment correct

## Bubble acceptance

At 390×844:

- actual game is visible immediately
- question visible
- answer bubbles visible
- bottom actions visible
- tap interaction works
- no horizontal overflow

At 800×360:

- playable field remains visible
- no critical vertical clipping

## Shooter acceptance

At 390×844:

- clearly redesigned modern UI
- target Hanja readable
- shooter/canvas dominant
- HUD compact
- bubbles readable
- controls reachable

At 800×360:

- shooter remains playable
- no critical clipping
- aiming/shot still works

For all three:

- no uncaught JS errors
- no serious console errors
- no 404 for required static assets

If possible, test one physical mobile browser without production deployment using an isolated reachable dev endpoint.
If not available, headed browser mobile emulation is sufficient for Implement 56.

---

# I. Scope guard

Expected product files include primarily:

- `nice-gui-1-1-7/portal_app/static_games/eduni_link.html`
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_bubble_shooter_logic.js` only if needed
- focused test files

Do not modify:

- Reading Journal behavior
- AI-1/AI-2
- PostgreSQL schema
- Docker Compose
- deployment scripts
- ports
- Hanja dataset content
- Jungle
- Omok
- other unrelated games
- Android native implementation unless a reproduced Android-only blocker proves it is required

If another product file must change, explain why in the report.

---

# J. Report

Create:

`EDUNI_MOBILE_GAME_POLISH_IMPLEMENT_REPORT_56.md`

Include:

- exact base SHA
- exact changed files
- reproduced root cause for each game
- Link mobile toolbar redesign
- Bubble visibility/root-layout fix
- Bubble responsive placement/sizing changes
- Shooter visual redesign summary
- preserved gameplay contracts
- focused test totals
- full suite totals/skips
- browser viewport matrix
- screenshot paths
- console/runtime errors
- remaining limitations
- confirmation production 8081 untouched
- confirmation host 8080 untouched
- confirmation no merge/deploy occurred

Commit product/test/report changes and push to:

`feature/eduni-mobile-game-polish`

Do not create a PR yet.
Do not merge.
Do not deploy.

## Final verdict

Use exactly one:

`EDUNI MOBILE GAME POLISH IMPLEMENT PASS — READY FOR VERIFY`

`EDUNI MOBILE GAME POLISH IMPLEMENT FAIL`

`BLOCKED`

Stop after commit/push.
