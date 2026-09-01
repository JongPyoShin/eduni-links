# Jungle Stage Scenario Roadmap v1

Status: planning only  
Baseline: Web RC `2e10f2d201be9e2cfc9701c57004bf15ffcb88c9`  
Purpose: define the next content direction without changing the verified 5-stage gameplay contract.

---

## 1. Product direction

Jungle should grow from a one-pass stage adventure into a **small exploration + collection game**.

The reference feeling is the fun of roaming a map, finding a creature, following clues, and filling a collection book. We should not copy another franchise's battle/capture rules. Jungle's own identity is:

**탐색 → 흔적 발견 → 관찰 미션 → 생물 만남 → 도감 등록 → 배지/스티커 → 다음 지역 해금**

The existing 5-stage RC remains the foundation. Future work adds a persistent **탐험 생물 도감** and more stages on top of the current input, route, reward, and WebGL architecture.

### Core principles

1. No time pressure in the default mode.
2. One obvious current objective at a time.
3. D-pad/analog movement + A contextual interaction + B back remains the primary control model.
4. Creature encounters are observation/learning moments, not combat.
5. Failure does not remove rewards or lives; retry gives a clue.
6. Every stage should add at least one memorable codex entry.
7. Rare creatures use stronger sound/light/silhouette cues, not random frustration.
8. Existing logical 2D route/collision remains authoritative even when terrain presentation gains height.

---

# 2. Long-term game loop

## 2.1 World flow

```text
Jungle Hub / World Map
        ↓
Choose unlocked area
        ↓
Enter stage
        ↓
Follow 2~4 environmental clues
        ↓
Short in-world learning mini-game
        ↓
Main creature encounter
        ↓
Register creature in Codex
        ↓
Receive stage badge / sticker
        ↓
Optional replay for hidden entry / rare observation
        ↓
Return to Hub
```

## 2.2 What replaces 'catching'

The game can still have the satisfying feeling of hunting for something, but the final action is **도감 등록**.

A creature is registered after the player collects enough evidence:

- 모습 단서: feather, tracks, silhouette, color pattern
- 소리 단서: call, echo, wing sound, splash
- 서식지 단서: nest, food, burrow, water, tree hollow
- 행동 단서: flying, climbing, jumping, feeding, hiding

The final encounter should show a large character presentation, a short fact, a celebration animation, and the codex card.

---

# 3. Codex system

## 3.1 Codex categories

The first version should stay simple:

- 새
- 작은 동물
- 곤충
- 양서/파충류
- 식물/자연 흔적

Each stage has one **main creature card** and optional supporting discovery cards.

## 3.2 Codex card fields

```text
id
name
category
stageId
rarity
icon / illustration
habitat
food
behavior
sound
funFact
cluesFound[]
firstFoundAt
observedCount
favorite
```

## 3.3 Rarity

Rarity is for presentation, not gambling.

- COMMON: easy to encounter, green cue
- UNCOMMON: requires 1 optional clue, blue cue
- RARE: appears after stage clear / hidden route, purple cue
- SPECIAL: chapter completion encounter, gold cue

No loot-box behavior, no paid rerolls, no required random grind.

## 3.4 Codex completion rewards

Suggested milestones:

- 5 entries: 탐험 모자
- 10 entries: 쌍안경 스티커
- 15 entries: 야간 탐험 랜턴 skin
- 20 entries: 황금 나침반 badge
- Chapter complete: special outfit / hub decoration

Rewards should be cosmetic or celebratory. They must not make later quizzes easier or gate learning content behind grinding.

---

# 4. Chapter 1 — 현재 RC 5개 스테이지

These stages already work and should not be redesigned before Android/device acceptance. The future codex layer should be attached to them with minimal changes.

## Stage 1 — 숲속 탐험 캠프

**Main creature:** 파랑새  
**Theme:** first expedition / learning how to observe  
**Existing flow:** Learning Hut → Feather → Footprints → Birdcall → Fire Pit → Ridge → Bluebird → Reward

### Scenario

The explorer arrives at camp and receives the first field notebook. A blue feather near the hut starts the mystery. Footprints lead away from camp, a distant bird call confirms the direction, and the campfire memory game teaches the player to review evidence. At the ridge, the bluebird finally appears.

### Codex additions

- 파랑새 — main creature
- 파란 깃털 — discovery card
- 작은 발자국 — discovery card
- 새소리 — sound discovery

### Stage lesson

"한 가지 모습만 보지 말고 여러 단서를 모으면 누구인지 알 수 있어."

### Replay hook

After first completion, a second perch can reveal a short alternate bluebird behavior animation.

---

## Stage 2 — 안개 폭포

**Main creature:** 물총새  
**Theme:** sound + water habitat  
**Existing flow:** Stream Gate → Stepping Stones → Echo → Mist Trail → Leaf Match → Lookout → Kingfisher → Reward

### Scenario

A fast splash is seen near the stream but the creature disappears. The player crosses stepping stones, compares waterfall sounds, follows wet mist traces, and matches leaves from the waterside habitat. From the high lookout the player finally observes the kingfisher diving.

### Codex additions

- 물총새 — main creature
- 징검다리 이끼
- 폭포 소리
- 물가 잎사귀

### Stage lesson

"동물은 사는 곳에 맞는 몸과 행동을 가지고 있어."

### Replay hook

A post-clear optional observation can show the kingfisher dive from another angle.

---

## Stage 3 — 반딧불 동굴

**Main creature:** 작은 박쥐  
**Supporting creature:** 반딧불이  
**Theme:** darkness / sound / light pattern  
**Existing flow:** Cave Gate → Glow Trail → Echo Crystal → Shadow Mark → Firefly Pattern → Crystal Bridge → Bat → Reward

### Scenario

The cave is dark, so the player cannot rely on color alone. Fireflies mark the route, crystal echoes provide sound clues, and a shadow on the cave wall hints that something is flying deeper inside. The player remembers a firefly flash pattern, crosses the crystal bridge, and meets the bat roost.

### Codex additions

- 작은 박쥐 — main creature
- 반딧불이 — supporting creature
- 울림 수정 — nature discovery
- 날개 그림자 — clue card

### Stage lesson

"어두운 곳에서는 빛과 소리도 중요한 단서가 돼."

### Replay hook

A hidden post-clear firefly cluster gives a rare color-pattern observation.

---

## Stage 4 — 거대한 고목

**Main creature:** 다람쥐  
**Theme:** tree ecology / age / food traces  
**Existing flow:** Root Gate → Bark Pattern → Seed Trail → Hollow Echo → Tree Ring → Canopy Stairs → Squirrel → Reward

### Scenario

A giant ancient tree becomes a vertical habitat. Bark marks show where animals climbed, dropped acorns become a trail, and the hollow trunk produces a distinct sound. The player counts tree rings, climbs the spiral stairs, and finds a squirrel storing food in the canopy.

### Codex additions

- 다람쥐 — main creature
- 도토리 흔적
- 나무껍질 무늬
- 나이테

### Stage lesson

"한 그루의 나무도 여러 생물에게 집과 먹이를 줄 수 있어."

### Replay hook

After completion, one hidden branch can reveal a second squirrel cache.

---

## Stage 5 — 하늘 능선

**Main creature:** 하늘매  
**Theme:** wind / sky / long-distance observation  
**Existing flow:** Sky Gate → Wind Ribbon → Cloud Shadow → Wind Chime → Star Pattern → Summit Bridge → Hawk → Reward

### Scenario

The player leaves the dense forest and enters an open ridge where wind replaces trees as the main guide. Ribbons show wind direction, cloud shadows move across the ground, and wind chimes help locate the strongest airflow. At the summit bridge, the player observes a hawk circling on rising air.

### Codex additions

- 하늘매 — main creature
- 바람 방향
- 구름 그림자
- 능선 서식지

### Stage lesson

"하늘을 나는 동물도 바람과 지형을 이용해."

### Replay hook

A post-clear viewpoint can show a wider hawk flight pattern and unlock a photo-style codex image.

---

# 5. Chapter 2 — 생태 도감 확장 스테이지

Chapter 2 should begin only after the current 5-stage RC and Android input/runtime are stable.

## Stage 6 — 대나무 숲길

**Main creature:** 레서판다  
**Theme:** climbing / food traces / quiet movement

### Flow

Bamboo Gate → Bitten Leaves → Scratch Marks → Branch Balance → Bamboo Pattern Game → Tree Platform → Red Panda → Reward

### Scenario

Fresh bite marks on bamboo suggest a shy animal nearby. The player compares leaf shapes, finds scratch marks on a trunk, and follows movement in the canopy. A balance/pattern mini-game opens the tree platform where the red panda is resting.

### Codex

- 레서판다
- 대나무 잎
- 나무 긁힌 자국
- 나무 위 생활

### Reward

🎋 대나무 탐험 배지

### Terrain goal

First stage designed from the start with visible elevation changes and ground-following props.

---

## Stage 7 — 꽃빛 계곡

**Main creature:** 호랑나비  
**Supporting creature:** 꿀벌  
**Theme:** color / pollination / flower matching

### Flow

Flower Gate → Pollen Trail → Bee Buzz → Petal Match → Wind Garden → Nectar Patch → Butterfly → Reward

### Scenario

The valley is full of flowers but only some attract the target butterfly. The player follows pollen, distinguishes bee and butterfly sounds, matches petal patterns, and finds a nectar-rich flower patch.

### Codex

- 호랑나비
- 꿀벌
- 꽃가루
- 꿀샘

### Reward

🦋 꽃빛 날개 배지

### Replay hook

Different flower patches can reveal additional butterfly color forms without changing the main completion requirement.

---

## Stage 8 — 맹그로브 습지

**Main creature:** 청개구리  
**Theme:** water level / jumping / camouflage

### Flow

Wetland Gate → Ripple Clue → Frog Call → Lily Pad Route → Camouflage Match → Mangrove Root Bridge → Tree Frog → Reward

### Scenario

The player hears a call before seeing anything. Ripples and moving leaves lead through shallow water. A camouflage mini-game asks the player to find which green pattern hides best among leaves. The final encounter is a frog jumping between mangrove roots.

### Codex

- 청개구리
- 물결 흔적
- 개구리 울음
- 보호색

### Reward

🐸 초록 점프 배지

---

## Stage 9 — 달빛 유적

**Main creature:** 부엉이  
**Theme:** night vision / sound direction / silhouette

### Flow

Ruins Gate → Feather Shadow → Hoot Direction → Moon Tile Puzzle → Silent Steps → Old Tower → Owl → Reward

### Scenario

The stage begins at dusk. A wing shadow crosses the ruins. The player uses hoot direction rather than bright markers, solves a moon-tile pattern, then approaches the old tower quietly to observe the owl.

### Codex

- 부엉이
- 야간 활동
- 날개 그림자
- 방향성 울음

### Reward

🌙 달빛 눈 배지

### Replay hook

Post-clear night mode can expose one hidden nocturnal insect entry.

---

## Stage 10 — 정글 호수

**Main creature:** 수달  
**Theme:** swimming / object use / family behavior

### Flow

Lake Gate → Wet Footprints → Shell Pieces → Current Crossing → Object Match → Reed Hide → Otter → Reward

### Scenario

Wet tracks lead to broken shells near the shore. The player crosses a gentle current, matches objects animals could use, and watches from reeds as an otter opens food and swims with its family.

### Codex

- 수달
- 젖은 발자국
- 조개껍데기
- 물가 은신처

### Reward

🫧 호수 친구 배지

### Chapter 2 completion

Unlock **탐험 생물 도감 10종 기념 페이지** and a new Hub decoration.

---

# 6. Chapter 3 — 희귀 생물 조사단

Chapter 3 is a later roadmap. It should reuse the same core mechanics rather than adding a new combat system.

## Stage 11 — 이끼 협곡

**Main creature:** 카멜레온  
**Core mechanic:** changing color / silhouette search  
**Mini-game:** background-pattern match  
**Reward:** 🟢 위장 탐정 배지

## Stage 12 — 오래된 석문

**Main creature:** 원숭이  
**Core mechanic:** movement sequence / fruit traces  
**Mini-game:** remember a 3-step branch route  
**Reward:** 🍌 나뭇가지 길잡이 배지

## Stage 13 — 구름 숲

**Main creature:** 코뿔새  
**Core mechanic:** distant call / large beak silhouette / fruit habitat  
**Mini-game:** sound + shape pairing  
**Reward:** 🌥️ 구름 숲 배지

## Stage 14 — 비밀 땅굴

**Main creature:** 천산갑  
**Core mechanic:** digging traces / scales / nocturnal path  
**Mini-game:** trace matching and safe burrow route  
**Reward:** 🛡️ 비늘 수호자 배지

## Stage 15 — 황금 안개 정원

**Main creature:** 황금개구리  
**Rarity:** SPECIAL  
**Core mechanic:** combine learned clue types from earlier stages  
**Mini-game:** 4-part expedition recap — sound, track, habitat, pattern  
**Reward:** 🧭 황금 나침반

### Final scenario

The player is no longer simply following one obvious trail. Four different clue types point toward the hidden sanctuary. Completing the investigation reveals the special creature and a panoramic codex celebration showing all chapter discoveries.

The final reward should celebrate **observation skill and exploration completion**, not player power.

---

# 7. Stage template for all future content

Every new stage should be authored with the same contract.

```yaml
stage:
  id:
  title:
  chapter:
  biome:
  mainCreatureId:
  supportingCreatureIds: []
  entryObjective:
  routeAnchors: []
  encounters:
    - clue
    - clue
    - clue
    - miniGame
    - transition
    - mainCreature
    - reward
  codexRewards: []
  badgeReward:
  optionalReplayEncounter:
  learningTheme:
  terrainProfile:
```

Recommended length:

- 7~9 authored interaction beats
- 1 mini-game
- 1 main encounter
- 1 reward ceremony
- 1 optional post-clear discovery at most

Do not turn each stage into a checklist of 20 collectibles.

---

# 8. Hub / World Map future design

The Jungle Hub should eventually show three things clearly:

1. **어디를 갈까?** — stage cards / world map
2. **무엇을 찾았지?** — codex progress
3. **무엇을 받았지?** — badges / stickers

Suggested top-level progression:

```text
Chapter 1: 첫 탐험       5/5
Chapter 2: 생태 도감     0/5
Chapter 3: 희귀 조사     LOCKED

도감: 8 / 25
배지: 5 / 15
```

The codex should be reachable from the Hub and pause menu, but should not compete with the current objective during active exploration.

---

# 9. Optional encounters and replay

Replay should add discovery, not grind.

Good replay reasons:

- alternate creature behavior
- day/night variation
- one hidden supporting species
- different camera/photo card
- optional environmental fact
- chapter completion secret encounter

Avoid:

- random low-chance mandatory spawn
- repeated currency farming
- losing previously found entries
- daily streak pressure
- excessive duplicate collection

---

# 10. Technical direction

The current verified game should evolve incrementally.

## Phase A — Codex foundation on existing 5 stages

Add only data and persistence first.

Suggested modules:

```text
src/content/creature_codex.js
src/content/codex_storage.js
src/content/stage_discoveries.js
```

Responsibilities:

- creature metadata
- discovered clue IDs
- first registration
- observed count
- persistence

Existing stage progression and reward code must remain unchanged.

## Phase B — Codex UI

Add a Hub codex screen/panel:

- grid of discovered creatures
- silhouette for locked entries
- large detail card
- clues found
- short child-readable fact
- stage origin

Input contract:

- D-pad move selection
- A open card
- B back

## Phase C — Register current 5 main creatures

Attach codex registration only at the existing real encounter/reward flow:

- Camp → Bluebird
- Waterfall → Kingfisher
- Cave → Bat + Firefly support entry
- Giant Tree → Squirrel
- Sky Ridge → Hawk

No direct localStorage cheats or automatic completion on page load.

## Phase D — Stage 6 vertical slice

Build **대나무 숲길** as the first fully new stage using:

- existing InputController
- existing panel/reward patterns
- existing logical route/collision design
- terrain-height presentation lessons learned from Waterfall PoC
- codex registration from day one

Only after Stage 6 E2E passes should Stage 7~10 production implementation begin.

## Phase E — Rare/optional encounters

Add optional encounter director only after the deterministic main path is stable.

Possible contract:

```text
main progression = deterministic
optional encounter = deterministic unlock condition + location
visual timing/animation may vary
```

Do not make core progression depend on RNG.

---

# 11. Data compatibility

Existing stage rewards remain separate from creature codex entries.

Example:

```text
Stage reward:
waterfall → kingfisher-drop badge

Codex:
kingfisher → discovered/registered creature
```

This lets us preserve current 5/5 badge persistence while adding the new collection layer safely.

Suggested storage keys:

```text
eduni.jungle.stageRewards.v1       # existing, do not change
eduni.jungle.codex.v1              # future
eduni.jungle.discovery.v1          # optional clue history
```

A migration should not be required just to add the first codex version.

---

# 12. Acceptance rules for future stages

A stage is not complete until all are true:

- actual D-pad/QA movement can traverse the authored route
- visible path matches logical walkability
- interaction targets use the intended logical coordinates
- mini-game can be completed without direct state mutation
- main creature encounter happens in normal gameplay
- codex entry is created from the real encounter flow
- reward confirmation works
- reload preserves codex/reward state
- no console/page errors
- Android WebView/controller acceptance eventually passes

For terrain-enabled stages also verify:

- player visually stays on terrain
- props do not float or sink noticeably
- elevation never hides the readable route
- camera still makes the next objective understandable

---

# 13. Content production order

Recommended order after current RC/device acceptance:

```text
1. Codex data/storage foundation
2. Codex UI in Jungle Hub
3. Integrate existing 5 creatures
4. Verify 5-stage replay + persistence
5. Build Stage 6 — Bamboo Grove vertical slice
6. Review child readability + terrain performance
7. Build Stage 7 — Flower Valley
8. Build Stage 8 — Mangrove Wetland
9. Build Stage 9 — Moonlit Ruins
10. Build Stage 10 — Jungle Lake
11. Chapter 2 completion reward
12. Only then evaluate Chapter 3
```

---

# 14. Non-goals

Do not add these merely because the game has a collection book:

- creature combat system
- stat/level grinding
- PvP
- trading
- paid gacha
- online chat
- complex crafting economy
- random mandatory encounters
- hundreds of creatures before the core 10~15 are polished

The game should feel like **a child-friendly expedition game with a satisfying collection book**, not a copy of a commercial monster-battling game.

---

# 15. Current decision gate

This roadmap is planning material only.

The verified 5-stage RC remains frozen until:

1. the current terrain experiment is reviewed,
2. Android WebView/controller acceptance is complete,
3. codex foundation is approved as a separate implementation task.

When implementation starts, each phase should use its own branch and Draft PR, with GitHub as the source of truth for status, tests, evidence, and review decisions.
