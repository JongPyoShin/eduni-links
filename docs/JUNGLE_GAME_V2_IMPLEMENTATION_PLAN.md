# Jungle Game V2 — Detailed Implementation Plan

Baseline repository: `JongPyoShin/eduni-links`  
Baseline branch: `main`  
Baseline HEAD: `e5dc002017e9a86af73e6b66339afbddadf483bc`  
Planning branch: `plan/jungle-game-v2`

## 0. Purpose

The current Jungle implementation proves that five stages, touch/keyboard input, quiz content, rewards, Three.js scenes, and browser E2E can coexist. It is no longer an empty prototype.

However, the moment-to-moment gameplay is still too close to a content POC:

```text
walk
→ reach a radius
→ press A
→ read/select in modal
→ close modal
→ walk to the next radius
```

Adding more stages, quiz questions, particles, or prettier scenery alone will not solve this. V2 must change the **play structure**, not only the presentation.

The target is a child-friendly exploration game where each stage has a distinct physical/gameplay identity, where learning content is embedded inside actions, and where the player can feel progress without reading a modal every few seconds.

---

# 1. Current-code diagnosis

## 1.1 Strengths already worth preserving

Do not throw away the working foundation.

Keep:

- deterministic keyboard / D-pad / gamepad movement;
- walkable geometry as the authoritative movement contract;
- player animation assets and foot-pivot logic;
- existing five-stage content and reward concepts;
- local-only storage for rewards and codex;
- Three.js rendering experiments and Canvas fallback where currently useful;
- explicit browser QA bridges;
- real-input E2E philosophy;
- stage-specific ambience and visual phase data;
- existing quiz bank;
- child-safe, low-pressure failure language.

These are useful building blocks.

## 1.2 Core problem: content breadth is larger than interaction depth

The repository contains many scenario steps and hundreds of quiz questions, but the gameplay verbs are still mostly:

- move;
- approach;
- interact;
- choose an answer;
- confirm.

The number of content nodes creates the appearance of a large game, but the child is repeatedly performing the same interaction.

## 1.3 Stage controllers are duplicated

Current stage code repeats the same responsibilities in files such as:

- `src/game.js`
- `src/cave_game.js`
- `src/giant_tree_game.js`
- `src/sky_ridge_game.js`

Common repeated logic includes:

- input polling;
- player movement;
- `geometry.isWalkable` checks;
- sprite-to-Three texture synchronization;
- nearest-interactable lookup;
- modal navigation;
- reward opening;
- requestAnimationFrame loops;
- state-to-visual-phase synchronization.

This makes new gameplay mechanics expensive because each mechanic tends to become another stage-specific branch rather than a reusable system.

## 1.4 Interactions are modal-first rather than world-first

Many discoveries are implemented as:

```js
panel.openPanel(...)
```

The world pauses, the player reads text, then confirms.

This is acceptable for a few explicit learning moments, but it should not be the primary action vocabulary.

Target:

- world action first;
- short in-world feedback;
- modal only for meaningful decisions, codex detail, or a structured quiz.

## 1.5 Physical challenge is minimal

Current movement largely resolves to:

```js
if (geometry.isWalkable(nx, player.y)) player.x = nx;
if (geometry.isWalkable(player.x, ny)) player.y = ny;
```

There is no reusable gameplay layer for:

- moving hazards;
- moving platforms;
- push/pull;
- carry/drop;
- timed traversal;
- simple stealth/avoidance;
- following targets;
- moving NPCs;
- dynamic obstacles;
- action cooldowns;
- checkpoints;
- failure/recovery.

V2 does not need combat or health. It does need **actions with consequences and timing**.

## 1.6 Rewards are mostly terminal badges

`stage_rewards.js` provides clear stage completion rewards, but the rewards have little gameplay effect.

A badge should remain collectible, but V2 needs meta-progression such as:

- expedition journal completion;
- stage mastery stars;
- discovered species/objects;
- optional challenge stamps;
- unlocked cosmetic trail / camp decoration;
- route completion map;
- replay goals.

Avoid power progression that makes educational difficulty unfair.

## 1.7 Stage differentiation is mostly data and presentation

`stage_manifest.js` already gives each stage different wording, palettes, fog, ambience, and scenario names. That is good.

But a child should be able to identify the stage from **how it plays**, even with all text hidden.

That is the V2 standard.

---

# 2. Reference architecture to study

## GDevelop

Reference:
- https://github.com/4ian/GDevelop
- https://github.com/4ian/GDevelop/releases

Latest reviewed release while writing this plan:
- `v5.6.283`, published 2026-09-29.

Do **not** replace EDUNI with GDevelop.

Use GDevelop only as a technical reference for:

1. runtime/editor separation;
2. reusable RuntimeObject / RuntimeBehavior concepts;
3. modular extensions;
4. PixiJS + Three.js coexistence patterns;
5. gameplay-test tooling;
6. screenshot-aware AI testing;
7. explicit GPU resource disposal;
8. per-device rendering/performance budgets.

Useful upstream areas:

```text
GDJS/Runtime/runtimescene.ts
GDJS/Runtime/runtimebehavior.ts
GDJS/Runtime/pixi-renderers/runtimescene-pixi-renderer.ts
GDJS/Runtime/pixi-renderers/runtimegame-pixi-renderer.ts
newIDE/app/src/EditorFunctions/GameplayTestTools.js
newIDE/app/src/GameplayTests/GameplayTestRunner.js
Extensions/3D/
```

GDevelop engine/editor code is MIT according to its repository README, but GDevelop branding is not part of what should be copied.

## Existing EDUNI references

Also continue using:

- BUFATECHNO for visual systems/performance discipline;
- pokemonlive for gameplay-state → presentation-event separation;
- Kenney / Quaternius / verified local assets for child-readable environment art.

---

# 3. V2 product goal

## 3.1 One-sentence target

**A five-stage exploration adventure where children move, observe, manipulate, listen, remember, and solve in the world — with quizzes supporting gameplay rather than replacing it.**

## 3.2 Target session

Recommended first target:

- one stage: 6–10 minutes;
- full expedition: 30–45 minutes across multiple sessions;
- each stage:
  - 1 onboarding interaction;
  - 3 world gameplay challenges;
  - 1 signature mini-game;
  - 1 discovery encounter;
  - 1 reward/review moment.

## 3.3 V2 core loop

```text
enter stage
→ understand landmark/goal visually
→ explore
→ perform a world action
→ receive immediate audiovisual feedback
→ discover a clue
→ use the clue in a mini-game
→ reach the stage creature/landmark
→ short knowledge check
→ reward + journal update
→ optional mastery challenge
```

The player should not need a modal after every step.

---

# 4. Runtime architecture refactor

This is the highest priority before adding large new mechanics.

## 4.1 Introduce a shared GameRuntime

Proposed files:

```text
src/runtime/game_runtime.js
src/runtime/stage_runtime.js
src/runtime/runtime_entity.js
src/runtime/behavior.js
src/runtime/presentation_bus.js
src/runtime/resource_tracker.js
src/runtime/checkpoint_store.js
```

### GameRuntime responsibilities

- own frame loop;
- own input;
- own player;
- own current stage;
- update behavior systems;
- emit presentation events;
- expose read-only QA snapshot;
- perform cleanup/disposal.

### StageRuntime responsibilities

- stage state;
- geometry/navigation;
- entities;
- objectives;
- interaction rules;
- checkpoints;
- stage completion;
- stage-specific systems.

Do not let rendering own game-state transitions.

## 4.2 RuntimeEntity

Introduce world entities with stable IDs.

Example:

```js
{
  id: "waterfall.stone.03",
  kind: "steppingStone",
  transform: { x, y, z },
  tags: ["platform", "wet"],
  behaviors: [...]
}
```

Use this for:

- clue objects;
- animals;
- platforms;
- switches;
- sound sources;
- pickups;
- landmarks;
- optional discoveries.

## 4.3 Behavior model

Use a lightweight EDUNI version of the RuntimeBehavior concept.

Initial behaviors:

```text
InteractableBehavior
ProximityBehavior
FollowPathBehavior
OscillateBehavior
CollectibleBehavior
TimedSequenceBehavior
CheckpointBehavior
AudioSourceBehavior
VisualCueBehavior
CarryableBehavior
MovingPlatformBehavior
AvoidanceBehavior
```

Do not build a general-purpose engine. Implement only behaviors required by the five stages.

## 4.4 Presentation event bus

Gameplay should emit semantic events:

```text
clue:discovered
platform:landed
sequence:success
sequence:fail
creature:revealed
checkpoint:reached
reward:earned
objective:changed
```

Presentation systems subscribe and decide:

- camera emphasis;
- particles;
- sound;
- animation;
- HUD toast;
- environmental phase changes.

This keeps gameplay deterministic even when VFX fails.

## 4.5 Shared player controller

Move common player code out of four stage loops.

Proposed:

```text
src/runtime/player_controller.js
src/runtime/player_presenter.js
```

PlayerController:
- movement intent;
- movement constraints;
- interaction;
- temporary input lock;
- context action.

PlayerPresenter:
- sprite frame;
- Three.js position;
- shadow/glow;
- facing;
- visual scale.

## 4.6 ResourceTracker

Three.js stages need explicit ownership.

Track:

- geometries;
- materials;
- textures;
- render targets;
- GLTF instances;
- event listeners;
- interval/timeout handles.

On stage exit:

```js
resourceTracker.disposeAll();
```

Acceptance:
- repeated stage enter/exit does not grow retained Three.js resources indefinitely.

---

# 5. Replace “A + modal” with gameplay verbs

Every stage must have at least three distinct active verbs.

Allowed child-friendly verbs:

- follow;
- dodge;
- balance;
- step;
- listen;
- match;
- trace;
- rotate;
- carry;
- place;
- collect;
- sequence;
- wait;
- observe;
- aim;
- choose;
- remember.

Avoid:
- combat;
- health depletion;
- punishment loops;
- fast twitch requirements;
- irreversible failure.

Failure should reset a small challenge quickly.

---

# 6. Stage-by-stage implementation

## 6.1 Camp — exploration + tracking tutorial

Identity:
**learn how to explore, inspect, and follow environmental evidence.**

### Challenge A — footprint tracking

Current:
- reach footprints;
- press A;
- modal.

V2:
- footprints form a branching trail;
- correct tracks brighten when approached;
- player chooses which branch to follow physically;
- wrong branch loops back with a gentle environmental clue;
- no modal until the end.

System needs:
- trail node entities;
- branch resolution;
- progress feedback;
- camera hint only after inactivity.

### Challenge B — bird-call direction finding

- directional stereo/pan cue;
- three possible listening spots;
- sound becomes clearer near the correct direction;
- player walks toward the sound;
- visual ripple is accessibility fallback.

No microphone required.

### Challenge C — campfire memory

Replace a simple panel quiz with:
- 3–5 world icons/objects briefly light around the campfire;
- lights turn off;
- child walks/taps them in remembered order.

Difficulty:
- starts at 3;
- no hard fail;
- replay sequence after mistake.

### Stage encounter

Bluebird reveal should happen in the world:
- rustle;
- camera anticipation;
- branch motion;
- short fly-in;
- then optional knowledge question.

The encounter should not appear first as a text panel.

---

## 6.2 Waterfall — traversal + timing

Identity:
**move through a dynamic environment.**

### Challenge A — stepping stones

Current stepping stones are effectively a destination/confirmation.

V2:
- 5–7 stones;
- some stones bob slowly;
- safe timing window is generous;
- falling does not kill the player;
- player returns to previous checkpoint with splash feedback.

System:
- MovingPlatformBehavior;
- platform occupancy;
- checkpoint;
- water reset trigger.

### Challenge B — sound triangulation

- waterfall roar masks smaller stream sounds;
- player rotates/moves between three listening points;
- each point gives relative direction/intensity;
- choose/follow the strongest path.

Accessibility:
- visible concentric wave hints can be enabled.

### Challenge C — mist visibility

- mist periodically lowers visibility;
- player follows reflective markers visible at close range;
- not a maze; route remains readable.

### Kingfisher encounter

- kingfisher moves between two perches;
- player must remain within observation zone briefly;
- simple visual task: identify motion/color behavior;
- quiz comes after observation.

---

## 6.3 Cave — light + pattern

Identity:
**use light and memory in a low-visibility space.**

### Challenge A — firefly guide

- moving firefly group follows a spline;
- player follows without touching a button;
- stopping too long causes the group to wait;
- losing it triggers a gentle return glow.

### Challenge B — echo crystals

- several crystals emit distinct tones;
- target tone is demonstrated;
- child walks to and activates the matching crystal.

This turns an audio question into spatial play.

### Challenge C — firefly sequence

Current sequence exists as choices in a panel.

V2:
- firefly groups blink in the actual scene;
- player activates matching glowing stones in order;
- scene gives immediate feedback.

### Bat encounter

- bat is animated in the environment;
- observation zone;
- no sudden jumpscare;
- silhouette/wing movement is the learning focus.

---

## 6.4 Giant Tree — vertical route + manipulation

Identity:
**climb and manipulate natural mechanisms.**

### Challenge A — bark-symbol matching

- symbols appear on bark patches;
- player finds two matching patterns in different areas;
- interaction highlights a matched pair.

### Challenge B — acorn carry/place

Introduce first carry mechanic:
- pick up one acorn;
- carry to a squirrel cache;
- movement remains normal;
- one-button drop/place.

This gives the game a physical object mechanic.

### Challenge C — ring counting

Current tree-ring questions are panel-only.

V2:
- rotate/zoom a stump inspection view;
- count highlighted groups;
- select directly on the object or with large in-world markers.

### Canopy traversal

- spiral route;
- moving leaf platforms or branch gates;
- forgiving checkpoints.

---

## 6.5 Sky Ridge — wind + route planning

Identity:
**read environmental motion and plan movement.**

### Challenge A — wind ribbons

- ribbon direction changes by zone;
- player observes the wind before crossing;
- strong gust moves lightweight environmental particles, not the child violently.

### Challenge B — cloud-shadow safe zones

- slow cloud shadows move over the path;
- target is to move between illuminated/safe observation circles;
- not a punishment mechanic;
- touching shadow simply pauses progress or resets the local sequence.

### Challenge C — wind chime melody

- three chimes placed spatially;
- target melody plays;
- player visits/activates chimes in order.

### Hawk encounter

- distant silhouette;
- approach route;
- perch reveal;
- observation timer;
- final question based on what the player just saw.

---

# 7. Progression and replay

## 7.1 ExpeditionProfile

Replace isolated reward/codex storage with one versioned profile.

Proposed:

```js
{
  version: 2,
  stages: {
    camp: {
      completed: true,
      mastery: 2,
      discoveries: [...],
      optionalChallenges: [...]
    }
  },
  codex: {...},
  cosmetics: {...}
}
```

Keep migration from current:
- `eduni.jungle.stageRewards.v1`;
- existing bird codex storage.

## 7.2 Checkpoints

Checkpoint scope:
- local challenge only;
- not every coordinate.

Example:
- before stepping-stone sequence;
- before canopy crossing;
- before crystal chamber.

Persist stage completion, not exact player position between sessions in Phase 1.

## 7.3 Mastery

Per stage:

- 1 star: completed;
- 2 stars: completed with optional clue;
- 3 stars: optional mastery objective.

No speed-based star requirement for young children.

---

# 8. UI/HUD redesign

Current objective HUD can remain, but reduce text dependence.

Add:

## Compass / objective indicator

- subtle edge arrow for major landmark only;
- disappears when target is on screen;
- no permanent minimap in first implementation.

## Interaction cue

Use context icon + verb:

```text
👂 듣기
🔎 살펴보기
🖐 집기
✨ 사용하기
```

Not just `A`.

## Expedition strip

Small progress strip:
- 3–5 stage milestones;
- icons rather than sentences.

## Modal policy

Use modal only for:
- multi-choice quiz;
- codex detail;
- reward summary;
- accessibility/help.

Do not use it for ordinary environment acknowledgements.

---

# 9. Camera and presentation

## 9.1 CameraDirector

Proposed:
`src/presentation/camera_director.js`

Modes:
- follow;
- landmark reveal;
- interaction focus;
- encounter;
- reward.

Rules:
- max short emphasis;
- never remove control for long periods;
- no continuous shake;
- child/player remains readable.

## 9.2 Stage-specific signatures

Camp:
- leaf motes;
- warm sun shafts;
- campfire glow.

Waterfall:
- spray;
- rainbow mist;
- splash rings;
- wet specular cue.

Cave:
- fireflies;
- crystal pulse;
- localized darkness.

Giant Tree:
- drifting leaves;
- bark dust;
- canopy shafts.

Sky Ridge:
- cloud movement;
- wind streaks;
- feather particles.

## 9.3 3D budget

Initial tablet target:

- cap dynamic particle counts;
- reuse materials;
- reuse textures from GLTF when possible;
- avoid per-frame material creation;
- budget lights;
- no mandatory post-processing;
- explicit disposal on stage exit.

Use GDevelop recent work on texture sharing/disposal and light budgeting as a reference pattern.

---

# 10. Audio plan

Current synthetic cues are useful for prototyping but insufficient for a finished exploration game.

Create layers:

```text
ambient bed
local environmental emitters
interaction cues
success/failure cue
creature signature
reward sting
```

Requirements:
- no loud surprise;
- local emitter volume depends on player distance;
- audio clue always has visual accessibility fallback;
- simultaneous voices capped;
- pause/mute supported.

---

# 11. Content integration

The 265+ question bank should not dominate gameplay.

Use questions for:

- final check after observation;
- clue confirmation;
- optional mastery;
- replay variety.

Do not attach a quiz to every collectible.

New ratio target per stage:

```text
~70% movement / environment / manipulation
~20% observation / memory
~10% explicit quiz UI
```

This is a design target, not an analytics requirement.

---

# 12. Implementation phases

## Phase 0 — baseline + measurements

No gameplay redesign yet.

Tasks:
- record current main HEAD;
- capture 5 stage start/mid/end screenshots;
- measure first meaningful interaction time;
- measure stage completion click/interact count;
- record modal-open count;
- capture current runtime resource counts where practical.

Deliverable:
`docs/JUNGLE_V2_BASELINE.md`

Acceptance:
- reproducible baseline;
- no production behavior change.

## Phase 1 — shared runtime foundation

Files to add:

```text
src/runtime/game_runtime.js
src/runtime/stage_runtime.js
src/runtime/runtime_entity.js
src/runtime/behavior.js
src/runtime/presentation_bus.js
src/runtime/player_controller.js
src/runtime/resource_tracker.js
```

Migrate one stage first: **Cave**.

Why Cave:
- currently isolated stage file;
- clear sequence mechanics;
- good candidate for world-based pattern game.

Acceptance:
- Cave behavior unchanged before new mechanics;
- existing tests pass;
- one common loop owns input/player update;
- stage-specific state still deterministic.

## Phase 2 — Cave vertical slice

Implement:
- firefly follow;
- echo crystal matching;
- in-world blink sequence;
- bat reveal;
- checkpoint/recovery;
- presentation events.

This phase is the architectural proof.

Acceptance:
- Cave can complete without ordinary discovery text modals;
- at least 3 distinct gameplay verbs;
- real-input E2E completes;
- screenshot set demonstrates state changes;
- reload preserves completion reward.

## Phase 3 — Waterfall traversal

Implement:
- moving stepping stones;
- water reset/checkpoint;
- sound triangulation;
- mist route;
- kingfisher moving perch.

Acceptance:
- traversal has a recoverable fail state;
- no teleport in E2E;
- stable tablet frame time;
- repeated reset works.

## Phase 4 — Camp onboarding redesign

Implement:
- branching footprint trail;
- positional bird-call search;
- in-world campfire memory;
- Bluebird reveal.

Camp becomes the tutorial for reusable mechanics.

## Phase 5 — Giant Tree

Implement:
- matching;
- carry/drop;
- vertical checkpoints;
- object inspection.

## Phase 6 — Sky Ridge

Implement:
- wind ribbons;
- cloud-shadow movement challenge;
- chime sequence;
- hawk observation.

## Phase 7 — progression/meta

Implement:
- versioned ExpeditionProfile;
- migration;
- stage mastery;
- journal UI;
- optional challenge stamps.

## Phase 8 — presentation polish

- asset replacement;
- animation pass;
- camera pass;
- stage signatures;
- audio pass;
- memory/disposal audit;
- tablet performance tuning.

---

# 13. Testing architecture

## 13.1 Unit tests

Test:
- behavior state transitions;
- checkpoints;
- challenge success/failure;
- persistence migration;
- deterministic sequence generation;
- presentation events emitted, not visual pixels.

## 13.2 Gameplay simulation tests

Create a headless-ish deterministic runner for runtime state where possible.

Input script:

```text
hold right 800ms
hold up 300ms
interact
...
```

Assert:
- stage phase;
- player bounds;
- challenge state;
- reward;
- no impossible progression.

## 13.3 Real browser E2E

Required for each migrated stage:

- real browser;
- real key/pointer input;
- no direct player coordinate mutation;
- no forced state mutation;
- screenshots at key moments;
- console errors collected;
- final saved profile checked.

## 13.4 Screenshot-aware QA

Adopt the useful GDevelop AI-test idea:

Each E2E run should capture named screenshots:

```text
01-stage-entry.png
02-first-challenge.png
03-signature-gameplay.png
04-creature-reveal.png
05-reward.png
```

Generate a small machine-readable report containing:
- screenshot path;
- stage state;
- player position;
- active objective;
- active challenge;
- frame/performance summary if available.

This enables an AI reviewer or human reviewer to compare the actual game, not only test booleans.

---

# 14. Performance gates

Target devices:
- desktop Chrome;
- Android tablet/WebView class device;
- touch portrait/landscape.

Minimum acceptance rules:

- no unbounded particle allocation;
- no repeated texture creation every frame;
- no GLTF re-download on every state transition;
- no event-listener leaks after stage disposal;
- repeated stage enter/exit remains stable;
- input remains responsive during presentation effects;
- gameplay stays usable when optional art fails.

Do not set an arbitrary fixed FPS number as the only quality gate. Record frame-time distribution on representative hardware.

---

# 15. File migration strategy

Do not perform a giant rewrite.

## First extraction targets

From `game.js`, `cave_game.js`, `giant_tree_game.js`, `sky_ridge_game.js`:

Extract common:
- frame loop;
- input polling;
- player movement;
- player texture sync;
- context interaction;
- panel navigation;
- resource cleanup;
- QA snapshot.

Leave stage-specific:
- challenge rules;
- stage state;
- stage entities;
- stage completion.

## Compatibility adapters

During migration, allow old stage state functions to be called from the new StageRuntime.

Do not rewrite all chapter content files at once.

---

# 16. Commit plan

Keep commits reviewable.

Suggested sequence:

```text
1. docs: capture Jungle V2 baseline
2. refactor: add shared Jungle runtime shell
3. refactor: migrate Cave to shared runtime without gameplay change
4. feat: add Cave firefly follow challenge
5. feat: add Cave echo crystal challenge
6. feat: move Cave pattern challenge into world
7. test: add Cave real-input V2 acceptance
8. feat: add Waterfall checkpoint and stepping-stone gameplay
...
```

Do not mix large asset imports with gameplay refactors.

---

# 17. Acceptance definition for “game-like enough”

V2 is not complete merely because all five stages load.

For each stage:

1. it has at least 3 active gameplay verbs;
2. at least 2 challenges happen directly in the world;
3. stage identity is obvious without reading text;
4. ordinary progression does not require a modal at every waypoint;
5. at least one challenge can fail gently and recover;
6. completion is persisted;
7. stage can be replayed;
8. real-input E2E proves completion;
9. screenshots show meaningful visual state changes;
10. mobile/touch interaction is verified.

For the whole game:

- one shared runtime drives migrated stages;
- duplicated frame-loop code is substantially reduced;
- presentation is event-driven rather than mixed into game rules;
- resource cleanup is explicit;
- rewards feed a visible expedition/journal progression;
- all five stages feel mechanically different.

---

# 18. Non-goals

Do not add in V2 core:

- combat;
- HP/damage;
- online multiplayer;
- chat;
- public profiles;
- child analytics;
- camera/microphone permission;
- procedural AI-generated questions at runtime;
- required cloud LLM dependency;
- full custom game editor;
- a GDevelop dependency;
- a general-purpose ECS engine.

Keep the product focused.

---

# 19. Immediate next implementation task

The first code implementation after this plan should be:

**Shared Runtime Foundation + Cave V2 Vertical Slice**

Do not start by polishing all five scenes.

Order:

```text
shared runtime shell
→ migrate Cave unchanged
→ add world firefly-follow
→ add echo-crystal match
→ move blink sequence into scene
→ browser E2E + screenshots
→ evaluate
→ then repeat patterns in other stages
```

This gives a fast answer to the most important question:

> Does the new architecture actually make EDUNI Jungle feel like a game instead of a chain of interactive learning panels?

If the Cave vertical slice does not materially improve play feel, stop and revise before migrating the other four stages.
