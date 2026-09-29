# Jungle Web Canvas Luna release report

## Scope

- Base: `843ebed58b1f54dbaa341c15f54cfe1d562e8435` (detached WIP preserved)
- Branch: `feature/jungle-web-canvas-luna`
- Initial WIP status: `jungle-hub.html`, `src/game.js`, `src/sky_ridge_game.js` modified; bird codex/manifest/quiz source and three tests untracked; `node_modules/`, `pnpm-lock.yaml`, `tmp/` generated and excluded.
- Production/8081, host 8080, Android, and unrelated Docker were not touched.

## Implementation

The existing Canvas/Three play loop now keeps the bird quiz session in localStorage while a quiz is active. Reloading or re-entering the same bird resumes the unanswered question; completing or failing a quiz clears the active session. Existing codex capture and stage reward writes remain idempotent, so re-capture does not duplicate badges.

The WIP bird codex, 65-question bank, three bird manifest entries, hub link/count, and Camp/Waterfall/Sky Ridge quiz bridges are included. Cave and Giant Tree retain their authored sequential learning/reward loops.

The visual follow-up adds a numbered five-stage route rail, explicit `진행 가능` / `잠김` / `완료 · 다시 보기` card states, and a persisted progress meter to the hub. The phone breakpoint is `900px` CSS width to account for the headed Chrome device scale used in QA; this keeps the stage cards one-column and touch-sized at phone widths without changing gameplay or storage logic.

The HUD follow-up adds a visible `지도` return link to Camp/Waterfall, Cave, Giant Tree, and Sky Ridge, plus a `숲속 탐험 캠프 · 탐험 중` / `안개 폭포 · 탐험 중` chip for the shared Camp/Waterfall entry screen.

The final UI pass adds a compact five-stop route strip to the hub. It mirrors the same persisted reward state as the cards, highlighting open/completed stages and pulsing the next available stop without changing progression or storage logic.

The scene composition pass adds a phase-driven objective beacon to the Cave, Giant Tree, and Sky Ridge Three.js scenes: a grounded animated ring plus a translucent vertical light column at the authored next landmark. Camp keeps its existing interaction ring and Waterfall keeps its authored cue rings, so all five playable scenes now expose a scene-level target without changing quiz, reward, or save state.

The follow-up composition pass makes the scene change visible beyond the beacon: Cave now has a restrained translucent stalactite/boulder frame at the safe edges, Giant Tree now has foreground roots and canopy framing the authored trunk, and Sky Ridge now has cliff-edge silhouettes and foreground cloud banks framing the route. These use existing procedural Three geometry/materials only; route centerlines and gameplay anchors are unchanged.

The Pirate Nation art check confirmed `git lfs version` is unavailable (`git: 'lfs' is not a git command`), so no external CC0 pointer was imported. To make the reference concrete without installing LFS or adding a bundle, Sky Ridge now has six small existing-geometry island waypoints with colored pennants offset along the authored route, giving the summit map a readable island-exploration/reward-map cadence.

The latest Sky Ridge composition pass tightens the orthographic view height from `10.8` to `8.9`, enlarges the player billboard from `1.35×1.8` to `1.75×2.35`, adds four contrasting low-poly island terraces with rim accents, and shifts the camera target toward the authored route. The resulting after capture shows the player, pennant waypoints, route, and summit landmarks at a readable scale instead of a wide flat plane.

That earlier Sky Ridge-only scale statement is superseded. The current redesign uses shared `PLAYER_SPRITE_SCALE = 1.35×1.8` in Camp, Waterfall, Cave, Giant Tree, and Sky Ridge, and all five stage preview cameras now use an authored `viewHeight=10.8` span (Camp was previously responsive-capped at 10.2; Sky Ridge was previously 8.9). Gameplay camera contracts and interaction anchors remain unchanged.

The composition redesign now applies one shared scene layout grammar to all five renderers: a recessed background plane, three stage-colored midground islands, and a narrow foreground lip are inserted before the authored route/landmarks. Camp, Waterfall, Cave, Giant Tree, and Sky Ridge each provide different palettes and retain their own landmark assets, while the playable centerline remains the single shared geometry source. This replaces the prior single-plane presentation rather than adding another HUD/route label.

The Cave/Giant Tree/Sky Ridge objective beacons are now rendered 42–44 logical units sideways and 34–36 units up-route from their authored interaction anchors. The gameplay target/radius is unchanged; only the visual marker moves into the adjacent midground island so the approaching avatar and landmark silhouette are separated in the isometric projection.

The fresh 390×844 acceptance capture exposed a separate camera bug: the portrait follow clamp centered Cave/Giant Tree/Sky Ridge/Waterfall on `x=-3.1..3.1`, `z=-3..3`, while the authored spawn `(200,1040)` projects near `(-6,4.4)`. The new `framedTargetX/Z` bounds (`-5.5..5.5`, `-4.6..4.6`) preserve the old contract variables for regression tests but drive the actual camera follow, keeping the spawn, first route segment, and next gate in the portrait safe area.

The requested direct media check succeeded without Git LFS installation: both CC0 glTFs downloaded as valid JSON with embedded buffers/images and zero external `.bin`/image URIs. Sky Ridge now loads `PN-PalmTreeStatic.gltf` and `PN-BirdsOfParadisePlant.gltf` through the existing local `GLTFLoader`; runtime status dataset reported both `loaded:true`, and the after capture visibly shows the palm/fern clusters along the route.

## Verification

- `npm test`: **232 passed, 0 failed**.
- Focused scene regression after the beacon pass: **62 passed, 0 failed** (`Cave gameplay`, `Giant Tree`, `Sky Ridge` patterns).
- `git diff --check`: passed (only normal LF/CRLF warnings).
- Updated hub smoke on headed Chrome (`http://localhost:8124`, isolated worktree server): route strip exposed all five stops (`캠프`, `폭포`, `동굴`, `고목`, `능선`), cards exposed `진행 가능`/`잠김`, and computed document overflow was `false` at the available `2168×1210` CSS viewport. Camp `?renderer=three&qa=1` reached `startup=ready`, `threeReady=true`, objective `학습 오두막을 찾아가 보자`, and stage chip `숲속 탐험 캠프 · 탐험 중`.
- Updated scene smoke on headed Chrome (`http://localhost:8125`, isolated worktree server): Cave `단계 1/9 · caveGate · GLB 4/4 · fallback 0`, Giant Tree `단계 1/9 · rootGate · GLB 6/6 · fallback 0`, Sky Ridge `단계 1/9 · skyGate`, and Waterfall `threejsassets local GLB 14/14 loaded · fallback 0`; all reported `overflow=false` at the available `2168×1210` CSS viewport. Cave and Waterfall screenshots visibly showed the target ring/landmark framing with HUD and D-pad outside the canvas content.
- Before/after headed Chrome comparison on the composition pass: before Cave was a mostly empty dark field with the route and rocks concentrated in the upper center; after Cave shows a readable framed chamber with the route still unobstructed after reducing the initial frame opacity/scale. After Giant Tree visibly frames the trunk route with two foreground roots and canopy masses; after Sky Ridge frames the pale route with cliff silhouettes and cloud banks. HUD, map link, and D-pad remained outside the canvas scene in all three captures.
- Fresh all-five smoke on `http://localhost:8126` reported CSS `1084×428`, `overflow=false`, and ready/status evidence for Camp (`qa=ready`), Waterfall (`GLB 14/14, fallback 0`), Cave (`GLB 4/4, fallback 0`), Giant Tree (`GLB 6/6, fallback 0`), and Sky Ridge (`skyGate`).
- Fresh Sky Ridge after-capture visibly shows the six pennant waypoints stepping from the player toward the summit route; HUD and D-pad remain outside the map canvas at CSS `1084×428`, `overflow=false`.
- Final Sky Ridge before/after capture comparison: before showed a wide low-contrast green plane, small player, and overlapping circular masses; after shows a tighter framed route, larger player, four differentiated island terraces, six pennant waypoints, and stronger terrain contrast. Final headed Chrome evidence was CSS `1084×428`, `overflow=false`, status `단계 1/9 · skyGate`.
- Final redesign focused test suite: **67 passed, 0 failed** (`camera`, `player`, `renderer`, `preview`, `parse`, `geometry` patterns). No full npm suite was rerun for this redesign pass.
- Current headed Chrome attempts for all five stages returned `innerWidth=0, innerHeight=0` and screenshot `Cannot take screenshot with 0 width` in both the existing and fresh tab. Therefore the five-stage visual hierarchy and requested 360×800/390×844/412×915 character-height ratios are **NOT VERIFIED** in this pass; no zero-viewport result is represented as a successful screenshot.
- User-provided fresh 390×844 screenshots are recorded as a real **FAIL before this camera fix**: Waterfall/Cave/Giant Tree were blank flat fields despite GLB success, Sky Ridge had clipped empty framing, and Camp showed only an L-shaped corridor. A post-fix screenshot could not be recaptured in this browser surface because both existing and fresh tabs still returned `0×0` / `Cannot take screenshot with 0 width`; 390×844 after-fix, 360×800, and 412×915 remain **NOT VERIFIED**.
- Final CC0 foliage after capture at CSS `1084×428`: `pirateFoliage` reported Palm and Birds of Paradise entries loaded successfully; HUD/D-pad remained outside the canvas and `overflow=false`.
- Headed Chrome extension QA opened and exercised real keyboard input on all five entry points at `?qa=1`: Camp, Waterfall, Cave, Giant Tree, Sky Ridge. Each page loaded its expected title/HUD and input controls; Cave reported `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and no console warning/error entries were captured.
- Hub DOM showed the codex link `(0/3)`, all five stage cards, and the expected locked progression text.
- Follow-up hub QA showed the new route heading, all five numbered card states, and progress meter. At the emulated phone viewport, computed grid columns changed to a single `684px` column with `overflow=false`.
- Follow-up browser DOM QA at emulated `390x844` (`CSS 780x1688`, `dpr=0.5`) confirmed the Waterfall stage chip, Cave `지도` link, and `overflow=false` on both pages.
- Explicit viewport QA used Browser Control/CUA's viewport capability on an isolated local tab. The emulated device scale was `dpr=0.5`, so CSS sizes were doubled while the requested physical sizes were applied.
  - `360x800`: hub and Camp screenshots rendered; successful capture reported CSS `720x1600` at `dpr=0.5`; console warnings/errors `[]`.
  - `390x844`: Camp, Waterfall, Cave, Giant Tree, and Sky Ridge each captured once with `getAXStateAndScreenshot()`; measured CSS `780x1688`, `overflow=false`; Cave `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and Sky Ridge `단계 1/9 · skyGate`.
  - `412x915`: measured CSS `824x1830`, `overflow=false`, but the one permitted screenshot attempt timed out at `Page.captureScreenshot` after the viewport was applied. This remains unverified visual evidence, not PASS.
  - `1024x768` tablet/landscape: fresh-tab capture returned `Cannot take screenshot with 0 width`; measured `w=0,h=0`, `overflow=true`. This is an environment/tab-sizing blocker, not a product-code change.

## Limitations / verdict

390×844 visual capture previously covered all five regions, and 360×800 covered hub/Camp. The updated hub's 390px screenshot call timed out after the CSS breakpoint fix (`Page.captureScreenshot`, one attempt); DOM/computed-style evidence confirms the one-column fix. 412×915 and tablet/landscape remain blocked by the specific screenshot/zero-width errors above; no failed screenshot call was retried. The scene composition pass was verified at the available headed Chrome `1084×428` viewport, but exact 360×800, 390×844, 412×915, and tablet screenshot claims remain **NOT VERIFIED** in this pass because the supported viewport override/capture path was not available in the active browser surface.

**PARTIAL — not ready to claim full visual release acceptance.** Source/test scope is ready for review; rerun headed Chrome with a non-zero viewport and attach screenshots before merge/deploy.
