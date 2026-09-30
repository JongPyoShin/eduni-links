# EDUNI References

This document is the shared entry point for external references already recorded in the EDUNI repository.

Use only the sections relevant to the assigned task. Project-specific constraints, licensing rules, privacy rules, and task instructions take precedence over this document.

## 1. Common EDUNI / Game Design References

### BUFATECHNO Web Game Dev
- URL: https://github.com/bufatechno/bufatechno-webgamedev
- Category: game visual design, animation, asset pipeline, performance
- Existing repository provenance:
  - `.agent/PROMPT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md`
  - `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
- Existing guidance specifically referenced:
  - `SKILL.md`
  - `references/design-system.md`
  - `references/2d-drawing-textures.md`
  - `references/animation-system.md`
  - `references/asset-pipeline.md`
  - `references/audio-ui-systems.md`
  - `references/performance-optimization.md`
- EDUNI use:
  - coherent visual identity instead of generic template-like presentation
  - lighting, shadow, fog, materials, palette, depth layers
  - ambient animation and VFX that support place/gameplay readability
  - explicit performance budgets for mobile/tablet targets

### pokemonlive
- URL: https://github.com/xflare-bot/pokemonlive
- Category: presentation architecture
- Existing repository provenance:
  - `.agent/PROMPT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md`
  - `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
- EDUNI use:
  - game state/rules own outcomes
  - presentation events own camera/VFX/animation
  - presentation failure must not block progression
  - preserve scene continuity and provide fallbacks
- Do not copy Pokémon IP, characters, assets, or art style.

## 2. Game UI / Visual / Presentation

For game visual work, start with the common references above, then read the target project's own `AGENTS.md` and reference docs.

Current Jungle-specific detail:
- `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
- `jungle-web-canvas-poc/AGENTS.md`
- `jungle-web-canvas-poc/ASSET_SOURCES.md`
- `jungle-web-canvas-poc/THREEJSASSETS.md`

## 3. Learning UX / Education

The current repository contains product and child-learning guidance primarily as repository-local design rules rather than consolidated external benchmark URLs.

Start with:
- `docs/eduni_learning_portal_prd_v1_0.md`

Do not invent or add external education references merely to fill this section. Add them only when they are intentionally selected and their purpose is documented.

## 4. AI / Generative

### fal H3 Max — image-to-video
- URL: https://fal.ai/models/minimax/h3-max/image-to-video
- Category: future generative cinematic POC
- Existing provenance:
  - `.agent/PROMPT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md`
  - `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
- Status: future/optional; not a required gameplay runtime dependency.

### fal H3 Max — reference-to-video
- URL: https://fal.ai/models/minimax/h3-max/reference-to-video
- Category: future generative cinematic POC
- Existing provenance:
  - `.agent/PROMPT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md`
- Status: future/optional; not a required gameplay runtime dependency.

Repository guidance also mentions DeepSeek conceptually for a future AI cinematic path, but no external DeepSeek reference URL is currently consolidated here. Do not add one without an explicit source and purpose.

## 5. Asset Sources

Asset sources require license and redistribution checks before acquisition or commit.

### Kenney Nature Kit
- URL: https://kenney.nl/assets/nature-kit
- Existing repository classification: CC0
- Best use: trees, rocks, flowers, ground foliage
- Provenance:
  - `jungle-web-canvas-poc/AGENTS.md`
  - `jungle-web-canvas-poc/ASSET_SOURCES.md`

### Kenney Survival Kit
- URL: https://kenney.nl/assets/survival-kit
- Existing repository classification: CC0
- Best use: camp landmarks, survival/nature props, interaction landmarks
- Provenance:
  - `jungle-web-canvas-poc/AGENTS.md`
  - `jungle-web-canvas-poc/ASSET_SOURCES.md`

### Quaternius Ultimate Stylized Nature Pack
- URL: https://quaternius.com/packs/ultimatestylizednature.html
- Existing repository classification: CC0
- Best use: cohesive child-friendly stylized nature, glTF workflows
- Provenance:
  - `jungle-web-canvas-poc/AGENTS.md`
  - `jungle-web-canvas-poc/ASSET_SOURCES.md`

### threejsassets Free collection
- URL: https://threejsassets.com/assets/free
- Category: local-only vendor asset source
- Provenance:
  - `jungle-web-canvas-poc/AGENTS.md`
  - `jungle-web-canvas-poc/THREEJSASSETS.md`
- Repository policy:
  - use only assets explicitly marked Free
  - keep acquired GLBs local under the project's vendor directory
  - do not force-add raw vendor models to this public repository
  - re-check provider terms before acquisition or publication
  - keep procedural/runtime fallbacks so missing local assets do not break gameplay

### Pirate Nation game archive
- URL: https://github.com/proofofplay/piratenation-game
- Category: gameplay/map/collectible-flow reference only
- Discovered in:
  - branch `feature/jungle-web-canvas-luna`
  - `jungle-web-canvas-poc/ASSET_SOURCES.md`
- Repository-recorded constraints:
  - archived Unity WebGL reference with missing commercial dependencies/inactive backend
  - do not copy Unity code, commercial dependencies, brand UI, or runtime assets into EDUNI
- Status: reference only; not a runtime dependency.

### Pirate Nation art
- URL: https://github.com/proofofplay/piratenation-art
- Category: optional CC0 art/reference source
- Discovered in:
  - branch `feature/jungle-web-canvas-luna`
  - `jungle-web-canvas-poc/ASSET_SOURCES.md`
- Existing branch record classifies the repository license as CC0 1.0.
- Use only exact verified asset paths after binary/LFS and loader/render verification; do not copy branded UI.
- Status: branch-specific source discovered during cross-branch inventory; not present in `main`'s current `ASSET_SOURCES.md`.

## 6. Project-specific Reference Rules

### Jungle
Read all applicable shared sections above, then:
1. `jungle-web-canvas-poc/AGENTS.md`
2. `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
3. `jungle-web-canvas-poc/ASSET_SOURCES.md` when acquiring or choosing assets
4. `jungle-web-canvas-poc/THREEJSASSETS.md` for threejsassets/Waterfall vendor work

Project-specific rules override generic suggestions where they are more restrictive.

## 7. Reference Provenance

| Reference | Category | Existing source files | Scope/status |
| --- | --- | --- | --- |
| BUFATECHNO Web Game Dev | game visuals/performance | PROMPT 13, VISUAL_REFERENCES | shared game reference |
| pokemonlive | presentation architecture | PROMPT 13, VISUAL_REFERENCES | shared architecture reference |
| fal H3 Max image-to-video | AI/generative | PROMPT 13, VISUAL_REFERENCES | future optional POC |
| fal H3 Max reference-to-video | AI/generative | PROMPT 13 | future optional POC |
| Kenney Nature Kit | asset source | Jungle AGENTS, ASSET_SOURCES | Jungle asset candidate |
| Kenney Survival Kit | asset source | Jungle AGENTS, ASSET_SOURCES | Jungle asset candidate |
| Quaternius Ultimate Stylized Nature | asset source | Jungle AGENTS, ASSET_SOURCES | Jungle asset candidate |
| threejsassets Free | asset source | Jungle AGENTS, THREEJSASSETS | local-only; redistribution constraints |
| Pirate Nation game archive | gameplay reference | `feature/jungle-web-canvas-luna` at `95a6e1b194290f6e002c61874d20a2cd74ad536b`; introduced in `cf855cb950092ee361981ebebbf3704a58add4b0`; `jungle-web-canvas-poc/ASSET_SOURCES.md` | reference only; no Unity/runtime copying |
| Pirate Nation art | asset/reference source | `feature/jungle-web-canvas-luna` at `95a6e1b194290f6e002c61874d20a2cd74ad536b`; introduced in `cf855cb950092ee361981ebebbf3704a58add4b0`; `jungle-web-canvas-poc/ASSET_SOURCES.md` | branch-discovered CC0 source; exact-path verification required |

## 8. Maintenance

When a new external reference is intentionally adopted:
1. record the canonical URL and why it is useful;
2. classify it into the smallest relevant section;
3. record the repository file or task that introduced it;
4. note runtime status such as current, optional POC, asset candidate, or deprecated;
5. record license/redistribution constraints for asset sources;
6. keep project-only references in project docs and link them here instead of duplicating detailed instructions.

This file is a shared index, not permission to scan every reference for every task.
