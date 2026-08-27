# Jungle Camp — Web Canvas 2.5D PoC

Lightweight Jungle **Camp** prototype built with vanilla JavaScript + HTML5 Canvas 2D/2.5D.
No game engine, no backend. Reference architecture: `boona13/mykonos-island-voxels`
(architecture only — visual identity is original).

## Single Source Contract (primary requirement)

The walkable geometry and the **visible** path are driven by **one** object:
`CampWorldGeometry` (`src/geometry.js`).

- Walkability: `geometry.isWalkable(x, y)` (point within `pathHalfWidth` of the path
  centerline **or** inside a clearing circle).
- Visible path: `drawWalkablePath()` strokes the exact same `geometry.paths` /
  `geometry.clearings` arrays with a band of width `2 * pathHalfWidth * zoom`.

There is no separate collision path and visual path — both read the same source.

## Run

A static server is required (ES modules + asset loading need http, not `file://`):

```bash
cd jungle-web-canvas-poc
node server.mjs
# open http://localhost:8123
```

(or `npx serve .` / `python -m http.server` from this folder)

## Controls

- Move: Arrow keys / on-screen D-pad
- Interact: `A` / `Enter` / `Space` (when near the Bluebird)
- Close modal: `B` / `Escape`
- Toggle geometry debug overlay: `` ` ``

## Movement contract

Deterministic acceleration ramp (no inertia, no slide, no decel):

| held time | ratio |
|-----------|-------|
| 0–100 ms  | 0.45 (PRECISION) |
| 100–500 ms | linear 0.45 → 0.75 |
| 500 ms+   | 0.75 (CRUISE) |

Release = immediate zero. Reversal = immediate direction change + ramp restarts.

```
PRECISION_RATIO = 0.45
CRUISE_RATIO    = 0.75
PRECISION_HOLD_MS = 100
ACCELERATION_MS   = 400
```

## Player

- Assets: `assets/player/player_*.png` — the approved 20-frame PNG set (4 idle
  frames plus 16 directional walk frames).
- Default display width: **112 px** (`PLAYER.DISPLAY_W`).
- Foot pivot = world position; pivot fraction `(0.5, 0.90625)` of the source so the
  foot sits at the bottom-center of the drawn sprite. Changing visual size never
  changes gameplay geometry.
- If a frame fails to load, a clearly marked prototype-only primitive is drawn.

## Bluebird

- Entity at the Ridge Lookout clearing (`BLUEBIRD.WORLD`).
- Discovery cue ("A 대화") appears within `INTERACT_RADIUS` (64 world units).
- Interact opens a modal (codex entry) that **blocks background movement** until
  closed with `B` / `Escape`.
- Asset: `assets/bluebird.png` / `assets/bluebird_portrait.png`
  (reused approved Bluebird art).
- Visual perch: `(1410, 400)`; interaction anchor remains `(1300, 420)`.

## Scene

- `buildProps()` currently places **13 depth-sorted props**: 1 hut, 1 procedural
  firepit, 4 rocks, 3 round trees, 2 pines, and 2 tall-grass clusters.
- Active scene image set: `hut.png`, `tree_round.png`, `pine.png`, `rock.png`, and
  `tall_grass.png`. The former tile-like `grass.png` and `flower_bed.png` assets
  are not runtime props.
- Ground, path, and clearing surfaces use deterministic Canvas layers; gameplay
  geometry remains sourced exclusively from `CampWorldGeometry`.

## Tests

```bash
node --test
```

Covers: shared geometry single-source, movement ramp values, release = zero,
reversal resets ramp, world↔screen roundtrip, Bluebird range, modal blocking,
landmark composition, tile-like prop exclusion, and parse-validation of all
shipped `src/*.js` modules (catches shipped SyntaxErrors that import-based unit
tests can miss). Current suite: **38 passing tests**.

## Files

```
jungle-web-canvas-poc/
  index.html        standalone browser runner (canvas + D-pad + modal)
  server.mjs        minimal static server
  package.json
  src/
    constants.js     tuning constants
    geometry.js      CampWorldGeometry (SINGLE SOURCE)
    transforms.js    world <-> screen, camera clamp
    movement.js      acceleration ramp + MovementController
    camera.js        follow camera
    bluebird.js      encounter range logic
    modal.js         modal state machine
    assets.js        image loader/cache
    input.js         keyboard + D-pad
    render.js        2.5D depth-sorted rendering
    debug.js         geometry debug overlay
    game.js          main loop
  tests/             node --test suites
  assets/player/     20 approved player PNG frames
  assets/scene/      hut, tree_round, pine, rock, tall_grass PNGs
  assets/            bluebird.png, bluebird_portrait.png
```

## Known risks

- 2.5D is achieved via y-based depth sorting + foot-pivot sprites (no true
  perspective projection). Suitable for a Camp PoC.
