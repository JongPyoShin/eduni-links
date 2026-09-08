# PROMPT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13

## Mission
현재 정글 어드벤처는 기능/진행/E2E는 안정화되었지만, 실제 플레이 화면이 너무 단순하고 비어 보인다.
이번 작업의 목표는 **게임 로직을 건드리지 않고, 5개 스테이지가 각각 기억에 남는 장소처럼 보이도록 시각 밀도·깊이·연출·환경 애니메이션을 크게 끌어올리는 것**이다.

기준선은 최신 `origin/prototype/jungle-web-canvas-poc`이며, 작업 시작 전 반드시 fetch 후 START HEAD를 기록한다.

```bash
git fetch origin prototype/jungle-web-canvas-poc
```

현재 확인된 기준 HEAD는 `122c8c8`이며 이후 원격이 더 최신이면 최신 원격을 우선한다.

---

# 1. 절대 보존해야 할 기존 결과

PROMPT 11/12에서 검증 완료된 아래 기능을 깨뜨리면 FAIL이다.

- Hub → Camp → Waterfall → Cave → Giant Tree → Sky Ridge 순차 진행
- Hub 잠금 해제/복귀
- 발견/마일스톤 5/5
- badge/reward 5/5
- `배지 5 / 5 · 정글 탐험 완주!`
- mid/final reload persistence
- keyboard / mouse / tablet touch
- portrait/landscape resize
- wrong-answer / recovery flow
- headed Chrome acceptance
- 기존 unit test 201 pass 이상

**게임 판정/퀴즈 정답/스테이지 진행/저장 구조를 시각 개선을 이유로 변경하지 않는다.**

---

# 2. 참고 자료 — 반드시 읽고 기록

이번 작업 시작 시 아래 자료를 실제로 읽고, 핵심 적용점을 프로젝트 내부 문서에 남긴다.

## A. BUFATECHNO Web Game Dev

- Repo: https://github.com/bufatechno/bufatechno-webgamedev
- 우선 확인:
  - `SKILL.md`
  - `references/design-system.md`
  - `references/2d-drawing-textures.md`
  - `references/animation-system.md`
  - `references/asset-pipeline.md`
  - `references/audio-ui-systems.md`
  - `references/performance-optimization.md`

### 참고할 핵심
- "기능이 되는 데모"가 아니라 **보기에 완성된 게임**을 기준으로 한다.
- coherent visuals: lighting / shadows / fog / material / palette가 서로 어울려야 한다.
- 빈 화면을 단순 오브젝트 몇 개로 채우지 말고 **foreground / gameplay / background의 깊이 레이어**를 만든다.
- particle / ambient animation / light / VFX는 장식이 아니라 장소의 분위기를 설명해야 한다.
- 모바일/태블릿 입력과 성능을 동시에 보존한다.
- generic template/AI-slop 느낌을 피하고 각 스테이지에 명확한 visual identity를 부여한다.

## B. pokemonlive

- Repo: https://github.com/xflare-bot/pokemonlive

### 참고할 핵심 아키텍처

**Rules engine owns the outcome. Presentation owns the spectacle.**

현재 EDUNI 정글에도 같은 원칙을 적용한다.

```text
기존 deterministic gameplay/state
        ↓
presentation event
        ↓
camera / VFX / particles / animation / cinematic layer
        ↓
기존 gameplay outcome은 절대 변경하지 않음
```

pokemonlive에서 참고할 부분:
- 게임 결과/상태는 코드가 결정
- 연출은 상태 결과를 받아 표현만 강화
- 연출 실패가 게임 진행을 막지 않음
- 장면 continuity 유지
- 다음 연출 prewarm / fallback 사고방식
- 영상/연출이 별도 modal이 아니라 플레이 화면 안에서 이어지는 방식

**Pokémon IP/캐릭터/아트 스타일을 복제하지 않는다. 구조와 presentation philosophy만 참고한다.**

## C. fal H3 Max

- https://fal.ai/models/minimax/h3-max/image-to-video
- https://fal.ai/models/minimax/h3-max/reference-to-video

현재 PROMPT 13에서는 **유료 API를 게임 필수 경로에 넣지 않는다.**

참고 목적:
- 향후 discovery/reward 순간을 짧은 cinematic으로 확장할 가능성
- image/reference → short video
- continuity anchor / first-frame / previous-frame 기반 연출 개념

### 금지
- FAL_KEY를 프론트에 넣지 않는다.
- API 키/유료 호출을 이번 완료 조건으로 만들지 않는다.
- 네트워크/AI 응답이 없으면 게임이 진행되지 않는 구조를 만들지 않는다.

## 기록 파일

신규 작성:

`jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md`

반드시 포함:
1. 위 3개 reference URL
2. 실제 읽은 파일
3. EDUNI에 바로 적용할 요소
4. POC 후 적용할 요소
5. 적용하지 않을 요소와 이유

---

# 3. 시각 목표

현재 화면에서 가장 큰 문제는 **넓은 빈 공간 + 반복적인 단순 도형 + 스테이지별 차별성 부족**이다.

이번 결과는 스크린샷만 봐도 각 지역을 구분할 수 있어야 한다.

각 스테이지는 최소 다음 4개 visual layer를 가진다.

1. **Background** — 먼 배경, 하늘, 산, 숲, 암벽 등
2. **Midground / gameplay** — 실제 이동 경로와 상호작용 오브젝트
3. **Foreground** — 화면 가장자리 잎/바위/안개/가지 등 depth cue
4. **Ambient motion** — 빛, 물, 안개, 입자, 잎, 생물 silhouette 등 지속적인 움직임

단순히 화면 전체에 texture/noise를 깔아 "복잡해 보이게" 만드는 것은 실패다.

---

# 4. 공통 Visual System

가능하면 중복 코드를 늘리지 말고 공통 helper/system으로 정리한다.

후보:

- ambient particle helper
- layered foliage / foreground occluder
- gradient/fog helper
- landmark glow / interaction focus cue
- small wildlife ambient actor
- water/mist/wind animation helper
- camera emphasis helper
- discovery/reward presentation event helper

## 공통 요구

### Depth
- 최소 3단계 원근감이 항상 느껴질 것
- foreground가 player/HUD를 가려 플레이를 방해하지 않을 것

### Lighting
- flat uniform brightness 금지
- stage별 main light direction/color 존재
- interactive landmark는 주변보다 자연스럽게 시선이 갈 것

### Material / Surface
- 큰 단색 면을 피한다.
- procedural texture, gradient, highlight, shadow, edge detail 등을 활용한다.
- 외부 대형 asset dependency보다 현재 구조에 맞는 procedural/lightweight 표현 우선.

### Ambient movement
화면이 정지 그림처럼 보이지 않아야 한다.

예:
- leaves sway
- water movement
- mist drift
- fireflies
- falling dust/pollen
- cloud movement
- wind ribbons
- subtle light pulse

### Camera
기존 이동 카메라를 깨지 않는다.

허용:
- landmark 접근 시 매우 약한 focus
- discovery 순간 short emphasis
- reward 순간 0.3~1.0초 정도의 subtle zoom/punch
- 작은 shake

금지:
- 멀미 유발 continuous shake
- player control을 긴 시간 빼앗는 cinematic
- camera 때문에 상호작용 target을 잃는 현상

---

# 5. Stage별 구체 요구

## 5.1 Camp — "살아있는 정글 베이스캠프"

현재 단순한 오브젝트 배치에서 벗어난다.

필수 visual beats:
- canopy/큰 나무 silhouette로 화면 프레임 형성
- hut 주변 생활감: rope, crates, lantern, sign, footprints, 작은 도구류
- 길 주변 풀/fern/leaf cluster 밀도 증가
- 햇빛이 숲 사이로 들어오는 느낌
- pollen/dust/light mote
- 작은 새/나비/잎 움직임 중 최소 1개 ambient actor
- hut / clue / Bluebird가 background에 묻히지 않을 것

기대 결과:
- 첫 화면에서 "빈 평지 위의 몇 개 오브젝트" 느낌이 없어야 한다.
- Camp가 안전한 출발 지역처럼 느껴져야 한다.

---

## 5.2 Waterfall — "물·안개·젖은 바위"

필수 visual beats:
- waterfall 자체가 stage의 가장 강한 landmark
- 물줄기 motion / foam / spray
- mist drift
- wet rock highlight
- stepping stones 주변 ripple
- water edge vegetation
- foreground leaves/rocks
- 물총새 discovery 순간 물 splash 또는 blue/cyan accent

현재 collision/path geometry는 변경하지 않는다.

기대 결과:
- 스크린샷에서 정지 상태로도 Waterfall임이 즉시 보여야 한다.
- 움직이는 화면에서는 물/안개가 계속 살아 있어야 한다.

---

## 5.3 Cave — "어둠 속 반딧불과 수정"

필수 visual beats:
- cave entry부터 내부로 갈수록 명암 변화
- 암벽 silhouette / foreground rock occlusion
- crystal 또는 glow object가 path landmark 역할
- firefly particle cluster
- 먼 곳의 subtle drip / reflection / glow pulse
- black 화면처럼 뭉개지지 않도록 playable path는 읽혀야 함

색감 권장:
- dark neutral base
- cyan / amber / lime 계열 clue accent

기대 결과:
- 위험/신비한 공간이지만 7세 아이가 길을 잃을 정도로 어둡지 않을 것.

---

## 5.4 Giant Tree — "압도적인 크기의 고목"

이 스테이지는 **scale**이 핵심이다.

필수 visual beats:
- trunk/root가 player보다 압도적으로 크게 느껴짐
- giant root foreground/midground
- bark detail / moss / mushroom / vine
- canopy에서 내려오는 light shaft 또는 dappled light
- floating seed / pollen
- squirrel 동선 주변 작은 branch/leaf cues
- 위로 올라가는 느낌이 화면 composition에 나타날 것

기대 결과:
- 단순 숲길이 아니라 "거대한 나무 자체를 탐험"하는 느낌.

---

## 5.5 Sky Ridge — "높이와 바람"

필수 visual beats:
- distant mountain / cloud layer
- altitude fog / atmospheric perspective
- cloud movement
- wind ribbon / grass / flag / leaf 등의 방향성 있는 바람 표현
- ridge edge에서 아래 공간의 깊이 표현
- Hawk discovery 순간 sky/light accent
- staircase corridor 구조가 시각적으로도 자연스럽게 읽혀야 함

기대 결과:
- 바닥 위에 길만 있는 씬이 아니라 높은 산등성이 위라는 감각이 명확할 것.

---

# 6. Hub 개선

Hub는 단순 메뉴가 아니라 "탐험 진행 지도"처럼 보여야 한다.

필수:
- 5개 지역이 visual identity를 가진 카드/섬/지역으로 구분
- locked/unlocked/complete 상태가 즉시 이해됨
- badge 0→5 진행이 시각적으로 성장하는 느낌
- 최종 `배지 5 / 5 · 정글 탐험 완주!`는 명확한 completion moment

기존 링크 구조와 unlock 로직을 유지한다.

---

# 7. Interaction Presentation

기존 interaction/state를 바꾸지 않고 **presentation event**만 강화한다.

## Clue 발견
- 0.2~0.6초 highlight
- 작은 particle / pulse / icon
- objective 변화가 자연스럽게 눈에 띔

## Quiz 진입
- modal이 뜨기 전후 시각적으로 현재 clue와 연결된 느낌
- 배경과 modal contrast 확보

## Animal discovery
각 stage마다 최소 1개의 고유 discovery effect.

예:
- Bluebird: feather/light burst
- Kingfisher: water/splash cyan
- Bat: firefly/crystal glow
- Squirrel: seed/leaf swirl
- Hawk: wind/star/sky burst

## Reward
- badge가 "그냥 텍스트 한 줄"로 끝나지 않게 0.5~1.5초 정도의 reward emphasis
- input blocking은 최소화

---

# 8. AI Cinematic Architecture — 이번엔 hook/document만

pokemonlive에서 배운 구조를 바탕으로 미래 확장을 고려한다.

이번 구현에서 실제 fal/DeepSeek API를 호출할 필요는 없다.

다만 visual system이 아래처럼 확장 가능하도록 지나치게 state logic과 결합하지 않는다.

```text
GAME STATE
  ↓
PresentationEvent
  { type, stage, subject, result, seed }
  ↓
LocalPresentation (현재)
  ↓ future optional
AICinematicPresentation (fal/DeepSeek)
```

가능하면 `PresentationEvent` 수준의 작은 adapter/event 구조를 만들되, 현재 코드에 과도한 리팩터링이 필요하면 문서 설계만 남긴다.

반드시 local presentation만으로 게임은 100% 정상 동작해야 한다.

---

# 9. 하지 말아야 할 개선

다음은 FAIL 후보다.

- gameplay path/hitbox를 visual polish 때문에 바꿈
- 상호작용 좌표 변경으로 기존 E2E 깨짐
- 거대한 이미지 한 장을 background로 깔고 끝
- fog/overlay로 빈 공간을 가리는 방식
- 랜덤 particle을 과도하게 뿌려 화면 가독성 저하
- UI를 화려하게 만들면서 게임 화면을 가림
- 외부 CDN/asset 실패 시 blank scene
- vendor asset 404 추가
- API key 추가/커밋
- Pokémon asset/style 직접 복제
- AI-generated video가 없으면 진행 불가
- FPS 급락을 "visual upgrade"로 정당화

---

# 10. Visual Acceptance Test Cases

이번 작업은 코드만 보고 PASS 금지.
**headed Google Chrome**에서 직접 확인한다.

권장 스크립트:

`jungle-web-canvas-poc/tools/browser/jungle_visual_acceptance_qa.mjs`

## TC-VIS-001 — Before/After evidence

각 stage 동일/유사 위치에서 before/after 비교.

필수 위치:
- Hub
- Camp start / landmark
- Waterfall waterfall view
- Cave main interior
- Giant Tree trunk/root view
- Sky Ridge high ridge view

기대:
- after가 단순 색상 변경 수준이 아니라 depth/detail/ambient motion에서 명확한 개선

## TC-VIS-002 — Stage identity

스크린샷 5장을 섞어도 stage를 구분할 수 있어야 한다.

기대:
- 각 stage에 signature landmark + palette + ambient effect 존재

## TC-VIS-003 — Empty-space audit

1280×800에서 주요 플레이 구간 screenshot 분석.

기대:
- 넓은 단색/무의미한 빈 영역이 눈에 띄지 않음
- 경로 주변에 visual framing 존재
- 하지만 player route는 읽힘

## TC-VIS-004 — Ambient motion

각 stage에서 5초 이상 관찰.

기대:
- 최소 2종 이상의 ambient animation/VFX가 보임
- animation stuck/flicker 없음

## TC-VIS-005 — Interaction clarity

각 clue/landmark 접근.

기대:
- 배경 detail이 늘어도 interactable이 묻히지 않음
- objective/target을 찾을 수 있음

## TC-VIS-006 — Discovery effects

5개 discovery 모두 실제 플레이.

기대:
- 각 discovery 연출이 서로 다름
- gameplay state는 기존 결과와 동일

## TC-VIS-007 — Reward clarity

5개 badge 획득.

기대:
- reward 순간 visual emphasis 존재
- reward id/저장 결과 동일

## TC-VIS-008 — Desktop performance

headed Chrome 1280×800.

기대:
- obvious stutter 없음
- long freeze 없음
- scene transition 체감 악화 없음
- pageerror/console.error 0

가능하면 rAF 기반 frame interval/long task evidence를 수집한다.

## TC-VIS-009 — Tablet portrait

800×1280, hasTouch=true.

기대:
- foreground/VFX가 D-pad/A/B를 가리지 않음
- modal overflow 없음
- canvas blank 없음

## TC-VIS-010 — Resize/orientation

800×1280 → 1280×800 → 800×1280.

기대:
- visual layer 재배치 정상
- particle/fog/canvas 크기 정상
- HUD clipping 0

## TC-VIS-011 — Full Adventure regression

Hub 0/5부터 5/5 완주.

기대:
- 기존 PROMPT 12 결과 그대로 PASS
- final `배지 5 / 5 · 정글 탐험 완주!`
- reload 5/5 유지

## TC-VIS-012 — Negative/recovery regression

wrong answer / modal close / rapid A / reload 중 최소 핵심 회귀 테스트.

기대:
- visual effect가 state progression을 중복 호출하지 않음
- reward 중복 없음

---

# 11. Screenshot / Video Evidence

## Screenshot
최소 **80장**.

반드시:
- Hub before/after
- 각 stage start
- 각 stage signature landmark
- 각 stage ambient effect
- 각 stage discovery
- 각 stage reward
- tablet portrait
- landscape
- final Hub 5/5

저장:

`jungle-web-canvas-poc/artifacts/jungle-visual-upgrade-13/`

## Video
가능하면 headed Chrome에서 각 stage 10~20초 짧은 recording 또는 Playwright video를 남긴다.

artifact가 gitignored면 경로/개수/크기를 REPORT에 기록한다.

---

# 12. Performance / Stability Guard

Visual upgrade 후에도:

- pageerror = 0
- gameplay console.error = 0
- 신규 404 = 0
- existing vendor fallback 이외 network failure = 0
- memory가 stage 전환마다 계속 증가하는 명백한 leak 금지
- particle/object를 매 frame 무제한 생성 금지
- resize 후 duplicate animation loop 금지

가능하면 pooling/reuse를 사용한다.

---

# 13. Regression

완료 전 반드시:

```bash
node --test
git diff --check
```

그리고 PROMPT 12 Chrome Acceptance 중 최소:
- Desktop full 5-stage
- Tablet full 5-stage 또는 핵심 touch regression
- final persistence

를 다시 수행한다.

기대:
- 201+ pass / 0 fail
- E2E exit 0
- Hub 5/5
- persistence 5/5
- errors 0

---

# 14. PASS 기준

모두 만족해야 PASS다.

### Reference
- [ ] `docs/VISUAL_REFERENCES.md` 작성
- [ ] bufatechno 실제 참고 내용 기록
- [ ] pokemonlive architecture 적용/비적용 기록
- [ ] fal H3 Max는 future POC로 구분

### Visual
- [ ] Hub 시각 개선
- [ ] Camp 시각 개선
- [ ] Waterfall 시각 개선
- [ ] Cave 시각 개선
- [ ] Giant Tree 시각 개선
- [ ] Sky Ridge 시각 개선
- [ ] 각 stage signature landmark 명확
- [ ] 각 stage foreground/background depth 존재
- [ ] 각 stage ambient motion 최소 2종
- [ ] discovery 5종 연출 차별화
- [ ] reward emphasis 존재

### Usability
- [ ] interactable 가독성 유지
- [ ] route 가독성 유지
- [ ] HUD/D-pad 가림 없음
- [ ] portrait/landscape 정상

### Regression
- [ ] Hub→5 stages 완주
- [ ] reward 5/5
- [ ] persistence 5/5
- [ ] completion text 정상
- [ ] wrong/recovery 핵심 회귀 없음
- [ ] pageerror 0
- [ ] console.error 0
- [ ] 신규 network error 0
- [ ] `node --test` 0 fail
- [ ] `git diff --check` clean

### Evidence
- [ ] headed Chrome 실제 검증
- [ ] screenshot >= 80
- [ ] before/after evidence
- [ ] REPORT 작성

---

# 15. REPORT

작성:

`.agent/REPORT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md`

반드시 포함:

1. START HEAD
2. FINAL HEAD
3. changed files
4. production code 변경 목록
5. reference 조사 결과
6. stage별 visual problem before
7. stage별 구현 내용 after
8. Hub 개선
9. 공통 visual system
10. discovery/reward presentation
11. AI cinematic architecture 적용 여부
12. TC-VIS-001~012 결과
13. before/after screenshot 목록
14. screenshot/video artifact 경로
15. desktop visual QA
16. tablet visual QA
17. performance evidence
18. pageerror/console/network 집계
19. full adventure regression
20. persistence 결과
21. node --test
22. git diff --check
23. 남은 visual debt
24. 최종 PASS/FAIL

REPORT는 "예뻐졌다" 같은 주장으로 끝내지 말고, **무엇이 어떻게 달라졌는지 screenshot/DOM/read-only state/성능 숫자와 함께 증명**한다.

---

# 16. Deliverable

필요한 production code + QA script + reference doc + REPORT를 commit/push 한다.

예상 산출물:

```text
jungle-web-canvas-poc/src/... (visual implementation)
jungle-web-canvas-poc/docs/VISUAL_REFERENCES.md
jungle-web-canvas-poc/tools/browser/jungle_visual_acceptance_qa.mjs
.agent/REPORT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md
```

최종:

```bash
git status
git log -1 --oneline
git push origin prototype/jungle-web-canvas-poc
```

remote branch가 FINAL HEAD와 일치하는지 확인.

**merge/close 금지.**
