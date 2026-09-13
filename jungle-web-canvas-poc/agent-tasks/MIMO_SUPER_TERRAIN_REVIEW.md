# MiMo Task — Super Terrain adoption review

Repo: `JongPyoShin/eduni-links`
Issue: #55
Assigned branch: `exp/mimo-super-terrain-review`
Frozen Web RC baseline: `2e10f2d201be9e2cfc9701c57004bf15ffcb88c9`

## Operating rule
All meaningful work and results must be committed and pushed to this branch. Chat output is not authoritative. Do not modify PR #53 or the RC branch directly. Do not merge/rebase/reset the RC branch.

## Goal
Review `vibe-stack/super-terrain` against the current Jungle Web RC and decide exactly what should or should not be adopted while preserving the current Three.js/WebGL gameplay contracts.

## Required analysis
Compare current Jungle architecture with Super Terrain for:
- route-based terrain height mesh
- terrain height sampling
- terrain normal sampling
- ground-following prop placement
- chunk/section organization
- simple distance LOD
- WebGPU renderer
- React/R3F
- worker terrain compiler
- streaming/LRU
- runtime sculpt
- CSG tunnels

Classify every item as `ADOPT NOW`, `POC LATER`, or `DO NOT ADOPT`.

Answer explicitly:
1. Can current Jungle logical X/Y gameplay remain authoritative while render-only height is added?
2. Can terrain height affect player visuals/props/path mesh without changing collision/interactable contracts?
3. Which concrete Jungle files/functions would change for a minimal Waterfall terrain PoC?
4. Which Super Terrain algorithms are worth referencing/porting?
5. Which parts should not be adopted and why, especially WebGPU, R3F, worker compiler, streaming/LRU, runtime sculpt, and CSG?

## Deliverable
Create and commit:
`jungle-web-canvas-poc/docs/super-terrain-adoption-review.md`

Required sections:
- Executive verdict
- Current Jungle architecture
- Super Terrain architecture
- Compatibility matrix
- ADOPT NOW
- POC LATER
- DO NOT ADOPT
- Waterfall PoC concrete design
- Files/functions affected
- Risks
- Performance considerations for Android WebView
- Recommendation

Prefer documentation only. Do not change production gameplay code.

## Validation
Run and record actual results:
- `node --test`
- `git diff --check`

## Git delivery
Commit and push all results. Open/update a Draft PR:
- base: `prototype/jungle-web-canvas-poc`
- head: `exp/mimo-super-terrain-review`
- title: `Experiment: Super Terrain adoption review`

PR body must include Issue #55, HEAD SHA, changed files, main verdict, classification lists, test results, risks/blockers.

Do not merge.
