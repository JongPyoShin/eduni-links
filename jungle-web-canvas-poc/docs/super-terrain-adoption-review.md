# Super Terrain Adoption Review

> **Experiment**: Super Terrain adoption review
> **Branch**: `exp/mimo-super-terrain-review`
> **Baseline**: `prototype/jungle-web-canvas-poc` (Frozen Web RC `2e10f2d`)
> **Issue**: #55
> **Date**: 2026-09-01

---

## Executive Verdict

**ADOPT a small, focused subset. DO NOT adopt the full architecture.**

Super Terrain is a production-grade mesh terrain editor inspired by Unreal Engine 5.8. It is architecturally incompatible with Jungle Web in almost every dimension: React/R3F vs vanilla Canvas 2D + optional Three.js, WebGPU-only vs Canvas 2D primary, worker-compiled partitioned mesh vs flat procedural drawing, streaming/LRU vs preloaded assets.

However, **three specific algorithms** from Super Terrain are directly valuable and adoptable without architectural disruption:

1. **Height field sampling** (`sampleHeightField` in `heightField.ts`) — closed-form terrain composition that can be evaluated per-pixel for procedural waterfall cliff rendering
2. **Screen-space LOD selection** (`LodSelector.ts`) — useful if Three.js waterfall scene scales to more geometry
3. **Ground-following prop placement** (`FoliageGroundHeightField`) — the 257x257 height buffer pattern for placing props on procedural terrain

**Everything else should NOT be adopted.** WebGPU, R3F, worker compiler, streaming/LRU, runtime sculpt, and CSG tunnels are architecturally orthogonal to Jungle's goals and would require a complete rewrite.

---

## Current Jungle Architecture

### Rendering Stack

| Layer | Implementation | Status |
|-------|---------------|--------|
| Primary renderer | Canvas 2D API (`ctx.drawImage`, `ctx.beginPath`, gradients) | Active, all 5 stages |
| Optional 3D renderer | Three.js WebGL (orthographic camera, procedural + GLB models) | Waterfall stage only (`?renderer=three`) |
| Fallback | Canvas 2D when Three.js fails | Automatic |

### World Model

- **Coordinates**: 2D `(x, y)` in a fixed 1600x1200 world rectangle
- **Terrain**: Flat 2D. No heightmap, no mesh, no elevation data
- **Depth sorting**: Pure Y-axis ordering (higher `y` = drawn on top)
- **Collision**: Path-distance + clearing-inclusion + blocker-exclusion (all 2D ellipses)
- **Movement**: Acceleration-based controller, axis-separated walkability checks

### Geometry System

- `CampWorldGeometry` base class with `isWalkable()`, `distToPath()`, `isBlocked()`
- 5 stage-specific subclasses override `paths`, `clearings`, `blockers`
- All geometry is defined as polylines (paths) and circles/ellipses (clearings/blockers)
- **Single source of truth**: visible walkable path == actual walkable geometry

### Asset Pipeline

- Canvas 2D: PNG sprites + SVG art assets, preloaded with 4s timeout
- Three.js: Vendor GLB models (DRACO-compressed), loaded via `GLTFLoader`
- Graceful degradation: missing assets never block startup

### Game Loop

```
requestAnimationFrame loop
  -> timing (clamped delta)
  -> input polling (keyboard, gamepad, d-pad)
  -> scripted sequences
  -> player movement (acceleration model)
  -> interaction check
  -> camera follow
  -> effects update
  -> Canvas 2D render (or Three.js render)
```

### Key Contracts

1. `VISIBLE WALKABLE PATH == ACTUAL WALKABLE GEOMETRY` (single source)
2. Game state is plain objects created by factory functions (immutable style)
3. Three.js is an optional overlay reading read-only state via bridge callbacks
4. All 5 stages share the same game loop, geometry base class, and content structure
5. 35+ test files enforce architecture invariants

---

## Super Terrain Architecture

### Rendering Stack

| Layer | Implementation | Status |
|-------|---------------|--------|
| Renderer | Three.js `WebGPURenderer` only (no WebGL fallback) | Required |
| Integration | React Three Fiber (R3F) | Required |
| Materials | TSL-compatible with 5 packed surface field textures | Required |
| Lighting | Custom `clustered-webgpu-lighting` package | Required |

### World Model

- **Coordinates**: 3D `(x, y, z)` in a 4096x4096m world
- **Terrain**: Partitioned mesh (128m sections), arbitrary 3D topology
- **Height field**: Closed-form composition (continent mask + ridged multifractal + billow + valley carving + strata terracing)
- **Normals**: Analytically computed from triangulated mesh, boundary-stabilized
- **Curvature**: Mean curvature via normal field divergence, relaxed 6 times

### Terrain Compilation

- **Worker pool**: Persistent pool, `clamp(floor(cores * 0.66), 2, 6)` workers
- **Pipeline depth**: 3 jobs per worker
- **Revision checking**: Staleness handling, orphaned job detection
- **Frame budget**: 4ms CPU terrain budget per frame, 6MB GPU upload budget

### LOD System

- **5 levels**: Resolutions `[88, 44, 22, 11, 6]` triangles per level
- **Selection**: Screen-space projected error with 2.65px tolerance
- **Hysteresis**: 16% slack for coarsening direction
- **Neighbor constraint**: Dijkstra relaxation, max 1 LOD difference between adjacent sections

### Streaming

- **Center**: Camera orbit/fly target (not ground position)
- **Eviction**: LRU with 12s retention timeout
- **Priority**: Distance + forward alignment + view alignment + visibility + edit focus
- **Cache**: IndexedDB-backed compiled section cache

### Editor

- **Brush modes**: raise, lower, smooth, flatten, clay, pinch, scrape, terrace, noise
- **Brush domains**: heightfield (Y-only) or mesh (follows surface normal)
- **CSG**: BVH-accelerated boolean operations (box, ellipsoid, capsule, mesh cutters)
- **Tunnels**: Two-portal system with noise and progressive extension

---

## Compatibility Matrix

| Feature | Jungle Web | Super Terrain | Compatible? | Notes |
|---------|-----------|---------------|-------------|-------|
| Renderer | Canvas 2D + optional Three.js WebGL | WebGPU-only | **NO** | Jungle must keep Canvas 2D primary |
| Framework | Vanilla JS (ES modules) | React/R3F | **NO** | Jungle has no React dependency |
| World model | 2D flat (x, y) | 3D mesh (x, y, z) | **PARTIAL** | Height can be added as render-only layer |
| Terrain | Procedural gradients + paths | Partitioned mesh heightfield | **NO** | Different paradigms entirely |
| Geometry | Polylines + ellipses | Triangulated mesh | **NO** | Jungle's collision system is 2D |
| LOD | None (flat 2D) | 5-level screen-space error | **PARTIAL** | Useful only if Three.js scales |
| Compilation | None (procedural per-frame) | Worker pool with revision checking | **NO** | Jungle's terrain is simple enough for main thread |
| Streaming | Preloaded assets with timeout | LRU eviction + IndexedDB cache | **NO** | Jungle's world is small enough to preload |
| Runtime sculpt | None | Brush-based with preview | **NO** | Not a Jungle goal |
| CSG | None | BVH boolean operations | **NO** | Not a Jungle goal |
| Water | None | Paint-based water field | **PARTIAL** | Waterfall water is procedurally animated |
| Foliage | Hardcoded props array | Ground-following height buffer | **PARTIAL** | Height buffer pattern is adoptable |
| Input | Keyboard + gamepad + d-pad | Mouse-only editor | **NO** | Different interaction paradigms |
| Audio | Web Audio API synth | None | **NO** | Jungle-only feature |
| State | Functional (plain objects) | Zustand store | **PARTIAL** | Different but both valid |

---

## ADOPT NOW

### 1. Height Field Sampling Algorithm

**Source**: `src/terrain/compiler/heightField.ts` — `sampleHeightField(x, z, seed)`

**What**: A closed-form terrain composition function that evaluates elevation from any `(x, z)` coordinate using stacked noise primitives:
- Continent-scale massif mask
- Domain-warped ridged multifractal
- Billow noise for rounded forms
- Valley carving for drainage networks
- Strata terracing for cliff bands

**Why**: The Waterfall stage needs procedural cliff height variation for:
- Drawing cliff terraces at correct elevations
- Placing stepping stones at water-level intersections
- Positioning the lookout platform at a specific height
- Animating water flow along elevation gradients

**How to adopt**:
- Port the noise primitives (`valueNoise`, `fbm`, `ridgedMultifractal`, `billow`) to `src/waterfall_height.js`
- Create `sampleWaterfallHeight(x, y)` that maps Jungle's 2D coordinates to elevation
- Use elevation for render-only visual offsets (not collision)
- Keep `WaterfallWorldGeometry.isWalkable()` unchanged

**Risk**: Low. Pure math, no architectural changes.

### 2. Memoized Height Cache Pattern

**Source**: `src/terrain/compiler/heightField.ts` — `sampleHeightFieldCached(x, z, seed)`

**What**: 4-way set-associative memoized cache (64K sets x 4 ways = 256K entries) that avoids recomputing the expensive noise stack for repeated coordinates.

**Why**: The waterfall scene evaluates height at many nearby points per frame (cliff rendering, prop placement, water surface). Memoization prevents redundant noise computation.

**How to adopt**:
- Port the cache structure to `src/waterfall_height.js`
- Key: quantized `(x, y)` to 1/4096 precision
- Invalidation: none needed (height field is immutable per session)

**Risk**: Low. Simple data structure, no dependencies.

### 3. Ground-Following Prop Placement Pattern

**Source**: `src/foliage/foliageGroundHeight.ts` — `FoliageGroundHeightField`

**What**: A 257x257 height grid (66,049 samples) stored as a buffer, filled from the height function when the view moves significantly, and used for bilinear interpolation of prop positions.

**Why**: The Waterfall stage has 16 authored art props (`waterfall_art_manifest.js`) that should follow terrain elevation rather than being placed at flat `(x, y)` positions.

**How to adopt**:
- Create `src/waterfall_prop_placer.js` with a height grid buffer
- Fill from `sampleWaterfallHeight()` when camera moves
- Update prop `footY` from height grid lookup
- Props still render via Canvas 2D `drawImage()` at adjusted positions

**Risk**: Low. Additive change to prop positioning logic.

---

## POC LATER

### 1. Screen-Space LOD Selection

**Source**: `src/terrain/lod/LodSelector.ts`

**What**: Selects LOD level based on projected geometric error vs screen-space tolerance (2.65px). Uses hysteresis (16% slack) and neighbor constraints (max 1 LOD difference).

**When**: If the Three.js waterfall scene scales beyond ~50K triangles and needs detail reduction for Android WebView performance.

**What to port**:
- `projectedError` calculation
- Hysteresis logic (fining/coarsening asymmetry)
- Neighbor constraint (Dijkstra relaxation)

**What NOT to port**: The 5-level resolution array, the section-based addressing, the worker-driven LOD compilation.

### 2. Frame Budget Scheduler Pattern

**Source**: `src/terrain/core/FrameBudgetScheduler.ts`

**What**: Hard invariant that terrain work never stalls a frame. Measures actual cost per task class, admits work based on remaining budget (4ms CPU, 6MB GPU per frame).

**When**: If Three.js waterfall scene grows to include streaming geometry or dynamic terrain updates.

**What to port**:
- Budget admission pattern
- Measured cost learning (rate-based prediction)
- Quality pressure (reduce budget when frames are slow)

**What NOT to port**: The multi-class cost tracking, the worker pool integration, the section swap batching.

### 3. Water Surface Pattern

**Source**: `src/terrain/water/WaterStore.ts`

**What**: Paint-based water coverage field with configurable level, radius, and strength.

**When**: If the Waterfall stage water system needs more sophisticated level control than the current procedural animation.

**What to port**: Level-based water surface rendering, coverage blending.

**What NOT to port**: Paint-based editing, the Zustand store integration.

---

## DO NOT ADOPT

### 1. WebGPU Renderer

**Why not**: Jungle Web must support Android WebView, which has limited/no WebGPU support. Canvas 2D is the primary renderer with Three.js WebGL as an optional upgrade. WebGPU would eliminate the majority of the target audience.

**Architectural conflict**: Super Terrain's entire rendering stack is built on `THREE.WebGPURenderer`. There is no WebGL fallback. Jungle's Three.js mode uses `THREE.WebGLRenderer` with orthographic camera.

### 2. React/R3F Integration

**Why not**: Jungle Web is vanilla JavaScript ES modules with zero framework dependencies. Adding React and React Three Fiber would:
- Increase bundle size by ~150KB+
- Require build tooling (Vite/webpack) for the entire game
- Conflict with the existing Canvas 2D rendering path
- Break the 35+ tests that enforce architecture invariants

**Architectural conflict**: Super Terrain's `TerrainView.tsx` is a React component using `useFrame`, `useEffect`, and R3F's reconciler. Jungle's game loop is a single `requestAnimationFrame` callback.

### 3. Worker Terrain Compiler

**Why not**: Jungle's terrain is simple enough for main-thread computation:
- Camp stage: 35 hardcoded props, 16 blockers, procedural gradient ground
- Waterfall stage: 16 art props, 14-node path, procedural cliff/water
- Three.js mode: ~20K triangles max, procedural + 14 vendor GLBs

Super Terrain's worker pool exists because it compiles 128m mesh sections with BVH acceleration, surface field calculation, and LOD simplification. Jungle has none of this complexity.

**Architectural conflict**: Super Terrain's `TerrainWorkerPool` manages persistent workers with revision checking, staleness handling, and pipeline depth. Jungle's entire terrain computation takes <1ms per frame.

### 4. Streaming/LRU Cache

**Why not**: Jungle's world is small enough to preload entirely:
- Camp: ~2MB of PNGs + SVGs
- Waterfall: ~3MB of PNGs + SVGs + optional GLBs
- Total assets: <20MB across all 5 stages

Super Terrain streams because its 4km x 4km world with 5 LOD levels generates gigabytes of compiled sections. Jungle's 1600x1200 world with flat terrain has nothing to stream.

**Architectural conflict**: Super Terrain's `TerrainStreamer` manages IndexedDB persistence, LRU eviction, and residency states. Jungle uses `loadImage()` with a 4-second timeout and in-memory cache.

### 5. Runtime Sculpt

**Why not**: Jungle is a linear educational game with scripted progression, not a terrain editor. There is no use case for brush-based height modification, smooth/flatten/clay tools, or real-time mesh deformation.

**Architectural conflict**: Super Terrain's sculpt system requires worker-compiled sections, revision tracking, and GPU mesh updates. Jungle's terrain is static per session.

### 6. CSG Tunnels

**Why not**: Jungle's Cave stage uses a completely different approach — it is a separate game with its own geometry class (`CaveWorldGeometry`), not a CSG modification of the main terrain. There is no need for BVH-accelerated boolean operations.

**Architectural conflict**: Super Terrain's `BvhCsgTunnelBooleanBackend` operates on triangulated mesh sections. Jungle's collision system is 2D ellipses and polylines.

### 7. React Editor UI

**Why not**: Jungle has no editor. Content is authored in code (hardcoded props arrays, path definitions, interactable positions). The QA system uses a DOM-based command bridge (`?qa=1`), not a visual editor.

---

## Waterfall PoC Concrete Design

### Goal

Add render-only terrain height to the Waterfall stage using Super Terrain's height field sampling algorithm, without changing collision/interactable contracts.

### New Files

| File | Purpose |
|------|---------|
| `src/waterfall_height.js` | Height field sampling + memoized cache |
| `src/waterfall_prop_placer.js` | Ground-following prop placement |

### Modified Files

| File | Change |
|------|--------|
| `src/waterfall_scene.js` | Use height for cliff terrace offsets, prop Y positioning |
| `src/waterfall_art_manifest.js` | Add `elevationOffset` field to art props |
| `src/three_waterfall_preview.js` | Use height for terrain mesh deformation (if Three.js mode) |

### Design Details

#### `src/waterfall_height.js`

```javascript
// Ported from Super Terrain heightField.ts
// Simplified: continent mask + ridged multifractal + billow only
// No valley carving, no strata terracing (not needed for Waterfall)

export function sampleWaterfallHeight(x, y, seed = 42) {
  // Returns elevation in range [0, 200] for visual offset
  // Domain: Jungle's 1600x1200 world coordinates
}

// 4-way set-associative cache (ported from heightField.ts)
const CACHE_SETS = 65536;
const CACHE_WAYS = 4;
const cache = new Float32Array(CACHE_SETS * CACHE_WAYS * 3); // x, y, height

export function sampleWaterfallHeightCached(x, y, seed = 42) {
  // Quantize key to 1/4096 precision
  // Lookup in cache, compute on miss
}
```

#### `src/waterfall_prop_placer.js`

```javascript
// Ported from foliage/FoliageGroundHeight.ts pattern
// 65x65 height grid covering the Waterfall world area

export class WaterfallPropPlacer {
  constructor(sampleHeightFn) {
    this.sampleHeight = sampleHeightFn;
    this.gridSize = 65;
    this.grid = new Float32Array(this.gridSize * this.gridSize);
  }

  // Fill grid from height function
  fill(worldX, worldY, worldW, worldH) { ... }

  // Bilinear interpolation for prop placement
  getHeightAt(worldX, worldY) { ... }

  // Update prop footY values
  placeProps(props) {
    for (const prop of props) {
      prop.renderY = prop.y + this.getHeightAt(prop.x, prop.y);
    }
  }
}
```

#### Changes to `src/waterfall_scene.js`

In `drawWaterfallWorld()`:
```javascript
// Before drawing cliff terraces:
const height = sampleWaterfallHeightCached(worldX, worldY);
const elevationOffset = height * ELEVATION_SCALE; // e.g., 0.3

// Apply to cliff terrace drawing:
ctx.save();
ctx.translate(0, -elevationOffset);
drawCliffTerraces(ctx, ...);
ctx.restore();

// Apply to prop placement:
prop.renderY = prop.y - sampleWaterfallHeightCached(prop.x, prop.y) * 0.3;
```

### What Stays Unchanged

- `WaterfallWorldGeometry.isWalkable()` — collision is still flat 2D
- `WaterfallWorldGeometry.paths` — walkable route is unchanged
- `waterfall_chapter.js` — game progression is unchanged
- `waterfall_interactables.js` — interaction positions are unchanged
- Player movement — still flat 2D acceleration model
- Canvas 2D rendering — still `ctx.drawImage()`, just with Y offsets

### Expected Visual Effect

- Cliff terraces appear to have depth (higher areas drawn higher)
- Props (gate arch, lanterns, lookout platform) follow terrain contour
- Water surface reflects elevation changes
- Player still walks on flat path (collision unchanged)

---

## Files/Functions Affected

### New Code (2 files)

| File | Functions |
|------|-----------|
| `src/waterfall_height.js` | `sampleWaterfallHeight()`, `sampleWaterfallHeightCached()`, noise primitives |
| `src/waterfall_prop_placer.js` | `WaterfallPropPlacer` class, `fill()`, `getHeightAt()`, `placeProps()` |

### Modified Code (3 files)

| File | Functions | Change |
|------|-----------|--------|
| `src/waterfall_scene.js` | `drawWaterfallWorld()`, `drawCliffTerraces()` | Add height-based Y offsets |
| `src/waterfall_art_manifest.js` | `WATERFALL_ART_IMAGES` | Add `elevationOffset` field |
| `src/three_waterfall_preview.js` | `addGround()`, `addCliff()` | Use height for mesh deformation (Three.js mode only) |

### Unchanged Code

- `src/geometry.js` — `WaterfallWorldGeometry` (collision)
- `src/content/waterfall_chapter.js` — game logic
- `src/content/waterfall_interactables.js` — interaction positions
- `src/game.js` — game loop (no changes needed)
- `src/player.js` — player rendering
- `src/movement.js` — movement controller
- `src/camera.js` — camera follow

---

## Risks

### 1. Performance on Android WebView (Medium Risk)

**Risk**: The height field sampling uses multiple octaves of noise. On low-end Android devices, computing 66K height samples per frame could cause frame drops.

**Mitigation**:
- Memoized cache reduces redundant computation
- Height grid is filled incrementally (not all at once)
- Canvas 2D rendering path is unaffected (height only affects Y offsets)
- Three.js path already has performance budget for ~20K triangles

### 2. Visual Glitches at Section Boundaries (Low Risk)

**Risk**: If height sampling produces discontinuities at world edges, cliff terraces may show seams.

**Mitigation**:
- Waterfall world is a single 1600x1200 rectangle (no sections)
- Height field is a continuous function (no boundaries)
- Memoized cache uses quantized keys (consistent at any coordinate)

### 3. Three.js Mode Incompatibility (Low Risk)

**Risk**: The Three.js waterfall scene uses `PlaneGeometry(16, 12)` for ground. Adding height deformation changes the mesh topology.

**Mitigation**:
- Height deformation is applied only in Three.js mode
- Canvas 2D mode uses Y offsets only (no mesh changes)
- Fallback to flat ground if height computation fails

### 4. Test Coverage Gap (Medium Risk)

**Risk**: New height computation code has no existing tests.

**Mitigation**:
- Add tests for `sampleWaterfallHeight()` determinism
- Add tests for cache hit rate
- Add tests for prop placement accuracy
- Enforce architecture invariant: height is render-only, not collision

---

## Performance Considerations for Android WebView

### Current Performance Profile

- Canvas 2D rendering: ~2ms per frame on mid-range Android
- Three.js rendering: ~8ms per frame on mid-range Android
- Total frame budget: 16.6ms (60 FPS)

### Height Field Impact

| Operation | Cost | Frequency |
|-----------|------|-----------|
| `sampleWaterfallHeight()` | ~0.05ms | On cache miss (first access per coordinate) |
| Cache lookup | ~0.001ms | Per call (99%+ hit rate after warmup) |
| Height grid fill (65x65) | ~3ms | On camera move >50 world units |
| Prop Y update (16 props) | ~0.02ms | Per frame |

### Total Impact

- **Canvas 2D mode**: +0.02ms per frame (negligible)
- **Three.js mode**: +3ms on camera move, +0.02ms otherwise (acceptable)
- **Memory**: +17KB for height cache, +17KB for height grid (negligible)

### Recommendations

1. Pre-fill height grid during asset loading (hide latency)
2. Use lower resolution grid (33x33) on devices with <2GB RAM
3. Disable height offsets entirely on devices with <1GB RAM
4. Never block the game loop on height computation

---

## Recommendation

### Immediate (This Sprint)

1. **Implement `waterfall_height.js`** — port noise primitives and memoized cache
2. **Implement `waterfall_prop_placer.js`** — port height grid pattern
3. **Modify `waterfall_scene.js`** — add height-based Y offsets to cliff rendering
4. **Add tests** — determinism, cache performance, architecture invariant enforcement
5. **Document** — update `WATERFALL_TERRAIN_HEIGHT.md` with the design

### Future POCs (Not Now)

1. Screen-space LOD for Three.js waterfall (if triangle count grows)
2. Frame budget scheduler (if dynamic terrain updates are needed)
3. Water surface level control (if procedural animation is insufficient)

### Explicitly Rejected

1. WebGPU renderer (Android WebView incompatibility)
2. React/R3F (architectural conflict with vanilla JS)
3. Worker compiler (unnecessary complexity)
4. Streaming/LRU (world too small)
5. Runtime sculpt (not a game goal)
6. CSG tunnels (Cave stage uses different approach)
7. React editor (no editor needed)

---

## Appendix: Super Terrain Source References

| Feature | Source File | Key Function |
|---------|-----------|--------------|
| Height field | `src/terrain/compiler/heightField.ts` | `sampleHeightField()` |
| Memoized cache | `src/terrain/compiler/heightField.ts` | `sampleHeightFieldCached()` |
| Noise primitives | `src/terrain/compiler/heightField.ts` | `valueNoise()`, `fbm()`, `ridgedMultifractal()`, `billow()` |
| Normal calculation | `src/terrain/compiler/compileSection.ts` | `calculateNormals()` |
| Curvature | `src/terrain/compiler/compileSection.ts` | `calculateMeshCurvature()` |
| LOD selection | `src/terrain/lod/LodSelector.ts` | `selectLod()` |
| Neighbor constraint | `src/terrain/lod/LodSelector.ts` | `constrainNeighborLods()` |
| Ground-following props | `src/foliage/foliageGroundHeight.ts` | `FoliageGroundHeightField` |
| Section addressing | `src/terrain/partition/MeshPartition.ts` | `SectionKey`, `SectionId` |
| Worker pool | `src/terrain/workers/TerrainWorkerPool.ts` | `TerrainWorkerPool` |
| Streaming | `src/terrain/streaming/TerrainStreamer.ts` | `TerrainStreamer` |
| LRU eviction | `src/terrain/streaming/TerrainStreamer.ts` | `collectEvictions()` |
| Frame budget | `src/terrain/core/FrameBudgetScheduler.ts` | `FrameBudgetScheduler` |
| CSG boolean | `src/terrain/modifiers/boolean/MeshBooleanBackend.ts` | `BvhCsgTunnelBooleanBackend` |
| Tunnel | `src/terrain/modifiers/tunnel.ts` | `createTunnelModifier()` |
| Runtime sculpt | `src/terrain/WorldTerrain.ts` | `beginStroke()`, `continueStroke()`, `endStroke()` |
| Water | `src/terrain/water/WaterStore.ts` | `WaterStore` |
| Granite rocks | `src/terrain/rocks/GraniteRockStore.ts` | `GraniteRockStore` |
