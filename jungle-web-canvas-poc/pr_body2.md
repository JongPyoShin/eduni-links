## Jungle Camp Web Canvas 2.5D PoC

Lightweight Camp prototype: vanilla JS + Canvas 2D/2.5D, no engine, no backend.

### Single Source Contract (primary requirement)
`CampWorldGeometry` (src/geometry.js) drives BOTH the visible walkable path and
movement walkability from the same `paths` / `clearings` / `pathHalfWidth` data.
No separate collision vs visual path.

### Features
- World coordinate model + invertible world/screen transforms (roundtrip-tested)
- Shared `CampWorldGeometry` (walkable + visible path)
- Acceleration ramp: 0.45 (0-100ms) -> linear -> 0.75 (500ms+); release=0; reversal restarts ramp
- Player 112px, foot pivot = world position, pivot (96,232) from the approved 20-frame 192x256 sprite set (PR #46)
- Directional idle + 4-frame walk animation (front/back/left/right), no composite sheet
- D-pad / keyboard controls (Arrow keys, A/B/Enter/Space/Esc)
- Follow camera + 2.5D y-based depth sorting
- Bluebird encounter + local discovery cue + modal that blocks background movement
- Geometry debug overlay (backtick)
- Asset loader/cache reusing approved player + bluebird art
- 30 passing `node --test` cases, including a parse-validation test that
  runs `node --check` on every shipped `src/*.js` module

### Validation
- `node --test` -> 30/30 pass
- `git diff --check` -> clean
- Manual browser boot confirmed; player renders a single directional frame (no contact sheet)

Run: `cd jungle-web-canvas-poc && node server.mjs` then open http://localhost:8123

This is a PoC and does NOT replace Native Jungle.
