# Super Terrain Adoption Review

> **Experiment**: Super Terrain adoption review
> **Branch**: `exp/mimo-super-terrain-review`
> **Baseline**: `prototype/jungle-web-canvas-poc` (Frozen Web RC `2e10f2d`)
> **Issue**: #55
> **Date**: 2026-09-01

---

## Executive Verdict

**ADOPT a small, focused subset. DO NOT adopt the full architecture.**

Super Terrain is a production-grade mesh terrain editor inspired by Unreal Engine 5.8. It is architecturally incompatible with Jungle Web in almost every dimension: React/R3F vs vanilla ES modules, WebGPU-only vs Three/WebGL, worker-compiled partitioned mesh vs procedural scene composition, streaming/LRU vs preloaded assets.

However, **three specific capabilities** from Super Terrain are directly valuable and adoptable without architectural disruption:

1. **Deterministic terrain-height sampler** (`sampleHeightField` in `heightField.ts`) — closed-form noise composition evaluatable per-vertex for procedural waterfall terrain mesh
2. **Terrain-normal sampling** (`calculateNormals` / curvature in `compileSection.ts`) — useful for material blending and prop rejection on steep surfaces
3. **Static ground-following placement** — sampling authored prop height at scene construction time

Everything else should NOT be adopted. The full classification follows.

---

## Current Jungle Architecture

### Rendering Stack

The RC baseline has production Three.js/WebGL implementations across all five stages. Canvas 2D remains available as a fallback for Camp and Waterfall, but Three.js is the intended production path.

| Stage | Production Renderer | Fallback | Entry Point |
|-------|-------------------|----------|-------------|
| Camp | Three.js (`three_camp_runtime.js`) | Canvas 2D | `index.html?renderer=three` (hub default) |
| Waterfall | Three.js (`three_waterfall_runtime.js`) | Canvas 2D | `index.html?stage=waterfall&renderer=three` (hub default) |
| Cave | Three.js only (`three_cave_preview.js`) | None | `cave-game.html` |
| Giant Tree | Three.js only (`three_giant_tree_preview.js`) | None | `giant-tree-game.html` |
| Sky Ridge | Three.js only (`three_sky_ridge_preview.js`) | None | `sky-ridge-game.html` |

**Key runtime files**:
- `three_camp_runtime.js` — production bridge, reads gameplay state via callbacks
- `three_waterfall_runtime.js` — production bridge, wraps preview + syncs phases/camera
- `three_cave_preview.js` — dual-purpose (preview via `cave-three.html`, production via `cave-game.html`)
- `three_giant_tree_preview.js` — dual-purpose (preview via `giant-tree-three.html`, production via `giant-tree-game.html`)
- `three_sky_ridge_preview.js` — dual-purpose (preview via `sky-ridge-three.html`, production via `sky-ridge-game.html`)

The hub (`jungle-hub.html`) links to `?renderer=three` URLs by default. Canvas 2D exists as a fallback safety net for Camp and Waterfall; Cave/Giant Tree/Sky Ridge have no Canvas 2D path.

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

- Three.js: Vendor GLB models (DRACO-compressed), loaded via `GLTFLoader`
- Canvas 2D fallback: PNG sprites + SVG art assets, preloaded with 4s timeout
- Graceful degradation: missing assets never block startup

### Game Loop

`game.js` remains authoritative for logical gameplay across all stages:

```
requestAnimationFrame loop
  -> timing (clamped delta)
  -> input polling (keyboard, gamepad, d-pad)
  -> scripted sequences
  -> player movement (acceleration model, authoritative X/Y)
  -> interaction check
  -> camera follow
  -> effects update
  -> Three.js render (or Canvas 2D fallback)
```

The Three.js runtime bridges read-only gameplay state via callbacks (`getState()`, `getPlayer()`, `getPlayerImage()`). The renderer never modifies logical coordinates.

### Key Contracts

1. **Logical X/Y gameplay remains authoritative; terrain height is render-only presentation data**
2. `VISIBLE WALKABLE PATH == ACTUAL WALKABLE GEOMETRY` (single source)
3. Game state is plain objects created by factory functions (immutable style)
4. Three.js runtime reads read-only state via bridge callbacks
5. All 5 stages share the same game loop, geometry base class, and content structure
6. 35+ test files enforce architecture invariants

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

| Feature | Jungle Web RC | Super Terrain | Compatible? | Notes |
|---------|--------------|---------------|-------------|-------|
| Renderer | Three.js/WebGL (Canvas 2D fallback) | WebGPU-only | **NO** | Different GPU API |
| Framework | Vanilla JS (ES modules) | React/R3F | **NO** | No framework dependency |
| World model | 2D flat (x, y) | 3D mesh (x, y, z) | **PARTIAL** | Height as render-only layer |
| Terrain | Procedural scenes + paths | Partitioned mesh heightfield | **NO** | Different paradigms |
| Geometry | Polylines + ellipses | Triangulated mesh | **NO** | Collision system is 2D |
| LOD | None (flat 2D) | 5-level screen-space error | **PARTIAL** | Useful if Three.js scales |
| Compilation | None (procedural per-frame) | Worker pool with revision checking | **NO** | Jungle terrain is simple |
| Streaming | Preloaded assets with timeout | LRU eviction + IndexedDB cache | **NO** | World is small |
| Runtime sculpt | None | Brush-based with preview | **NO** | Not a Jungle goal |
| CSG | None | BVH boolean operations | **NO** | Not a Jungle goal |
| Water | Procedural animation | Paint-based water field | **PARTIAL** | Different approach |
| Foliage | Hardcoded props array | Ground-following height buffer | **PARTIAL** | Pattern is adoptable |
| Input | Keyboard + gamepad + d-pad | Mouse-only editor | **NO** | Different paradigms |
| Audio | Web Audio API synth | None | **NO** | Jungle-only feature |
| State | Functional (plain objects) | Zustand store | **PARTIAL** | Different but both valid |

---

## ADOPT NOW

### 1. Deterministic Terrain-Height Sampler

**Source**: `src/terrain/compiler/heightField.ts` — `sampleHeightField(x, z, seed)`

**What**: A closed-form terrain composition function that evaluates elevation from any `(x, z)` coordinate using stacked noise primitives:
- Continent-scale massif mask
- Domain-warped ridged multifractal
- Billow noise for rounded forms
- Valley carving for drainage networks
- Strata terracing for cliff bands

**Why**: The Waterfall stage needs procedural terrain height for:
- Deforming the Three.js ground mesh to show cliff elevation
- Positioning route mesh segments at correct heights
- Placing authored props (gate arch, lanterns, lookout) on terrain surface
- Animating water flow along elevation gradients

**How to adopt**:
- Port the noise primitives (`valueNoise`, `fbm`, `ridgedMultifractal`, `billow`) to `src/waterfall_terrain.js`
- Create `sampleWaterfallHeight(x, y)` that maps Jungle's 2D coordinates to elevation
- Use elevation for render-only Three.js mesh deformation (not collision)
- Keep `WaterfallWorldGeometry.isWalkable()` unchanged

**Risk**: Low. Pure math, no architectural changes.

### 2. Terrain-Normal Sampler

**Source**: `src/terrain/compiler/compileSection.ts` — `calculateNormals()`, `calculateMeshCurvature()`

**What**: Analytical surface normals computed from triangulated mesh vertices, plus mean curvature via normal field divergence.

**Why**: Normals are needed for:
- Correct lighting on deformed terrain mesh (Three.js `MeshStandardMaterial` needs normals)
- Prop rejection on steep surfaces (props refused on ground >40 degrees)
- Material blending between cliff rock and vegetation zones

**How to adopt**:
- Compute normals from the deformed terrain mesh vertices after height sampling
- Use vertex normals for Three.js material lighting
- Use curvature threshold for prop steepness rejection

**Risk**: Low. Standard mesh computation, well-understood algorithms.

### 3. Static Ground-Following Placement

**Source**: `src/foliage/foliageGroundHeight.ts` — `FoliageGroundHeightField` pattern

**What**: For a small number of authored props, sample terrain height once at scene construction and set each prop's render position.

**Why**: The Waterfall stage has ~16 authored art props (`waterfall_art_manifest.js`) that should sit on the terrain surface rather than at flat `(x, y)` positions.

**How to adopt**:
- At scene init, for each authored prop: `prop.renderY = prop.y - sampleWaterfallHeight(prop.x, prop.y) * ELEVATION_SCALE`
- Store the result; no per-frame recomputation needed (terrain is static)
- For the player visual: sample height at `player.x, player.y` each frame and offset the Three.js sprite

**Risk**: Low. Direct sampler lookup, no grid infrastructure needed.

---

## POC LATER

### 1. Memoized Height Cache

**Source**: `src/terrain/compiler/heightField.ts` — `sampleHeightFieldCached(x, z, seed)`

**What**: 4-way set-associative memoized cache (64K sets x 4 ways = 256K entries). Memory cost: `65536 * 4 * 3 * 4 bytes` = **~3 MiB** (not ~17 KB as previously stated).

**When**: Only if profiling shows that repeated height sampling is a measurable cost. The Waterfall scene is small (~1600x1200 world) with a static terrain. A simple pure sampler may be sufficient without caching.

**What to port if needed**:
- Cache structure with quantized key (1/4096 precision)
- No invalidation needed (height field is immutable per session)

**What NOT to port**: The full 256K-entry cache is likely overkill for the Waterfall scene size. Start with a simpler approach and measure.

### 2. Screen-Space LOD Selection

**Source**: `src/terrain/lod/LodSelector.ts`

**What**: Selects LOD level based on projected geometric error vs screen-space tolerance (2.65px). Uses hysteresis (16% slack) and neighbor constraints (max 1 LOD difference).

**When**: If the Three.js waterfall scene scales beyond current geometry and needs detail reduction.

**What to port**: `projectedError` calculation, hysteresis logic, neighbor constraint.

**What NOT to port**: The 5-level resolution array, section-based addressing, worker-driven LOD compilation.

### 3. Frame Budget Scheduler Pattern

**Source**: `src/terrain/core/FrameBudgetScheduler.ts`

**What**: Hard invariant that terrain work never stalls a frame. Measures actual cost per task class, admits work based on remaining budget.

**When**: If Three.js waterfall scene grows to include streaming geometry or dynamic terrain updates.

**What to port**: Budget admission pattern, measured cost learning, quality pressure.

**What NOT to port**: Multi-class cost tracking, worker pool integration, section swap batching.

### 4. Advanced Water-Surface Techniques

**Source**: `src/terrain/water/WaterStore.ts`

**What**: Paint-based water coverage field with configurable level, radius, and strength.

**When**: If the Waterfall stage water system needs more sophisticated level control than the current procedural animation.

**What to port**: Level-based water surface rendering, coverage blending.

**What NOT to port**: Paint-based editing, Zustand store integration.

---

## DO NOT ADOPT

### 1. WebGPU Renderer

**Why not**: The current RC is validated on Three.js/WebGL. Super Terrain has no WebGL fallback — it requires `THREE.WebGPURenderer` exclusively. Switching the renderer would invalidate the RC baseline and require re-validation across all target devices. Android WebView and target-device acceptance for WebGPU is still pending. This is a **project compatibility and risk decision**, not a universal platform claim.

**Architectural conflict**: Jungle uses `THREE.WebGLRenderer` with orthographic camera. Super Terrain's entire rendering stack assumes WebGPU.

### 2. React/R3F Integration

**Why not**: Jungle Web is vanilla JavaScript ES modules with zero framework dependencies. Adding React and React Three Fiber would:
- Increase bundle size significantly
- Require build tooling (Vite/webpack) for the entire game
- Conflict with the existing Three.js rendering path
- Break the 35+ tests that enforce architecture invariants

**Architectural conflict**: Super Terrain's `TerrainView.tsx` is a React component using `useFrame`, `useEffect`, and R3F's reconciler. Jungle's game loop is a single `requestAnimationFrame` callback in `game.js`.

### 3. Worker Terrain Compiler

**Why not**: Jungle's terrain is simple enough for main-thread computation. The Waterfall stage has a static terrain with ~16 authored props, a 14-node path, and procedural cliff/water geometry. Super Terrain's worker pool exists because it compiles 128m mesh sections with BVH acceleration, surface field calculation, and LOD simplification. Jungle has none of this complexity.

**Architectural conflict**: Super Terrain's `TerrainWorkerPool` manages persistent workers with revision checking, staleness handling, and pipeline depth. Not applicable to Jungle's use case.

### 4. Streaming/LRU Cache

**Why not**: Jungle's world is small enough to preload entirely. Super Terrain streams because its 4km x 4km world with 5 LOD levels generates gigabytes of compiled sections. Jungle's 1600x1200 world with static terrain has nothing to stream.

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

Add render-only terrain height to the Waterfall stage's Three.js production renderer using Super Terrain's height field sampling algorithm. Logical X/Y gameplay remains authoritative; terrain height is presentation-only.

### Target Path

The PoC targets the **Three/WebGL production presentation path**:
- `three_waterfall_preview.js` owns terrain/route/story Three objects
- `three_waterfall_runtime.js` bridges read-only gameplay state/player position into the renderer
- `game.js` remains authoritative for logical gameplay

Canvas 2D fallback remains unchanged unless there is a separate reason to alter it.

### New Files

| File | Purpose |
|------|---------|
| `src/waterfall_terrain.js` | Deterministic height sampler + optional normal sampler |

### Modified Files

| File | Change |
|------|--------|
| `src/three_waterfall_preview.js` | Deform ground mesh, route mesh, and place props using height sampler |
| `src/three_waterfall_runtime.js` | Ground production player visual using same sampler, preserving logical X/Y |

### Unchanged Files

- `src/geometry.js` — `WaterfallWorldGeometry` (collision, walkable paths)
- `src/content/waterfall_chapter.js` — game progression
- `src/content/waterfall_interactables.js` — interaction positions
- `src/game.js` — game loop, player movement, authoritative X/Y
- `src/player.js` — player sprite
- `src/movement.js` — movement controller
- `src/camera.js` — camera follow
- `src/waterfall_scene.js` — Canvas 2D fallback (unchanged unless separately desired)

### Design Details

#### `src/waterfall_terrain.js`

```javascript
// Ported from Super Terrain heightField.ts
// Simplified: continent mask + ridged multifractal + billow only
// No valley carving, no strata terracing (not needed for Waterfall)

// Noise primitives (ported from heightField.ts)
function valueNoise(x, z, seed) { ... }
function fbm(x, z, seed, octaves, lacunarity, gain) { ... }
function ridgedMultifractal(x, z, seed, octaves) { ... }
function billow(x, z, seed, octaves) { ... }

// Main sampler — deterministic, pure function
export function sampleWaterfallHeight(worldX, worldY, seed = 42) {
  // Returns elevation in range [0, MAX_ELEVATION]
  // Domain: Jungle's 1600x1200 world coordinates
  // Inverted to Three.js: world Y -> Three.js -Z, elevation -> Three.js Y
}

// Optional: compute surface normal from height gradient
export function sampleWaterfallNormal(worldX, worldY, seed = 42, epsilon = 1.0) {
  // Central-difference normal from height samples
  // Returns {x, y, z} unit normal vector
}
```

#### Changes to `src/three_waterfall_preview.js`

In the terrain mesh construction (currently `addGround()` with flat `PlaneGeometry`):

```javascript
// Replace flat PlaneGeometry with deformed geometry
const geometry = new THREE.PlaneGeometry(WORLD_W, WORLD_D, SEGMENTS_X, SEGMENTS_Z);
const positions = geometry.attributes.position;

for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i);
  const z = positions.getY(i); // PlaneGeometry Y maps to Three.js Z
  // Convert Three.js coords back to world coords for sampler
  const worldX = x / WORLD_SCALE + WORLD_W / 2;
  const worldY = -z / WORLD_SCALE + WORLD_D / 2;
  const elevation = sampleWaterfallHeight(worldX, worldY);
  positions.setZ(i, elevation * ELEVATION_SCALE);
}

geometry.computeVertexNormals(); // Recompute normals from deformed vertices
```

For authored props (gate arch, lanterns, lookout platform):

```javascript
// At prop construction time:
const elevation = sampleWaterfallHeight(prop.worldX, prop.worldY);
prop.mesh.position.y = elevation * ELEVATION_SCALE;
```

For the player visual:

```javascript
// In the animation loop (via three_waterfall_runtime.js bridge):
const elevation = sampleWaterfallHeight(player.x, player.y);
playerSprite.position.y = elevation * ELEVATION_SCALE;
// player.x, player.y remain authoritative for collision
```

#### Changes to `src/three_waterfall_runtime.js`

The runtime bridge passes player position to the preview. Add height offset:

```javascript
// In the per-frame sync:
const elevation = sampleWaterfallHeight(state.player.x, state.player.y);
// Pass to preview's player sprite positioning
```

### What Stays Unchanged

- `WaterfallWorldGeometry.isWalkable()` — collision is still flat 2D
- `WaterfallWorldGeometry.paths` — walkable route is unchanged
- `waterfall_chapter.js` — game progression is unchanged
- `waterfall_interactables.js` — interaction positions are unchanged
- `game.js` — player X/Y movement is still authoritative
- `player.js` — sprite rendering uses logical coordinates
- `movement.js` — acceleration model unchanged

### Expected Visual Effect

- Ground mesh shows terrain elevation (cliff terraces, basin depression)
- Route mesh follows terrain contour
- Authored props (gate arch, lanterns, lookout) sit on terrain surface
- Player visual follows terrain while walking on flat collision path
- Water surface reflects elevation changes

---

## Files/Functions Affected

### New Code (1 file)

| File | Functions |
|------|-----------|
| `src/waterfall_terrain.js` | `sampleWaterfallHeight()`, `sampleWaterfallNormal()` (optional), noise primitives |

### Modified Code (2 files)

| File | Functions | Change |
|------|-----------|--------|
| `src/three_waterfall_preview.js` | `addGround()`, prop construction | Deform terrain mesh, ground props at height |
| `src/three_waterfall_runtime.js` | Per-frame sync | Ground player visual at sampled height |

### Unchanged Code

- `src/geometry.js` — `WaterfallWorldGeometry` (collision)
- `src/game.js` — game loop, authoritative player X/Y
- `src/content/waterfall_chapter.js` — game logic
- `src/content/waterfall_interactables.js` — interaction positions
- `src/player.js` — player sprite
- `src/movement.js` — movement controller
- `src/camera.js` — camera follow
- `src/waterfall_scene.js` — Canvas 2D fallback (unchanged)

---

## Risks

### 1. Performance on Android WebView (Needs Profiling)

**Risk**: The height field sampling uses multiple octaves of noise. On low-end Android devices, per-frame sampling for player position + prop positions could add measurable cost.

**Mitigation**:
- Profile on target devices during PoC
- Prop heights are static (sample once at init, not per-frame)
- Player height is one sample per frame (negligible)
- Terrain mesh vertices are computed once at construction, not per-frame
- Memoized cache available as POC LATER if profiling justifies it

### 2. Visual Glitches at Terrain Edges (Low Risk)

**Risk**: If height sampling produces discontinuities at world boundaries, terrain mesh may show seams.

**Mitigation**:
- Waterfall world is a single 1600x1200 rectangle (no section boundaries)
- Height field is a continuous function (no seams by construction)

### 3. Test Coverage Gap (Medium Risk)

**Risk**: New height computation code has no existing tests.

**Mitigation**:
- Add tests for `sampleWaterfallHeight()` determinism
- Add tests for normal computation correctness
- Add tests enforcing architecture invariant: height is render-only, not collision
- Enforce that `WaterfallWorldGeometry.isWalkable()` is unchanged

---

## Performance Considerations for Android WebView

All performance numbers below are **unverified estimates**. The PoC must include a profiling plan on target devices.

### Known Constraints

- Frame budget: 16.6ms (60 FPS target)
- Three.js rendering is the production path; Canvas 2D is fallback
- Terrain mesh construction happens once at scene init, not per-frame
- Per-frame cost: one height sample (player position) + prop positions (static)

### Profiling Plan for PoC

1. Measure terrain mesh construction time on low-end Android
2. Measure per-frame height sampling cost (single sample for player)
3. Measure total frame time with/without height deformation
4. Compare Three.js mode with and without terrain deformation
5. Identify if memoized cache is needed (likely not for this scene size)

### Recommendations

1. Pre-compute prop heights at scene construction (not per-frame)
2. Profile before adding caching infrastructure
3. If caching is needed, start with a simple Map, not the full 3 MiB set-associative cache
4. Never block the game loop on height computation

---

## Recommendation

### Immediate (This Sprint)

1. **Implement `waterfall_terrain.js`** — port noise primitives, deterministic sampler
2. **Modify `three_waterfall_preview.js`** — deform ground mesh, place props at height
3. **Modify `three_waterfall_runtime.js`** — ground player visual at sampled height
4. **Add tests** — determinism, architecture invariant enforcement
5. **Profile on target devices** — measure actual cost before optimizing

### Future POCs (Not Now)

1. Memoized cache (if profiling justifies it)
2. Screen-space LOD (if geometry scales)
3. Frame budget scheduler (if dynamic terrain updates needed)
4. Advanced water-surface techniques

### Explicitly Rejected

1. WebGPU renderer (project risk — RC validated on WebGL, re-validation needed)
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
