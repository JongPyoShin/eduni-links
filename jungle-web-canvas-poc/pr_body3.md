## Jungle Camp Web Canvas 2.5D PoC

Lightweight Camp prototype: vanilla JS + Canvas 2D/2.5D, no engine, no backend.

### Single Source Contract (primary requirement)
`CampWorldGeometry` (src/geometry.js) drives BOTH the visible walkable path and
movement walkability from the same `paths` / `clearings` / `pathHalfWidth` data.
No separate collision vs visual path. The path treatment and collider both read
`geometry.walkableShapes()`.

### Features
- World coordinate model + invertible world/screen transforms (roundtrip-tested)
- Shared `CampWorldGeometry` (walkable + visible path)
- Acceleration ramp: 0.45 (0-100ms) -> linear -> 0.75 (500ms+); release=0; reversal restarts ramp
- Player 112px, foot pivot = world position, pivot (96,232) from the approved 20-frame 192x256 sprite set (PR #46)
- Directional idle + 4-frame walk animation (front/back/left/right), no composite sheet
- D-pad / keyboard controls (Arrow keys, A/B/Enter/Space/Esc)
- Follow camera + 2.5D Y-depth sorting across 19 depth-sorted props + player + bird
- Soft storybook procedural ground (no debug grid) and multi-pass warm path
- Clearing identities: Tent (hut), Fire Pit (procedural fire + stone ring), Ridge Lookout (bird + perch), Entrance (rocks)
- Lightweight contact shadows for player, bird, trees, rocks, hut
- Bluebird: visual position offset to (1385,410) within the Ridge clearing; interaction anchor stays at (1300,420); local A cue, no arrow/tether
- Geometry debug overlay (backtick) still proves path == walkability
- Asset loader/cache reusing approved art
- 36 passing `node --test` cases, including a parse-validation test (`node --check` on every `src/*.js`)

### Assets (reused, read-only)
- Player frames: PR #46 (`player_{front,back,left,right}_{idle_00,walk_00..03}_v01.png`) -> `assets/player/`
- Scene: `nice-gui-1-1-7/portal_app/static_games/assets/sprites/jungle_v2/`
  (learning-hut, tree-round, pine, rock, grass, flower-bed, tall-grass) -> `assets/scene/`
- Bluebird: `jungle-codex-reward-prototype-v1` -> `assets/bluebird*.png`

### Validation
- `node --test` -> 36/36 pass
- `git diff --check` -> clean
- Manual browser boot confirmed; player renders a single directional frame (no contact sheet)

Run: `cd jungle-web-canvas-poc && node server.mjs` then open http://localhost:8123

This is a PoC and does NOT replace Native Jungle.
