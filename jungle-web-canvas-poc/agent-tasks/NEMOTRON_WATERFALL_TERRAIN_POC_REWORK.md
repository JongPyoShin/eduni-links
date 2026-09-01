# Nemotron Rework — Waterfall Terrain PoC

PR: #58
Branch: `exp/nemotron-waterfall-terrain-poc`
Current reviewed HEAD: `9c9925763e8ca142e2e1d3908789b6a717e39cbd`
Base: `prototype/jungle-web-canvas-poc`

## Verdict

REWORK. Core direction is good and gameplay files stayed untouched, but the terrain presentation has several correctness gaps that must be fixed before GO.

Do not merge/rebase/reset PR #53 or the RC branch. Update this same PR #58.

## Required fixes

### 1. Fix world-size contract mismatch

`src/terrain.js` hardcodes `WORLD_H = 1080`, while the Jungle authoritative world contract is `WORLD.HEIGHT = 1200` in `src/constants.js`. `three_waterfall_preview.js` also centers logical Y on 600.

This currently shifts the terrain mesh relative to gameplay/world objects and truncates the intended padded world extent.

Required:
- import/use authoritative `WORLD.WIDTH` / `WORLD.HEIGHT` instead of duplicating 1600/1080 constants;
- terrain mesh coordinates must use the same center/scale as `logicalToThree()`;
- add regression test that terrain world dimensions exactly equal `WORLD`.

### 2. Rename stage-specific module

Current `src/terrain.js` is not generic: it imports `WaterfallWorldGeometry` and hardcodes Waterfall basin/cliff/lookout behavior.

Rename it to something stage-specific such as:
- `src/waterfall_terrain.js`

Do not occupy a generic `terrain.js` name until there is actually a reusable stage-independent terrain core.

### 3. Correct normal-space math

The generated mesh scales logical X/Y by `WORLD_SCALE = 0.01`, while `sampleNormal()` currently computes its horizontal component in unscaled logical units.

That makes supplied normals inconsistent with actual mesh slope and can produce incorrect lighting.

Required:
- compute normals in the same world-space units as generated mesh, or let Three compute vertex normals from correct geometry and keep `sampleNormal()` consistent with that convention;
- add a test comparing sampled normal direction against a finite-difference world-space slope / generated geometry at representative points.

### 4. Fix terrain profile composition

Current ordering in `applyWaterfallInfluence()` raises the waterfall cliff and then immediately applies a wide basin `Math.min()` cap. Because the basin radius overlaps the waterfall/mist area, much of the intended cliff/rising relief is flattened again.

The current test named `terrain height at mist section is rising` is too weak: it allows `mistEnd >= mistStart - 0.2`, which permits flat or slightly descending terrain.

Required visual/profile contract:
- Stream Gate / stepping stones remain low;
- Mist Trail is meaningfully higher than stepping-stone area;
- Leaf Match is not lower than Mist Trail and should continue the rise;
- Lookout is clearly higher than Leaf Match/entry;
- the waterfall cliff sample is clearly higher than the basin sample;
- no abrupt visual wall crosses the walkable route.

Add explicit checkpoint tests. Use actual current authored coordinates. Suggested acceptance shape:
- `height(1080,700) < 0.5`
- `height(1020,480) > height(1080,700) + 0.2`
- `height(1250,470) >= height(1020,480)`
- `height(1450,330) > height(1250,470) + 0.8`
- `height(1170,260) > height(1170,560) + 1.0`

Exact constants may be tuned if browser evidence shows a better child-readable slope, but the tests must prove actual rise, not merely non-drop.

### 5. Ground the route surface, not only its endpoints

Current route strips are still horizontal `PlaneGeometry` objects placed at the average endpoint height. They do not pitch/subdivide with the terrain, so rising segments can visibly intersect or float above the terrain.

Required:
- keep authoritative logical cardinal route unchanged;
- render the visible route as a sampled ribbon / subdivided strip, or subdivide each segment and align each small strip to local sampled heights;
- route must visually hug terrain over the full segment, not only at nodes/midpoints;
- add a helper-level test or dense route sampling contract to prevent large terrain/route separation.

### 6. Ground vendor GLB placements

`populateVendorAssets()` still uses only `config.yOffset` and does not add sampled terrain height. These placements include trees/rocks/grass near the mist/lookout area, so they can float or become buried after terrain relief is added.

Required:
- non-water vendor props must use `sampleHeight(placement.x, placement.y) + yOffset`;
- water-category assets may keep a water-level-specific policy if needed, but document it explicitly;
- fallback objects must follow the same grounding rule;
- browser QA must inspect at least entrance, crossing, mist, and lookout vendor props.

### 7. Strengthen invariant tests

Keep all existing tests, but add/adjust tests for:
- authoritative `WORLD` dimensions;
- actual Waterfall interactable list remains unchanged (not only geometry clearings/path width);
- meaningful height progression checkpoints;
- world-space normal correctness;
- dense route terrain continuity;
- vendor prop grounding contract;
- no WebGPU / React / R3F dependencies.

Do not modify gameplay coordinates to make terrain tests pass.

### 8. Browser QA again after fixes

Run full Waterfall E2E through actual QA controls:

Stream Gate → Stepping Stones → Echo → Mist Trail → Leaf Match x3 → Lookout → Kingfisher → Reward.

Record in PR #58:
- final HEAD;
- `node --test` actual pass count;
- `git diff --check`;
- measured key terrain heights: gate, stepping stones, mist, leaf, lookout, cliff, basin;
- route visually hugs terrain;
- player grounding;
- vendor prop grounding at entrance/crossing/mist/lookout;
- Three runtime active;
- Console/Page errors;
- whether full Reward confirm completed.

If performance values such as module-build milliseconds are not actually measured, remove the numeric claim or label it `not measured`. Do not present estimates as measurements.

## Scope guard

Still forbidden:
- WebGPU
- React/R3F
- worker compiler
- streaming/LRU
- CSG
- runtime sculpt
- Android changes
- logical route/collision redesign
- interactable coordinate/radius changes
- progression/reward/persistence changes

## Delivery

Update the same branch and Draft PR #58.

When complete, report only:
- PR #58
- new HEAD SHA
