# Nemotron Task — Waterfall terrain-height PoC

Repo: `JongPyoShin/eduni-links`
Issue: #55
Assigned branch: `exp/nemotron-waterfall-terrain-poc`
Frozen Web RC baseline: `2e10f2d201be9e2cfc9701c57004bf15ffcb88c9`

## Operating rule
All meaningful work and results must be committed and pushed to this branch. Chat output is not authoritative. Do not modify PR #53 or the RC branch directly. Do not merge/rebase/reset the RC branch.

## Goal
Prove or reject a minimal terrain-height approach in Waterfall without replacing the current engine.

## Hard constraints
Keep:
- Three.js WebGL path
- current logical 2D gameplay route/collision
- current interaction target coordinates/radii
- current progression/reward/persistence
- current InputController

Do not introduce:
- WebGPU
- React / React Three Fiber
- Super Terrain package vendoring
- worker compiler
- streaming/LRU
- CSG
- runtime sculpt
- Android changes

Do not redesign the route or other four stages.

## Desired design
Add a small deterministic Waterfall terrain presentation layer, e.g.:
- terrain height sampler from logical X/Y
- optional terrain normal sampler
- terrain mesh generation using the same sampler
- player visual grounding on sampled height
- visual route/props grounded on sampled height

Gameplay remains authoritative in logical X/Y. Height is render-only.

Visual intent:
- entry/stream/stepping-stone area low
- Mist section rising
- Lookout clearly higher than entry
- cardinal route stays visually readable
- no visual wall across a walkable logical route

## Required tests
Add coverage for:
1. deterministic height sampling
2. Lookout height > entry height
3. authored Waterfall route unchanged
4. all interaction X/Y/radii unchanged
5. generated terrain vertices finite/valid
6. no WebGPU dependency
7. no React/R3F dependency
8. existing Waterfall regression tests remain green

## Validation
Run and record actual results:
- `node --test`
- `git diff --check`

Browser QA:
`http://127.0.0.1:8124/?stage=waterfall&renderer=three&qa=1`

Complete actual E2E:
Stream Gate → Stepping Stones → Echo → Mist Trail → Leaf Match → Lookout → Kingfisher → Reward

Verify:
- visible terrain relief is obvious
- Lookout is visibly higher
- stream/stepping stones stay low
- visible route remains walkable/cardinal
- player is not floating/buried
- props are not badly floating/buried
- Three runtime remains active
- console/page errors none

Record any available renderer calls/triangles/geometry counts and obvious FPS regression.

## Git delivery
Commit and push all results. Open/update a Draft PR:
- base: `prototype/jungle-web-canvas-poc`
- head: `exp/nemotron-waterfall-terrain-poc`
- title: `Experiment: Waterfall terrain-height PoC`

PR body must include Issue #55, base/head SHA, changed files, architecture summary, unchanged gameplay contracts, terrain height range, test output, browser QA, performance notes, risks, and final self-assessment.

Do not merge.
