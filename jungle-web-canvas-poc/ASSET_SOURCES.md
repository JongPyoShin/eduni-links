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

Current checkout result: `git lfs version` failed because Git LFS is not
installed, and no system installation or settings change was attempted. The
two requested `media.githubusercontent.com` URLs were nevertheless valid
binary JSON glTF responses with embedded buffers/textures (no external buffer
or image dependencies), so they were selected and verified:

| Local file | Original CC0 source path | SHA-256 | Runtime use |
| --- | --- | --- | --- |
| `assets/vendor/piratenation/PN-PalmTreeStatic.gltf` | `Voxel Game Assets/world items/Trees/Palm Tree Static/20221023/PN-PalmTreeStatic.gltf` | `D1E3D1DF945C586837B065DCDD1817298B7733449134C500D785B998A387760E` | Sky Ridge mid/foreground palm silhouettes |
| `assets/vendor/piratenation/PN-BirdsOfParadisePlant.gltf` | `Voxel Game Assets/world items/Decorations/Birds of Paradise Fern/GLTF/PN-BirdsOfParadisePlant.gltf` | `C3D3254B02F2F4975696AEA4D4311A15DD38122D01DBC76A9FA03BB5BF58529B` | Sky Ridge foreground fern clusters |

CC0 notice: the source repository is `proofofplay/piratenation-art` and its
repository license is CC0 1.0. These files were fetched directly from
`media.githubusercontent.com/media/proofofplay/piratenation-art/main/...`,
parsed as JSON, and checked for zero external `.bin`/image URIs before being
connected to the local `GLTFLoader`. No Pirate Nation logo, branded UI, or
Unity game code is included.

## Acquisition acceptance

- Browser download event received and local file verified.
- Provider, license, pack version, and file list recorded.
- Archive contains no executable installer and has a usable WebGL format.
- Raw binary Git inclusion has separate license and user-scope approval.
- Runtime proves `GLTFLoader + DRACOLoader` (or the chosen loader) succeeds,
  with a fallback path for absent local vendor files.
