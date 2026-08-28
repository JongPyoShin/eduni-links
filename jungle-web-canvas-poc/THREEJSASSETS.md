# Three.js Waterfall vendor-asset PoC

The optional preview lives at:

- `three-waterfall.html`
- renderer: `src/three_waterfall_preview.js`
- local vendor manifest: `src/three_vendor_manifest.js`

## Why local-only vendor files

The target source is `threejsassets.com`, especially the **Swamp & Bayou** free models. The provider advertises commercial use, but its pack license also says the raw model files must not be resold or redistributed as an asset library. This repository is public, so downloaded GLB files are intentionally excluded from git.

Place locally acquired GLBs here:

`assets/vendor/threejsassets/`

That directory is gitignored.

Expected filenames for the first Waterfall pass:

- `cypress-tree.glb`
- `mossy-boulder.glb`
- `mangrove-cluster.glb`
- `cattail-reed-clump.glb`
- `swamp-mist-cloud.glb`
- `water-open-bayou.glb`

The preview attempts to load those local files with `GLTFLoader + DRACOLoader`. If a file is absent, the renderer substitutes a lightweight low-poly fallback so the Three.js scene still boots and can be compared against the existing Canvas Waterfall.

## Preview URL

When serving `jungle-web-canvas-poc` on port 8124:

`http://localhost:8124/three-waterfall.html`

Existing product implementation remains unchanged:

`http://localhost:8124/?stage=waterfall`

## PoC acceptance

Before integrating Three.js into the gameplay runtime, compare the preview against the current Canvas version for:

- depth and environmental richness
- route readability
- landmark hierarchy
- tablet frame time
- model download/decode time
- player readability
- compatibility with Android WebView

Do not replace the production Waterfall renderer until the Three.js preview is clearly better and the device performance budget is acceptable.
