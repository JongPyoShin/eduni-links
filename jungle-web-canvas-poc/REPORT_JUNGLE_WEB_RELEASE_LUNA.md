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

The earlier portrait-camera investigation (before the viewport provenance correction) identified the old follow clamp around `x=-3.1..3.1`, `z=-3..3`, while the authored spawn `(200,1040)` projects near `(-6,4.4)`. The new `framedTargetX/Z` bounds (`-5.5..5.5`, `-4.6..4.6`) preserve the old contract variables for regression tests but drive the actual camera follow; this remains a source-level framing rationale, not a 390×844 screenshot claim.

The old clamp variables were then removed entirely; the updated camera contract test now asserts only the safe framing bounds. At portrait aspect 390/844, the 10.8 world-unit vertical span gives roughly 5.0 horizontal units, so the `(-6,4.4)` spawn plus the 1.35-unit-wide billboard remains inside the horizontal frustum when the camera centers at `x=-5.5`.

The follow-up blank-screen trace found OrbitControls was still overwriting the gameplay camera after the target/position assignment. Waterfall now reapplies its cardinal camera after `originalUpdate()`, and Cave/Giant Tree/Sky Ridge skip OrbitControls updates when `debugControls:false` and explicitly `lookAt()` the gameplay target. This preserves the mobile camera orientation instead of only moving the camera position.

The latest camera-order fix also calls `camera.updateMatrixWorld(true)` after the explicit portrait `lookAt()` in all four affected gameplay paths. This makes the projection state deterministic for the same animation frame after OrbitControls has been bypassed or reapplied; the camera contract test now guards both the orientation and matrix update.

The follow-up frame inspection found a second Waterfall-specific ownership bug: the preview RAF was still applying its legacy clamped target and offset camera on every production frame while the runtime bridge applied the cardinal camera afterward. Production preview frames now update the player sprite only; the runtime bridge is the sole gameplay camera owner. This removes the competing target filters that left the portrait route and player poorly framed.

The stage-specific visibility pass then separated player and current-target framing for Cave, Giant Tree, and Sky Ridge by centering the gameplay camera between the player and the active beacon, while Camp now frames between the player and its active interaction target. Cave/Giant Tree/Sky Ridge route strips use fog-independent bright materials, and their initial fog densities were reduced so the first route, player, and beacon remain legible in portrait mode.

The portrait follow-up widens the orthographic view to 14 world units below the `0.8` aspect threshold, based on the projected 390×844 bounds: Waterfall's start player and first gate otherwise consume nearly the full 4.99-unit horizontal span. All four Three stage previews now also create a bright fallback player sprite and halo when the player texture load fails, instead of silently returning no player; Camp uses the same portrait view-height rule.

The production boot trace on a fresh top-level Waterfall page reaches `startup.phase=ready` with `presentationError=null`; the Three runtime reports `rendererCalls=198`, `renderFrame>500`, `sceneChildren=113`, a nonzero drawing buffer, and `playerVisible=true`. This proves the production import/attach/RAF path is executing. It does not override the separate 390×844 rendered-frame FAIL: the active headed capture still showed a uniform dark-green scene, so visual acceptance remains open.

The follow-up canvas-clear trace adds an explicit WebGL clear signal: the fresh top-level page reports `renderedFrame=110`, `rendererCalls=198`, `drawingBuffer=1280×720` in the available automation surface, and the visible Three canvas CSS background is the misty-cyan `rgb(135,185,180)` rather than the body `rgb(26,42,31)`. This proves the fallback clear/draw path is active in that fresh page; it is not a 390×844 visual PASS because that surface still has a zero viewport.

After vendor GLB readiness, the loaded 390×844 Waterfall frame showed the route and player, but the first wooden gate was clipped at the edge and entrance foliage crowded the avatar. The visual gate now sits at `(620,940)`, 89 logical units from the actual `(700,900)` `streamGate` anchor and therefore inside its 110px interaction radius; the logical interaction anchor remains unchanged, its lantern cue follows the visual gate, and nearby vendor props are shifted away from the start lane. This is a composition-only adjustment and must be re-captured after GLB readiness.

The latest Waterfall failure showed that a fixed `player + 1.5` camera offset was still not evidence-based: the player was outside while the gate clipped left. The production bridge now receives `getTarget()` from the actual waterfall interactable state and frames the midpoint of the live player and live active target; the fallback offset is used only when no target exists. The focused contract test guards this bridge wiring.

Runtime diagnostics from a fresh stable top-level boot show the live values explicitly: logical player `{x:200,y:1040}`, active target `{id:"streamGate",x:700,y:900,radius:110}`, camera target `[-3.5,.3,3.7]`, camera position `[-3.5,11.5,11.9]`, and player NDC `[-0.26,-0.03]` in the available desktop surface. Waterfall now also renders a low-opacity, depth-independent avatar marker strictly as a diagnostic fallback; the actual sprite and all other stage avatars retain normal depth testing. A fresh 390×844 recapture is still required to verify the mobile result.

The valid 390×844 audit then captured an intermediate settled frame with camera target `[-3.029,.3,3.240]` and player NDC `[-.918,-.073]`, proving the smoothing filter—not the authored coordinates—was clipping the avatar. Waterfall now applies the live player/target midpoint immediately each frame and publishes both player and target NDC to the hidden runtime status dataset. The direct-frame contract is source/test verified; a new post-load 390×844 screenshot remains required.

The next audit showed the logical-anchor midpoint still placed player and visual gate near opposite NDC margins (`player≈-.773`, logical target≈+.773`). Waterfall now supplies a separate visual target `(620,940)` to the camera bridge, frames that actual rendered gate rather than the logical interaction anchor `(700,900)`, and publishes `markerWorld`/`markerNdc` alongside `playerNdc`/`targetNdc`. The spawn-adjacent cypress prop was also moved away from the player footprint. Interaction geometry and radius remain unchanged.

The latest stable 390×844 Waterfall capture after `GLB 14/14` reports player NDC≈`-.649` and visual-target NDC≈`+.649`; the avatar on the start island and wooden gate are both fully visible. Waterfall therefore meets the current co-visibility target, with only residual center foliage crowding left for later polish. The runtime diagnostic dataset is now confined to `qa=1`; normal production pages retain camera behavior without emitting debug JSON.

Stable post-load Cave evidence now distinguishes preload blank captures from the actual scene: after the vendor models and an additional settle wait, the player/start island and cave geometry are visible, but the route and first cave gate still need stronger hierarchy. Cave now brightens the fog-independent route, lowers the foreground rock opacity, and enlarges/brightens the objective beacon.

The latest stable Cave capture still failed the avatar/target criterion: cream route and chamber rocks were visible, but the player was occluded and the entrance goal remained unclear. Cave player sprites retain normal depth testing, while foreground rock opacity is reduced further so the avatar silhouette and first beacon can remain legible without painting through scene props.

Cave-only follow-up keeps the Waterfall framing untouched: the two spawn-adjacent vendor rocks are moved off the start lane, foreground frame opacity is reduced to `.16`, and Cave's player/beacon midpoint is applied immediately rather than eased. This is awaiting one fresh 390×844 capture after `GLB 4/4` and settled frames; no other stage layout is changed in this iteration.

The next stable Cave capture removed the square marker and clearly showed the avatar, but the pale gate shelf remained clipped right and the dark chamber dominated the connecting route. Cave now uses a ground halo, a wider portrait view (`16` world units), a caveGate-specific visual beacon offset closer to the spawn, brighter/wider route strips, and lighter foreground framing. A new GLB-ready 390×844 capture is still required for acceptance.

The latest Cave composition pass tightens the portrait span to `14.5` world units, lightens the ground/chamber palette, and adds five small fog-independent guide pads along the start-to-gate route. The player remains on the start island and the active beacon remains framed by the direct midpoint camera; a fresh stable capture is still required to verify the beacon NDC and final legibility.

The next Cave route pass raises the continuous edge/strip/pad geometry above the floor (`y≈.14/.20/.205`) and the guide pads to `.22`, keeping the same gameplay path while preventing rocks and floor depth from fragmenting the visible route at phone size. Stable capture is still required before declaring Cave PASS.

The latest stable 390×844 Cave capture now shows the unobscured avatar, continuous high-contrast route, and active beam together. The beam is the `caveGate` visual objective: authored interaction anchor `(420,930)` with radius `110`, visual point `(405,945)`, distance `≈21.2`; gameplay interaction coordinates remain unchanged. Cave meets the current avatar/route/active-target co-visibility target.

Stable clean Camp 390×844 evidence now shows the avatar unobscured beside the entrance posts, with the hut and connected route in frame. Camp's remaining composition ceiling is the large L-shaped corridor; it remains legible/playable and is intentionally left stable while Giant Tree and Sky Ridge are reworked.

The current Giant Tree/Sky Ridge source pass is scoped to their fresh stable failures: Giant Tree opens the rootGate spawn lane by hiding the central tree until its reveal phase and moving nearby forest props; Sky Ridge reduces disconnected terrace pads and moves palm/fern silhouettes off the left approach while preserving a continuous bright route and foreground avatar.

The latest Giant Tree capture still failed avatar recognition, so the Giant-only follow-up scales the shared center island to `.52`, keeps the rootGate tree hidden during the start phase, renders the actual avatar sprite in front for this stage, and publishes `playerNdc`/`beaconNdc` to the stage status dataset. A fresh GLB-ready 390×844 capture is required to verify the open lane and rootGate co-frame.

Giant Tree now publishes a QA-gated `playerRenderDiagnostics` record after each player sync (`qa=1` only): logical/world player, marker world position, camera target/position, sprite NDC, texture dimensions, visibility, scale, and marker presence. The stage remains FAIL until a fresh 390×844 capture proves the avatar is visibly in-frame.

For the next headed audit, Giant Tree also exposes individual QA-gated status fields: `playerNdc`, `playerVisible`, `playerTextureReady`, `playerTextureDimensions`, and `cameraTarget`, alongside the existing JSON diagnostic. No broad test run was performed for this instrumentation-only step.

The latest Giant Tree diagnostic capture passes basic co-visibility (`playerNdc≈[-.424,-.082]`, `beaconNdc≈[+.424,+.003]`, avatar visible), but a diagonal foreground branch still crossed the silhouette and the central platform was oversized. Giant Tree now moves/scales those two foreground elements farther from the spawn lane while preserving the measured NDC framing.

The Giant Tree identity is now preserved in the composition: the trunk/canopy remains visible as a reduced far-side landmark at a new visual position, rather than being hidden during rootGate. Sky Ridge waypoint islands are reduced to small pennant accents so the authored route strip reads as one connected winding ridge trail; interaction/objective anchors remain unchanged. Fresh stable 390×844 recapture is still required for both stages.

The subsequent Giant Tree pass keeps the signature landmark visible at a recognizable side/back position and changes the rootGate reveal label from `trunk-hidden` to `trunk-side-visible`; the diagonal branch is moved farther from the avatar silhouette. This preserves map identity while keeping the measured player/beacon framing.

The latest capture still showed a left root crossing the avatar and no readable tree silhouette. The current Giant-only geometry pass moves that root to `x=-8.5,z=4.0` and places the actual trunk/canopy visual group at `logical≈(620,700)` with a `.72` scale, targeting the right/background portion of the portrait frame without changing the authored rootGate anchor.

The newest stable 390×844 Giant Tree capture passes the key visual requirement: avatar/beacon NDC≈`-.42/+ .42`, unobstructed avatar, and a recognizable large tree at the right/background. The camera/landmark layout is now frozen; the existing bright route remains the connecting path, with no further Giant Tree geometry changes in this iteration.

Sky Ridge remains FAIL after the prior depth-order pass. Its next iteration now raises the continuous route strip/pads above the floor and gates a stage-specific player diagnostic behind `qa=1`, recording logical/world player coordinates, camera target/position, sprite NDC, texture dimensions, visibility, and scale. Sky camera smoothing is also removed so the active player/beacon frame is immediate; a fresh 390×844 diagnostic capture must identify whether the remaining absence is offscreen, texture-empty, scale, or sync failure before further composition changes.

The latest Sky Ridge stable capture confirms the avatar is now visible, but a near-spawn foreground cliff still blocks the left route and circular pads dominate. Sky now moves/scales that cliff farther out and scales down the shared composition islands; the continuous raised route remains the primary path. A fresh stable 390×844 capture is required before calling Sky clean.

The follow-up Sky composition pass shrinks and offsets the central terrace and reduces the corresponding shared center island, keeping the avatar/goal NDC framing unchanged while opening a visible route corridor between them. Stable recapture is still required before Sky acceptance.

The latest Sky redesign replaces the circular terrace chain with four connected box-spine ridge segments from the start lane toward the summit, while reducing pennant islands to side accents and moving the first flag off the walking lane. This is the requested map-composition change rather than another camera-only patch; stable 390×844 recapture remains pending.

The latest Sky pass additionally shrinks the route shelves and reveals only the current/next pennant nodes per phase, preventing a far-right flag or central terrace from occupying the active walking lane. Avatar framing remains unchanged; stable 390×844 recapture is required to confirm the active pennant is fully inside the safe frame.

The close-to-pass Sky capture now receives a small visual-only ridge bend/altitude step across the four spine segments (`y≈.06→.20`); walkability and authored route coordinates are unchanged. This preserves the proven co-visibility while avoiding a flat horizontal runway.

Final audit reconciliation: Waterfall, Cave, Camp, and Giant Tree have stable 390×844 evidence meeting their current avatar/route/target criteria; Sky Ridge had avatar/trail co-visibility before this latest bend/side-target pass but requires a new post-change capture. The current focused suite is **70 passed, 0 failed**. No claim of full five-stage completion is made until all five are recaptured after their latest source state.

The post-acceptance art pass adds stage-specific continuous terrain spines without changing logical geometry: Camp uses an olive forest trail tube, Waterfall a cyan stream spine, Cave a luminous organic corridor, Giant Tree a warm root spine, and Sky Ridge a pale stepped ridge spine. These replace the repeated flat-pad-only read with distinct route silhouettes while retaining all authored anchors and interaction logic. Fresh headed 390×844 captures are required before this pass is committed or pushed.

Stable Giant Tree and Sky Ridge captures likewise remain FAIL: GLB-ready Giant Tree still let rounded tree/canopy masses dominate the spawn corridor, and GLB-ready Sky Ridge still showed disconnected circular pads/pennants with no avatar. Both previews now add a bright avatar marker using normal depth testing, reduce/reposition foreground set pieces, and preserve a high-contrast route/first-goal corridor. Avatar materials no longer globally disable depth testing; occlusion is addressed by moving/scaling the surrounding props instead. These are source fixes awaiting fresh post-load 390×844 recapture.

Stable Giant Tree and Sky Ridge evidence drives separate composition fixes. Giant Tree now keeps the player sprite depth-test-independent, suppresses the oversized tree landmark until the route reaches its reveal phase, and lifts/reduces the foreground canopy. Sky Ridge similarly depth-tests the avatar in front, reduces/repositions the left Pirate Nation foliage, shrinks waypoint islands/rims, and reduces foreground cliff/cloud scale. Camp moves and scales the entrance arch beside the unchanged spawn and keeps the avatar depth-test-independent, so the arch no longer covers the portrait silhouette. These changes target the shared portrait guide: avatar lower-middle, active goal upper-middle, and a continuous high-contrast path between them.

The final source trace also confirms the portrait start platform and first route segment are now inside the safe composition (`start=(-5.8,4.35)` in Three space), with brighter Waterfall/Cave/Giant Tree route materials and explicit camera-orientation contract coverage. These are source-level fixes only until a non-zero headed Chrome capture is available.

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
- Camera correction focused suite: **54 passed, 0 failed** (`camera`, `geometry`, `renderer` patterns), including the updated safe-framing contract.
- Camera-order focused suite after the blank-screen fix: **64 passed, 0 failed** (`camera`, `geometry`, `renderer`, `preview` patterns).
- Latest matrix-order focused suite: **64 passed, 0 failed** (`camera`, `geometry`, `renderer`, `preview` patterns), including explicit `updateMatrixWorld(true)` coverage.
- Stage-visibility focused suite: **65 passed, 0 failed** (`camera`, `geometry`, `renderer`, `preview` patterns), including the production camera-ownership contract.
- Latest stage-composition focused suite: **69 passed, 0 failed** (`camera`, `geometry`, `renderer`, `preview`, `vendor` patterns).
- Active-target camera focused suite: **70 passed, 0 failed** (`camera`, `geometry`, `renderer`, `preview`, `vendor` patterns).
- QA-gated diagnostics focused suite: **70 passed, 0 failed**; production camera behavior remains covered while debug dataset publication requires `qa=1`.
- Historical Waterfall pre-clear capture: a valid headed Chrome mobile-start capture at `390×844` showed a uniform dark-green frame before the later clear/draw and visual-target fixes. This is retained as pre-fix evidence only.
- Earlier wide headed captures at `1084×605`/`1084×428` remain desktop smoke only and are not used as mobile acceptance evidence. Later stable 390×844 captures supersede the early Cave/Giant Tree/Sky Ridge/Camp failure observations.
- The 390×844 Waterfall capture also confirms that the prior matrix-only change was insufficient. The current source removes the competing Waterfall preview camera owner and adds production render diagnostics, but a clean mobile visual PASS remains unproven.
- 360×800 and 412×915 remain **NOT VERIFIED** until separately captured.
- Final CC0 foliage after capture at CSS `1084×428`: `pirateFoliage` reported Palm and Birds of Paradise entries loaded successfully; HUD/D-pad remained outside the canvas and `overflow=false`.
- Headed Chrome extension QA opened and exercised real keyboard input on all five entry points at `?qa=1`: Camp, Waterfall, Cave, Giant Tree, Sky Ridge. Each page loaded its expected title/HUD and input controls; Cave reported `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and no console warning/error entries were captured.
- Hub DOM showed the codex link `(0/3)`, all five stage cards, and the expected locked progression text.
- Follow-up hub QA showed the new route heading, all five numbered card states, and progress meter. At the emulated phone viewport, computed grid columns changed to a single `684px` column with `overflow=false`.
- Follow-up browser DOM QA at emulated `390x844` (`CSS 780x1688`, `dpr=0.5`) confirmed the Waterfall stage chip, Cave `지도` link, and `overflow=false` on both pages.
- Explicit viewport QA used Browser Control/CUA's viewport capability on an isolated local tab. The emulated device scale was `dpr=0.5`, so CSS sizes were doubled while the requested physical sizes were applied.
  - `360x800`: hub and Camp screenshots rendered; successful capture reported CSS `720x1600` at `dpr=0.5`; console warnings/errors `[]`.
  - The prior `390x844` entry was a device-scale/emulated DOM run (`CSS 780x1688`, `dpr=0.5`), not proof of a physical 390×844 screenshot. It is retained as DOM/status evidence only, not visual acceptance.
  - `412x915`: measured CSS `824x1830`, `overflow=false`, but the one permitted screenshot attempt timed out at `Page.captureScreenshot` after the viewport was applied. This remains unverified visual evidence, not PASS.
  - `1024x768` tablet/landscape: fresh-tab capture returned `Cannot take screenshot with 0 width`; measured `w=0,h=0`, `overflow=true`. This is an environment/tab-sizing blocker, not a product-code change.

## Limitations / verdict

Final stable 390×844 review records Waterfall, Cave, Camp, Giant Tree, and Sky Ridge as co-visibility PASS for avatar/path/active-target composition. The remaining Camp L-corridor and Sky/Giant polish notes are documented as composition ceilings, not acceptance blockers. 360×800 and 412×915 remain unverified.

**READY FOR REVIEW — no merge/deploy performed.** All five stages have stable 390×844 evidence for avatar/path/active-target co-visibility; remaining risks are documented composition polish and unverified alternate viewports.

## Authoritative post-art-pass acceptance (2026-09-30)

The preceding historical notes retain earlier pre-fix failures for traceability. They are superseded for the current source state by this headed Chrome review, performed after the stage-specific `TubeGeometry` route-spine pass.

- Browser viewport override: `390×844`; each stage was reloaded and allowed to settle after its local GLB readiness signal.
- Waterfall: `GLB 14/14`, avatar, cyan stream spine, and wooden gate are co-visible.
- Cave: `GLB 4/4`, avatar, continuous luminous corridor, and cave entrance/active beam framing are co-visible.
- Camp: avatar, olive trail spine, hut entrance, and connected L-corridor are co-visible; the L bend remains a documented composition ceiling.
- Giant Tree: `GLB 6/6`, avatar, warm root spine, beacon marker, and recognizable right-side tree landmark are co-visible.
- Sky Ridge: avatar, pale stepped ridge spine, central objective terrace, and summit/pennant route are co-visible.

All five canvases reported `390×844`; no stage showed a blank canvas, missing player, or detached route in this pass. The route spines are visual-only and do not change authored anchors, interaction radii, progression, or camera contracts. Focused validation remains **70 passed, 0 failed**; `node --check` and `git diff --check` pass. Temporary QA diagnostics remain gated behind `qa=1`.

**READY FOR REVIEW — committed and pushed; no merge/deploy performed.** Alternate `360×800` and `412×915` visual acceptance remains unverified.
