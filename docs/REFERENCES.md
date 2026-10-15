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

## 2. Web Product Design and UI References

Use these references to study layout patterns, component behavior, visual systems, prompts, motion, or assets. For the implementation workflow and EDUNI-specific rules, read `docs/EDUNI_WEB_DESIGN_GUIDE.md`.

### Website and product UI inspiration

#### Minimal Gallery
- URL: https://minimal.gallery
- Category: curated website design inspiration.
- EDUNI use: study restrained typography, whitespace, visual hierarchy, and page composition.
- Constraint: treat screenshots, site text, and layouts as copyrighted reference material; do not republish or reproduce them without permission.

#### Kage
- URL: https://kage.design
- Category: real-product UI inspection and AI-assisted design prompts.
- EDUNI use: extract broad layout and interaction ideas, then adapt them to the EDUNI task.
- Constraint: prompts may be adapted, but screenshots, product names, logos, and brand identities remain their owners' property. AI-generated analysis may be inaccurate or stale; do not clone a product.

#### Refero Styles
- URL: https://styles.refero.design
- Category: design-style library and AI-readable design-system examples.
- EDUNI use: compare typography, color, spacing, and component patterns; use DESIGN.md/Tailwind examples as translation input where relevant.
- Constraint: examples are interpreted/reconstructed and may be approximate; they are not necessarily original source code or exact design tokens.

#### Component Gallery
- URL: https://component.gallery
- Category: cross-system component catalogue and pattern explanations.
- EDUNI use: understand common component roles, states, terminology, and accessibility expectations before implementing an equivalent in the existing stack.
- Constraint: follow the originating design system's license for any copied code or assets; catalogue inclusion is not a blanket reuse grant.

#### AppShot Gallery
- URL: https://appshot.gallery
- Category: curated mobile-app screenshot inspiration.
- EDUNI use: study mobile information hierarchy, navigation, and compact-screen composition.
- Constraint: screenshots show presentation, not necessarily interaction behavior; do not reuse screenshots, app icons, or branding without permission.

### AI coding and component references

#### DESIGN.md
- URL: https://designmd.ai
- Category: community-authored, AI-readable design-system files.
- EDUNI use: inspect token and component documentation formats; adapt useful system-level ideas into EDUNI's existing conventions.
- Constraint: content is community-authored and the format is evolving; inspect the selected entry's license and provenance. Do not assume all entries share one license.

#### VibePrompts
- URL: https://vibeprompts.dev
- Category: UI-generation prompts and implementation snippets, often Tailwind-oriented.
- EDUNI use: use prompts as a starting checklist for page structure and states; translate examples into the target project's actual stack.
- Constraint: no blanket reuse license was confirmed; treat code as inspiration unless its specific license grants reuse.

#### 21st.dev
- URL: https://21st.dev
- Category: React component, template, and theme registry.
- EDUNI use: study component composition or use a component only when the target project already supports React and the selected item is compatible.
- Constraint: inspect the individual item's license and dependencies. Do not introduce React, Tailwind, or registry dependencies into a non-React EDUNI project just to copy an example. Free-copy limits and site terms can change.

### Motion and interaction references

#### Kinetics
- URL: https://kinetics.colorion.co
- Category: CSS/React motion examples and prompts.
- EDUNI use: inspect motion timing and state transitions; prefer a small CSS implementation for simple feedback.
- Constraint: a copy button is not a license. Use as inspiration unless the exact snippet's reuse terms are clear; honor reduced-motion preferences.

#### Circle Loaders
- URL: https://circleloaders.dominikakissi.com
- Category: standalone SVG loading indicators.
- EDUNI use: choose a calm, brief loading pattern when the wait itself needs feedback.
- Constraint: verify the specific asset's license before copying; use a static or reduced-motion alternative where appropriate.

#### Gradient Buttons
- URL: https://gradientbuttons.colorion.co
- Category: gradient button appearance and CSS examples.
- EDUNI use: inspiration for restrained color treatments, not a default button system.
- Constraint: verify the exact snippet's reuse terms; preserve readable contrast and EDUNI's visual consistency.

#### Anime.js
- URL: https://animejs.com
- Category: JavaScript animation engine.
- EDUNI use: consider only for coordinated SVG/DOM animation that is awkward in CSS and justified by the feature.
- Constraint: check current API/version and repository license before adoption, pin the version, retain required notices, and provide a reduced-motion path. Prefer CSS for simple hover, press, and reveal effects.

### Illustration and icon references

#### Kitbitz
- URL: https://kitbitz.art
- Category: hand-drawn illustration library.
- EDUNI use: candidate source for friendly, lightweight illustration assets.
- Constraint: the site's CC0 statement applies to its published illustrations, not automatically to website code or every contribution. Record the exact asset URL and confirm the item is part of the covered collection before committing it.

#### 3dicons
- URL: https://3dicons.co
- Category: 3D icon collections, including free and premium content.
- EDUNI use: candidate for occasional 3D iconography when it fits the page and mobile performance budget.
- Constraint: verify the exact collection and item. The v1 collection is identified as CC0; do not infer that premium items or every site asset share that license. Record item URL and format.

### Common rule for all references
- Inspiration does not grant permission to copy a screenshot, brand, illustration, or code sample.
- Record the exact source and license for any external asset or code included in the repository; re-check terms before redistribution.
- Prefer EDUNI-owned tokens/components and the target project's existing framework. Do not add a library for a visual effect that can be delivered simply with existing CSS/HTML.

## 3. Game UI / Visual / Presentation

For game visual work, start with the common references above, then read the target project's own `AGENTS.md` and reference docs.

Current Jungle-specific detail:
- `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
- `jungle-web-canvas-poc/AGENTS.md`
- `jungle-web-canvas-poc/ASSET_SOURCES.md`
- `jungle-web-canvas-poc/THREEJSASSETS.md`

## 4. Learning UX / Education

The current repository contains product and child-learning guidance primarily as repository-local design rules rather than consolidated external benchmark URLs.

Start with:
- `docs/eduni_learning_portal_prd_v1_0.md`

Do not invent or add external education references merely to fill this section. Add them only when they are intentionally selected and their purpose is documented.

## 5. AI / Generative

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

## 6. Asset Sources

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

## 7. Project-specific Reference Rules

### Jungle
Read all applicable shared sections above, then:
1. `jungle-web-canvas-poc/AGENTS.md`
2. `jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`
3. `jungle-web-canvas-poc/ASSET_SOURCES.md` when acquiring or choosing assets
4. `jungle-web-canvas-poc/THREEJSASSETS.md` for threejsassets/Waterfall vendor work

Project-specific rules override generic suggestions where they are more restrictive.

## 8. Reference Provenance

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
| Minimal Gallery | web design inspiration | user-provided reference list, 2026-10-15 | inspiration only; screenshots/layouts are copyrighted |
| Kage | product UI / prompt reference | user-provided reference list, 2026-10-15 | adapt patterns; do not copy brand or screenshots |
| Refero Styles | design-system reference | user-provided reference list, 2026-10-15 | reconstructed examples may be approximate |
| Component Gallery | component patterns | user-provided reference list, 2026-10-15 | follow source system license for copied material |
| AppShot Gallery | mobile UI inspiration | user-provided reference list, 2026-10-15 | screenshots are reference only |
| DESIGN.md | AI-readable design systems | user-provided reference list, 2026-10-15 | inspect per-entry license and provenance |
| VibePrompts | UI prompts/snippets | user-provided reference list, 2026-10-15 | inspiration unless specific reuse license is confirmed |
| 21st.dev | React components | user-provided reference list, 2026-10-15 | per-item license; only for compatible React targets |
| Kinetics | animation inspiration | user-provided reference list, 2026-10-15 | verify snippet license before reuse |
| Circle Loaders | loader inspiration | user-provided reference list, 2026-10-15 | verify specific asset license before reuse |
| Gradient Buttons | button styling inspiration | user-provided reference list, 2026-10-15 | verify snippet license before reuse |
| Anime.js | animation library | user-provided reference list, 2026-10-15 | verify current version/license before adoption |
| Kitbitz | illustration assets | user-provided reference list, 2026-10-15 | published illustrations stated CC0; verify item scope |
| 3dicons | icon assets | user-provided reference list, 2026-10-15 | exact collection license; v1 identified as CC0 |

## 9. Maintenance

When a new external reference is intentionally adopted:
1. record the canonical URL and why it is useful;
2. classify it into the smallest relevant section;
3. record the repository file or task that introduced it;
4. note runtime status such as current, optional POC, asset candidate, or deprecated;
5. record license/redistribution constraints for asset sources;
6. keep project-only references in project docs and link them here instead of duplicating detailed instructions.

This file is a shared index, not permission to scan every reference for every task.
