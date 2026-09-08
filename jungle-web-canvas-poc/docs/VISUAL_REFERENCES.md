# VISUAL_REFERENCES.md

## References Consulted

### 1. BUFATECHNO Web Game Dev
- **URL**: https://github.com/bufatechno/bufatechno-webgamedev
- **Files read**: SKILL.md, references/design-system.md, references/2d-drawing-textures.md, references/animation-system.md, references/asset-pipeline.md, references/audio-ui-systems.md, references/performance-optimization.md

### 2. pokemonlive
- **URL**: https://github.com/xflare-bot/pokemonlive
- **Architecture**: Event→Presentation separation, camera-as-data, visual signatures per entity

### 3. fal H3 Max
- **URL**: https://fal.ai/models/minimax/h3-max/image-to-video
- **Status**: Future POC only. Not used in this implementation.

---

## EDUNI 적용 요소 (이번에 구현)

### From bufatechno
- **Design tokens**: Each stage gets unique palette (no flat fills)
- **Procedural textures**: Canvas 2D noise/gradient for natural surfaces
- **Layered depth**: foreground/background/midground always present
- **Performance budget**: Cap particle count, reuse objects
- **Anti-slop**: Unique visual identity per stage, no generic look

### From pokemonlive
- **PresentationEvent pattern**: Game state → presentation event → visual effect (no state coupling)
- **Visual signatures per entity**: Each discovery has unique visual language
- **Camera emphasis**: Subtle punch/shake on discovery, not continuous
- **Fallback chains**: If particle system fails, stage still renders

---

## POC 후 적용 요소

- **fal H3 Max**: Discovery moment → short cinematic video (future)
- **InstancedMesh foliage**: For higher-density scenes if performance allows
- **Audio ambient**: Procedural jungle sounds via Web Audio API

## 적용하지 않은 요소와 이유

- **pokemonlive AI camera decisions**: Our game is deterministic, camera follows player
- **pokemonlive video playback slots**: Not needed for Canvas/Three.js rendering
- **External asset pipeline**: All visuals procedural (zero network dependency)
- **WebGL post-processing**: Too heavy for tablet/mobile target
