# Asset source shortlist

This shortlist is for EDUNI Jungle Camp and Waterfall. It separates source
selection from actual runtime integration.

| Source | License | Best use | Acquire next when |
| --- | --- | --- | --- |
| [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | CC0 | tree canopy, rocks, flowers, ground foliage | the existing GLB library lacks a child-readable natural prop |
| [Kenney Survival Kit](https://kenney.nl/assets/survival-kit) | CC0 | camp landmark, simple interactive prop | an interaction needs a clearer authored object |
| [Quaternius Ultimate Stylized Nature Pack](https://quaternius.com/packs/ultimatestylizednature.html) | CC0 | cohesive stylized forest layer, glTF | the Waterfall preview needs a consistent art-direction alternative |
| threejsassets Free collection | provider-specific; raw files not redistributable | local Three.js Waterfall preview | a listed local placeholder needs replacement |

## Current Waterfall selection

The locally available threejsassets set already covers the first Waterfall
preview selection: cypress tree, mossy boulder, mangrove cluster, cattail reed
clump, swamp mist cloud, and bayou water. Use those before widening scope.

## Locally acquired CC0 pack

`assets/vendor/kenney/nature-kit/` now contains Kenney Nature Kit 2.1: 329 GLB
models, 329 FBX models, the Isometric sprite set, and `License.txt` (CC0).
The pack is ignored locally by default; use only the models needed by a scene.

## Acquisition acceptance

- Browser download event received and local file verified.
- Provider, license, pack version, and file list recorded.
- Archive contains no executable installer and has a usable WebGL format.
- Raw binary Git inclusion has separate license and user-scope approval.
- Runtime proves `GLTFLoader + DRACOLoader` (or the chosen loader) succeeds,
  with a fallback path for absent local vendor files.
