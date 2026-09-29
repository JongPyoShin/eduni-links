# Asset source shortlist

This shortlist is for EDUNI Jungle Camp and Waterfall. It separates source
selection from actual runtime integration.

| Source | License | Best use | Acquire next when |
| --- | --- | --- | --- |
| [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | CC0 | tree canopy, rocks, flowers, ground foliage | the existing GLB library lacks a child-readable natural prop |
| [Kenney Survival Kit](https://kenney.nl/assets/survival-kit) | CC0 | camp landmark, simple interactive prop | an interaction needs a clearer authored object |
| [Quaternius Ultimate Stylized Nature Pack](https://quaternius.com/packs/ultimatestylizednature.html) | CC0 | cohesive stylized forest layer, glTF | the Waterfall preview needs a consistent art-direction alternative |
| threejsassets Free collection | provider-specific; raw files not redistributable | local Three.js Waterfall preview | a listed local placeholder needs replacement |
| [Pirate Nation game archive](https://github.com/proofofplay/piratenation-game) | authored code MIT; project depends on missing commercial packs and inactive backend | gameplay/map/collectible-flow reference only | never copy Unity code, dependencies, brand UI, or runtime assets into this Three.js web build |
| [Pirate Nation art](https://github.com/proofofplay/piratenation-art) | CC0 1.0 | optional foliage/landmark reference or narrowly selected CC0 asset | only use an exact verified binary path after Git LFS checkout and loader/render proof |

## Current Waterfall selection

The locally available threejsassets set already covers the first Waterfall
preview selection: cypress tree, mossy boulder, mangrove cluster, cattail reed
clump, swamp mist cloud, and bayou water. Use those before widening scope.

## Locally acquired CC0 pack

`assets/vendor/kenney/nature-kit/` now contains Kenney Nature Kit 2.1: 329 GLB
models, 329 FBX models, the Isometric sprite set, and `License.txt` (CC0).
The pack is ignored locally by default; use only the models needed by a scene.

The following Kenney packs are also downloaded and unpacked locally under
`assets/vendor/kenney/`:

- `survival-kit/`: 80 GLB, 87 PNG, 1 license file
- `animal-pack-remastered/`: 249 PNG, 1 license file
- `particle-pack/`: 193 PNG, 1 license file
- `pixel-ui-pack/`: 36 PNG, 1 license file
- `ui-audio/`: 52 OGG, 1 license file

All five packs identify themselves as CC0. They are local-only by default;
select and optimize individual files before any runtime wiring.

## Pirate Nation reference evaluation

`proofofplay/piratenation-game` is not a runtime source for this project. Its
README describes an archived Unity WebGL client with missing commercial
third-party packs and an inactive backend, so it is retained only as a
reference for map pacing, landmark sequencing, and collectible flow. No Unity
code, package, backend contract, Pirate Nation logo, mark, or other brand UI is
copied here.

`proofofplay/piratenation-art` is CC0 1.0 and has relevant categories such as
`Trees/Static`, `Trees/Tall`, `Trees/Animated`, `Alt Trees`, bushes, Birds of
Paradise Fern, map, collectibles, and UI. The inspected `.gltf`, `.zip`, and
`.png` candidates were Git LFS pointer text rather than runtime binaries in
the available checkout. Therefore the selected set from this repo is **none**:
no pointer file is wired into a loader, and no new dependency or asset bundle
is added. The current scenes use the already verified Kenney/threejsassets files
plus procedural Three geometry for the composition pass.

If Git LFS is prepared later, evaluate only one to three exact CC0 foliage or
map-landmark paths, verify that each checkout is binary (not a pointer), record
the path and license here, then prove `GLTFLoader`/image loading and a rendered
scene before considering runtime inclusion. Until those checks pass, Pirate
Nation art remains a visual reference only.

## Acquisition acceptance

- Browser download event received and local file verified.
- Provider, license, pack version, and file list recorded.
- Archive contains no executable installer and has a usable WebGL format.
- Raw binary Git inclusion has separate license and user-scope approval.
- Runtime proves `GLTFLoader + DRACOLoader` (or the chosen loader) succeeds,
  with a fallback path for absent local vendor files.
