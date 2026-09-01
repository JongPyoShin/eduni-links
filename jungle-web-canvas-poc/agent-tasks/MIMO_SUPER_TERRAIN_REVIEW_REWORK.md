# MiMo Rework — Super Terrain adoption review

Review target: PR #56
Branch: `exp/mimo-super-terrain-review`
Base: `prototype/jungle-web-canvas-poc`

Verdict: **REWORK**

The high-level direction is good, but the document contains architecture inaccuracies and unsupported performance claims that must be corrected before it can be used as the implementation guide for the Waterfall PoC.

## Required corrections

### 1. Fix current Jungle renderer architecture
The document currently says Canvas 2D is primary for all five stages and Three.js is optional only for Waterfall. That is outdated for the RC baseline.

The RC contains production Three/WebGL implementations across the five-stage flow, including:
- `three_camp_runtime.js`
- `three_waterfall_runtime.js` + `three_waterfall_preview.js`
- `three_cave_preview.js`
- `three_giant_tree_preview.js`
- `three_sky_ridge_preview.js`

Cave/Giant Tree/Sky Ridge are separate stage pages/game modules with Three canvases. Reflect the actual RC architecture rather than the older Canvas-first prototype description.

### 2. Align Waterfall PoC with the actual production Three runtime
The PoC should first target the Three/WebGL production presentation path:
- `three_waterfall_preview.js` owns terrain/route/story Three objects.
- `three_waterfall_runtime.js` bridges read-only gameplay state/player position into the renderer.
- `game.js` remains authoritative for logical gameplay.

Do not make Canvas 2D prop-offset work part of the required first PoC. Canvas fallback can remain unchanged unless there is a separate reason to alter it.

### 3. Reclassify the 256K memoized height cache
Do **not** classify the Super Terrain 64K-set x 4-way cache as ADOPT NOW by default.

For Waterfall, terrain is deterministic/static and the scene is tiny. Start with a simple pure height sampler and prebuilt mesh. Add caching only if profiling shows repeated sampling is material.

Also correct the memory math: a `Float32Array(65536 * 4 * 3)` is 786,432 floats, about **3 MiB**, not ~17 KB.

Preferred classification:
- height sampler: ADOPT NOW
- direct ground-following placement / normal sampling: ADOPT NOW
- large set-associative cache: POC LATER / profile first

### 4. Simplify ground-following props
There are only a small number of authored Waterfall props. A 65x65/257x257 continuously refreshed height grid is probably unnecessary for the first PoC.

Prefer:
- sample authored prop height once at scene construction, or
- direct sampler lookup for static props

Only adopt a dense height grid if a measured use case requires it.

### 5. Remove or qualify unsupported performance numbers
The document states numbers such as:
- Canvas 2D ~2ms/frame
- Three.js ~8ms/frame
- height sample ~0.05ms
- cache lookup ~0.001ms
- 99%+ hit rate
- height grid fill ~3ms
- Jungle terrain <1ms/frame

These were not measured in this review and must not be presented as verified facts. Remove them or label them explicitly as unverified estimates. Prefer a profiling plan for Nemotron's PoC.

### 6. Correct WebGPU wording
Do not claim categorical Android/WebView incompatibility unless backed by our actual target-device evidence.

The decision remains **DO NOT ADOPT WebGPU NOW** because:
- current RC is validated on Three/WebGL,
- Super Terrain has no WebGL fallback,
- Android WebView/target-device acceptance is still pending,
- switching renderer would invalidate the RC baseline.

Frame this as project compatibility/risk, not a universal platform claim.

### 7. Make ADOPT NOW internally consistent
The Executive Verdict currently lists height sampling + screen-space LOD + ground-following as the three useful algorithms, while the ADOPT NOW section lists height sampling + memoized cache + ground-following.

Use one consistent classification throughout.

Recommended final classification:

**ADOPT NOW**
1. deterministic terrain-height sampler
2. optional terrain-normal sampler
3. static ground-following placement for player visual / route mesh / authored props

**POC LATER**
1. cache/memoization if profiling justifies it
2. screen-space LOD
3. frame-budget scheduler
4. advanced water-surface techniques

**DO NOT ADOPT**
- WebGPU renderer switch
- React/R3F
- worker compiler
- streaming/LRU
- runtime sculpt
- CSG tunnels
- React editor

### 8. Update concrete Waterfall file plan
The first PoC should center on:
- new small terrain-height module (name may be `waterfall_terrain.js` or similar)
- `three_waterfall_preview.js`: deform/construct terrain mesh and route mesh; ground static props
- `three_waterfall_runtime.js`: ground production player visual using the same sampler while preserving logical X/Y

Do not change:
- `geometry.js` Waterfall authored path/collision
- `content/waterfall_interactables.js`
- `content/waterfall_chapter.js`
- InputController
- reward/persistence
- Android

### 9. Keep the core insight
Preserve the central architecture conclusion:

`logical X/Y gameplay remains authoritative; terrain height is render-only presentation data.`

That is the correct adoption boundary.

## Validation after rework

Run:
- `node --test`
- `git diff --check`

Update the existing Draft PR #56. Do not open a new PR. Do not merge.

In the PR body/comment report only:
- new HEAD
- document updated
- tests
- diff check
- corrected ADOPT NOW / POC LATER / DO NOT ADOPT lists
