# PROMPT_JUNGLE_MULTI_AGENT_VISUAL_REBUILD_17

## Mission
PROMPT 13의 시각 개선 결과는 **최종 시각 품질 기준에서 FAIL**로 간주한다.
현재 화면은 기능은 동작하지만, 넓은 단색 면·단순한 기하 도형·낮은 환경 밀도 때문에 여전히 프로토타입처럼 보인다.

이번 작업의 목표는 **opencode-free 모델들만으로 1 orchestrator + 3 sub-agent 협업 구조를 만들고**, 5개 스테이지와 Hub를 실제 게임 월드처럼 느껴질 수준으로 다시 설계하는 것이다.

핵심 원칙:

> Rules engine owns the outcome. Presentation owns the spectacle.

게임 진행/퀴즈/보상/저장/충돌은 보존하고, 월드 구성·환경 밀도·재질·조명·랜드마크·전경/중경/배경·ambient animation·발견/보상 연출을 크게 강화한다.

이번 작업은 "particle 몇 개 + light 몇 개"를 추가하는 작업이 아니다.
**스크린샷만 봐도 PROMPT 13 이전/이후 차이가 명확해야 하고, 각 스테이지를 HUD 없이도 구분할 수 있어야 한다.**

---

# 0. 실행 모델 제한 — opencode-free ONLY

이번 작업의 모든 구현/분석/리뷰 agent는 **현재 OpenCode에서 무료로 사용 가능한 모델만 사용한다.**

우선 사용 후보:
- MiniMax M3 계열 free model
- Mimo 계열 free model
- Nemotron 계열 free model

정확한 provider/model ID는 작업 시작 시 OpenCode에서 실제 조회하여 기록한다.

## 금지
- OpenAI paid model
- Claude paid model
- Gemini paid model
- fal 유료 inference
- DeepSeek 유료 API
- 자동 paid fallback
- free quota 소진 시 paid provider 자동 전환

무료 모델이 부족하면 agent 수를 줄이지, 유료 모델로 대체하지 않는다.

`REPORT_JUNGLE_MULTI_AGENT_VISUAL_REBUILD_17.md`에 반드시 다음 표를 남긴다.

| Role | OpenCode model ID | Provider | free 확인 | Session/Agent | 담당 |
|---|---|---|---|---|---|

유료 모델 사용 흔적이 하나라도 있으면 FAIL.

---

# 1. 시작 전 Git/dirty workspace 보호

원격 기준 branch:

`prototype/jungle-web-canvas-poc`

현재 원격에서 확인된 HEAD는 `a2f3ca3`이며, 실제 작업 시작 시 최신 원격을 다시 확인한다.

```bash
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
git fetch origin prototype/jungle-web-canvas-poc
git log -5 --oneline --decorate
```

현재 root workspace에는 PROMPT 16에서 수정 중이던 다음 변경이 남아 있을 수 있다.
- `src/game.js` 랜덤 퀴즈 flow fix
- `tools/browser/jungle_random_quiz_real_acceptance_qa.mjs`
- PROMPT 16 REPORT

절대 금지:
- `git reset --hard`
- `git clean -fd`
- force push
- dirty 파일 덮어쓰기
- unrelated 변경을 함께 commit

root가 dirty라면 **그 root를 건드리지 말고**, 최신 원격을 기준으로 별도 git worktree/agent branch를 만들어 visual rebuild를 진행한다.
필요하면 root dirty diff를 read-only로 확인하되, 사용자 작업을 임의 stash/pop/commit하지 않는다.

---

# 2. Multi-Agent 구성

동시에 최대 4 thread를 사용한다.

## Agent O — Orchestrator / Integrator
권장: MiniMax M3 free

담당:
- 전체 작업 분해
- reference 연구 통합
- visual blueprint 작성
- sub-agent task 정의
- branch/worktree 관리
- 충돌 없는 통합
- cross-review 요청
- 최종 headed Chrome QA
- 성능/회귀 확인
- 최종 REPORT

Orchestrator는 처음부터 혼자 전부 구현하지 않는다.
반드시 3개 sub-agent에게 실질적인 독립 작업을 배분하고 결과를 수집한다.

## Agent A — 2D World / Hub Art Director
권장: Mimo free

주 담당:
- Camp
- Waterfall
- Hub

주 수정 후보:
- `src/scene.js`
- Camp/Waterfall 2D visual helpers
- `jungle-hub.html`
- 필요 시 별도 `src/visual/*` helper

## Agent B — Three.js Environment Builder
권장: Nemotron free

주 담당:
- Cave
- Giant Tree

주 수정 후보:
- `src/three_cave_preview.js`
- `src/three_giant_tree_preview.js`
- 관련 visual helper

## Agent C — Sky / Shared Presentation / Performance Reviewer
권장: 사용 가능한 다른 opencode-free M3/Mimo/Nemotron session

주 담당:
- Sky Ridge
- 공통 presentation helper
- camera emphasis
- ambient system
- performance budget
- cross-stage visual consistency

주 수정 후보:
- `src/three_sky_ridge_preview.js`
- `src/visual/*`
- QA/perf helper

---

# 3. Worktree/branch 규칙

각 writer agent는 다른 branch/worktree를 사용한다.

권장 예:

```text
agent/vr17-camp-waterfall-hub
agent/vr17-cave-tree
agent/vr17-sky-shared
agent/vr17-integration
```

규칙:
- 같은 파일을 동시에 두 agent가 수정하지 않는다.
- shared helper가 필요하면 Agent C 또는 Orchestrator가 ownership을 가진다.
- sub-agent는 자기 branch에만 commit.
- sub-agent는 prototype branch를 직접 push하지 않는다.
- Orchestrator만 검토 후 integration branch에 cherry-pick/merge한다.
- remote branch가 작업 중 이동하면 fetch 후 안전하게 재통합. force 금지.

각 agent commit message에 역할을 표시:

```text
vr17(agent-a): rebuild camp waterfall hub
vr17(agent-b): rebuild cave giant tree
vr17(agent-c): rebuild sky ridge presentation system
```

---

# 4. Phase A — 모든 agent가 먼저 현재 결과를 비판적으로 분석

코딩 전에 3 sub-agent가 각각 현재 화면/코드를 분석한다.

각 agent는 최소 다음을 확인:
- PROMPT 13
- PROMPT 13 REPORT
- 현재 visual source files
- current browser screenshots 직접 캡처
- 기존 `docs/VISUAL_REFERENCES.md`

각 agent는 자신의 research memo를 만든다.

```text
jungle-web-canvas-poc/docs/visual-rebuild-17/AGENT_A_RESEARCH.md
jungle-web-canvas-poc/docs/visual-rebuild-17/AGENT_B_RESEARCH.md
jungle-web-canvas-poc/docs/visual-rebuild-17/AGENT_C_RESEARCH.md
```

각 memo 필수 항목:
1. 현재 화면이 왜 prototype처럼 보이는가
2. stage별 가장 큰 시각적 문제 5개 이상
3. 참고자료에서 실제 적용 가능한 원칙
4. **활용 가능 범위**
5. **활용처**
6. **바로 적용할 부분**
7. **POC 후 적용할 부분**
8. 적용하지 않을 부분 + 이유
9. 구체적인 코드/파일 제안
10. 예상 성능 위험

---

# 5. Reference — 실제로 읽고 코드와 연결할 것

## A. BUFATECHNO Web Game Dev

Repo:
`https://github.com/bufatechno/bufatechno-webgamedev`

최소 실제 읽을 파일:
- `SKILL.md`
- `references/design-system.md`
- `references/2d-drawing-textures.md`
- `references/animation-system.md`
- `references/asset-pipeline.md`
- `references/audio-ui-systems.md`
- `references/performance-optimization.md`

참고 핵심:
- shipped game 수준의 coherent visuals
- stage-specific palette / lighting / material
- foreground / gameplay / background depth
- procedural textures / surface detail
- environmental animation
- coherent VFX
- performance budget
- generic AI-slop/template feel 제거

## B. pokemonlive

Repo:
`https://github.com/xflare-bot/pokemonlive`

참고 핵심:

> Rules engine owns the outcome. Presentation owns the spectacle.

적용:
- 기존 deterministic state/progression 유지
- presentation event가 카메라/VFX/particle/animation만 담당
- 연출 실패가 progression을 막지 않음
- discovery/reward 순간에 시각적 signature 제공
- continuity / fallback 사고방식

Pokémon 캐릭터/IP/아트 스타일은 절대 복제하지 않는다.

## C. fal H3 Max

- `https://fal.ai/models/minimax/h3-max/image-to-video`
- `https://fal.ai/models/minimax/h3-max/reference-to-video`

이번 작업은 **reference/미래 POC 아이디어만** 사용한다.
실제 API 호출 금지.
API key 금지.
게임 runtime dependency 금지.

---

# 6. Orchestrator Blueprint — 코딩 전 필수 gate

3개 research memo가 나온 뒤 Orchestrator는 아래 파일을 작성한다.

`jungle-web-canvas-poc/docs/visual-rebuild-17/VISUAL_REBUILD_BLUEPRINT_17.md`

이 문서가 없으면 구현 시작 금지.

필수 내용:

## Global visual grammar
- 공통 palette 원칙
- lighting 원칙
- material/surface 원칙
- foreground/midground/background 구조
- prop density 원칙
- ambient animation 원칙
- camera/presentation 원칙
- tablet readability 원칙
- 성능 budget

## Stage identity table

각 stage마다:
- 한 문장 fantasy
- hero landmark
- 주 색상 3~5개
- foreground 요소
- midground 요소
- background 요소
- 최소 2개 ambient motion
- discovery signature
- reward signature
- interactive target readability

---

# 7. Visual Quality Gate — 이전 실패 반복 금지

PROMPT 13처럼 아래 정도로 끝내면 FAIL:
- particle count 증가
- directional light 하나 추가
- radial gradient 몇 개
- 단순한 cone/mountain 몇 개
- camera punch만 추가
- static foreground silhouette 몇 개

이번에는 **scene composition 자체**가 바뀌어야 한다.

## 모든 stage 공통 최소 기준

1280×800 대표 gameplay screenshot 기준:

1. **3 depth layers가 육안으로 분리**
   - foreground
   - playable midground
   - background

2. **hero landmark가 존재**
   - screenshot에서 stage identity의 중심이 되는 큰 시각 요소

3. **환경 prop cluster 최소 8개 이상**
   예:
   - tree/fern cluster
   - rock/moss cluster
   - crate/rope/lantern cluster
   - crystal cluster
   - root/mushroom cluster
   - cloud/mountain cluster

   단순 particle는 prop cluster로 계산하지 않는다.

4. **large flat-color area 최소화**
   - 넓은 단색 평지/벽/하늘을 그대로 두지 않는다.
   - gradient/material texture/shadow/detail/terrain breakup으로 분해한다.

5. **ambient motion 최소 2종**
   - 서로 다른 목적을 가진 motion이어야 한다.

6. **foreground framing**
   - 화면 가장자리에서 깊이를 만들되 player/HUD/path를 가리지 않는다.

7. **play path readability**
   - 장식 때문에 길/상호작용 대상이 안 보이면 FAIL.

8. **distinct silhouette**
   - HUD를 가려도 Camp/Waterfall/Cave/GiantTree/SkyRidge를 구분할 수 있어야 한다.

---

# 8. Agent A 구체 작업 — Camp / Waterfall / Hub

## Camp — "살아있는 정글 베이스캠프"

현재 문제:
- 넓은 단색 초록 바닥
- 단순 house/road/tree 도형
- 숲 밀도 부족
- 생활감 없음

필수 rebuild:
- canopy/큰 나무 trunk로 화면 frame
- 길 가장자리 fern/grass/leaf cluster 대폭 증가
- hut에 rope/crate/lantern/sign/tool/footprint 생활감
- 바닥에 patchy grass/soil/leaf litter/stone breakup
- shadow/dappled light
- 적어도 1개 작은 ambient wildlife actor
- 길의 geometry는 그대로 유지하되 visual edge를 풍부하게
- Bluebird/clue target은 배경에서 확실히 읽히게

**완료 screenshot이 지금의 단순 초록 평지로 보이면 FAIL.**

## Waterfall — "물·안개·젖은 바위"

PROMPT 13의 "이미 충분히 rich라서 no changes" 접근 금지.

필수:
- waterfall 자체가 가장 강한 hero landmark
- 물줄기/foam/spray/ripple
- mist depth layer
- wet rock highlight/material variation
- river edge vegetation
- foreground leaves/rocks
- water reflection/highlight
- Kingfisher discovery cyan/splash signature

## Hub — "메뉴"가 아닌 "탐험 지도"

단순 card list hover만으로 완료 금지.

필수:
- 5개 지역의 visual identity가 지도/섬/지역 형태로 느껴질 것
- 각 지역 상태 locked/unlocked/completed를 시각적으로 명확히
- badge 0→5 성장
- 최종 5/5 completion moment
- 기존 link/unlock logic 유지

---

# 9. Agent B 구체 작업 — Cave / Giant Tree

## Cave — "어둠 속 반딧불·수정 동굴"

필수:
- 큰 rock wall/ceiling/floor 형태로 실제 동굴 공간감
- 가까운 foreground rock occluder
- 깊은 배경 rock silhouette
- crystal landmark cluster
- glow/reflection/rim light
- firefly cluster
- dust만으로 ambient를 채우지 않는다.
- route는 7세가 읽을 수 있게 밝기 contrast 확보

## Giant Tree — "거대한 나무 자체를 탐험"

필수:
- trunk/root가 player보다 압도적으로 크게 보이게
- giant root layers
- bark surface variation
- moss/mushroom/vine/branch detail
- canopy depth
- dapple/light shaft
- falling leaf/seed/pollen 중 2종 이상
- Squirrel route 주변 시각 cue

단순 원기둥/평면 나무 + particle이면 FAIL.

---

# 10. Agent C 구체 작업 — Sky Ridge / Shared Presentation

## Sky Ridge — "높이·바람·절벽"

필수:
- 가까운 ridge/cliff edge
- 중경 path/rock/grass
- 먼 mountain layers 최소 3 distance band
- cloud layers
- atmospheric perspective/fog
- directionality가 있는 wind motion
- 아래로 떨어지는 공간감을 느낄 수 있는 composition
- Hawk discovery sky/light/wind signature

## Shared presentation

가능하면 낮은 coupling의 helper 구축:

```text
PresentationEvent
  type
  stage
  subject
  result
  seed
```

예:
- clueFound
- quizStart
- discovery
- reward

Rules engine은 그대로 두고 presentation만 listen.

연출 실패 시 gameplay는 항상 계속 가능해야 한다.

---

# 11. Agent Handoff / Cross Review

각 sub-agent는 구현 후 반드시 handoff 문서를 작성한다.

```text
docs/visual-rebuild-17/AGENT_A_HANDOFF.md
docs/visual-rebuild-17/AGENT_B_HANDOFF.md
docs/visual-rebuild-17/AGENT_C_HANDOFF.md
```

필수:
- branch/commit SHA
- modified files
- 구현한 visual beats
- before screenshot paths
- after screenshot paths
- 성능 영향
- known issues
- 건드리지 않은 gameplay contract

그 다음 cross-review:
- A → B 결과 review
- B → C 결과 review
- C → A 결과 review

review 문서:

```text
docs/visual-rebuild-17/REVIEW_A_OF_B.md
docs/visual-rebuild-17/REVIEW_B_OF_C.md
docs/visual-rebuild-17/REVIEW_C_OF_A.md
```

review는 최소:
- visual depth
- stage identity
- prop density
- gameplay readability
- performance risk
- reference 실제 적용 여부

각 review에서 BLOCKER가 나오면 integration 전에 수정한다.

---

# 12. Integration 규칙

Orchestrator는 각 agent commit을 읽고 diff를 검토한 뒤 integration branch에 반영한다.

필수:
- shared helper conflict 직접 해결
- 중복 구현 제거
- stage별 palette/quality 편차 정리
- imports/runtime errors 제거
- agent가 gameplay state를 바꾼 부분이 없는지 diff audit

Integration 단계에서 visual 이유로 다음 변경 금지:
- collision geometry
- interact coordinates
- player spawn
- quiz answer
- stage completion condition
- reward ID
- storage key
- Hub unlock rule

---

# 13. Headed Chrome Visual Acceptance

신규/개선 QA script:

`jungle-web-canvas-poc/tools/browser/jungle_visual_rebuild_17_qa.mjs`

반드시:

```js
chromium.launch({ channel: "chrome", headless: false })
```

## Run V1 — Desktop before/after

1280×800.

Hub + 5 stages 각각 최소:
- before representative view
- after same/similar representative view
- hero landmark view
- foreground depth view
- ambient motion evidence view
- interaction/discovery/reward view

최소 **72 screenshots**.

Artifacts:

`jungle-web-canvas-poc/artifacts/jungle-visual-rebuild-17/`

## Run V2 — Stage identity

각 stage에서 HUD/modal을 숨긴 screenshot을 별도로 캡처.

REPORT에 각 screenshot이 왜 해당 stage로 구분되는지 visual cue를 설명.

## Run V3 — Empty-space audit

Camp 포함 모든 stage에서 1280×800 screenshot을 검토.

FAIL 예:
- 화면 절반 이상이 featureless flat green/gray/brown
- 몇 개 단순 도형만 띄엄띄엄 존재
- foreground/background가 사실상 없음

## Run V4 — Ambient observation

각 stage 8초 이상 관찰.

Expected:
- 최소 2종 ambient motion
- stuck/flicker 없음
- uncontrolled particle explosion 없음
- resize 후 animation loop 중복 없음

## Run V5 — Tablet

800×1280 hasTouch=true.

검증:
- D-pad/A/B 안 가림
- foreground가 HUD/player 가리지 않음
- modal clipping 없음
- portrait→landscape→portrait 정상
- blank canvas 없음

## Run V6 — Functional regression

최소:
- stage load all 5
- interaction modal
- reward presentation
- Hub load
- PROMPT 16 관련 random quiz flow가 visual 변경 때문에 깨지지 않음

기존 full-adventure QA가 실행 가능하면 반드시 재실행.

---

# 14. Performance Gate

각 stage에서 baseline과 rebuilt 버전을 비교한다.

기록:
- render calls
- triangles/objects 가능하면
- average/median frame time
- p95 frame time
- long task count 가능하면
- JS heap snapshot 가능하면

완료 기준:
- 눈에 띄는 stutter/freeze 없음
- baseline 대비 심각한 frame-time regression 없음
- particle/object가 매 frame 무한 증가하지 않음
- resize/scene transition 뒤 duplicate loop 없음
- reusable/pool/instancing 적용 가능한 곳 우선

시각 향상을 이유로 성능 폭락을 정당화하면 FAIL.

---

# 15. Test / Error Gate

Integration 후:

```bash
node --test
git diff --check
```

Expected:
- 기존 전체 tests fail 0
- 최소 현재 221 수준 이상 유지 (PROMPT16 dirty work가 아직 미통합이면 현재 branch 기준 테스트 수를 정확히 기록)
- pageerror 0
- gameplay console.error 0

기존 vendor GLB 404는 별도 카운트하고 숨기지 않는다.
새 404는 0.

---

# 16. Visual Final 판정 방식

Agent가 스스로 `VISUAL FINAL PASS`를 선언하면 안 된다.

Agent가 선언할 수 있는 것은:

```text
TECHNICAL PASS
VISUAL STATUS: READY_FOR_USER_REVIEW
```

이유:
시각 품질은 이전 PROMPT 13에서 자동 QA가 PASS였지만 실제 사용자가 보기에 개선이 부족했다.

따라서 이번에는:
- 기술적 안정성은 agent가 PASS/FAIL 판단
- 시각적 최종 합격은 before/after screenshot evidence를 사용자가 보고 확정

---

# 17. 명확한 FAIL 조건

다음 중 하나라도 있으면 FAIL:

1. opencode-free 이외 모델 사용
2. free quota 부족을 paid fallback으로 해결
3. PROMPT 13처럼 particles/light/gradient만 늘림
4. Camp가 여전히 넓은 단색 초록 평지처럼 보임
5. Waterfall을 "이미 충분함"이라며 거의 안 고침
6. Hub가 단순 card hover 수준에 머무름
7. Cave/GiantTree/Sky가 단순 primitive 몇 개 추가 수준
8. reference를 문서에만 적고 코드/화면 변화와 연결하지 못함
9. gameplay geometry/progression을 visual 이유로 변경
10. user dirty PROMPT16 작업 손실
11. pageerror/gameplay console.error 신규 발생
12. tablet에서 foreground/HUD overlap
13. agent가 screenshot evidence 없이 "더 예뻐졌다"고 주장
14. agent가 Visual Final PASS를 셀프 승인

---

# 18. Deliverables

필수 산출물:

## Docs
- `docs/visual-rebuild-17/AGENT_A_RESEARCH.md`
- `docs/visual-rebuild-17/AGENT_B_RESEARCH.md`
- `docs/visual-rebuild-17/AGENT_C_RESEARCH.md`
- `docs/visual-rebuild-17/VISUAL_REBUILD_BLUEPRINT_17.md`
- `docs/visual-rebuild-17/AGENT_A_HANDOFF.md`
- `docs/visual-rebuild-17/AGENT_B_HANDOFF.md`
- `docs/visual-rebuild-17/AGENT_C_HANDOFF.md`
- 3 cross-review docs

## Code
- stage visual source changes
- 필요한 공통 visual/presentation helper
- QA script

## Evidence
- `artifacts/jungle-visual-rebuild-17/`
- before/after 포함 최소 72 screenshots
- 가능하면 short video clips 또는 GIF는 선택

## Final report

`jungle-web-canvas-poc/.agent/REPORT_JUNGLE_MULTI_AGENT_VISUAL_REBUILD_17.md`

필수 내용:
- START HEAD
- FINAL FUNCTIONAL HEAD
- 정확한 OpenCode free model ID/role/session 표
- agent별 branch/commit
- research 적용 matrix
- stage별 before/after 설명
- 변경 파일
- stage별 visual beats
- cross-review 결과/수정 내역
- performance baseline/after
- desktop/tablet 결과
- screenshot index
- node --test
- git diff --check
- error/404 count
- gameplay contract 보존 확인
- remaining visual debt
- `TECHNICAL PASS/FAIL`
- `VISUAL STATUS: READY_FOR_USER_REVIEW`

---

# 19. 최종 Git 전달

Sub-agent commit → cross-review → integration → QA → REPORT 순서로 진행한다.

최종적으로:
- integration commit을 `prototype/jungle-web-canvas-poc`에 안전하게 push
- 작업 중 remote가 이동했다면 fetch/rebase/cherry-pick 등 안전한 방식으로 통합
- force push 금지
- unrelated dirty 변경 commit 금지

REPORT의 FINAL FUNCTIONAL HEAD는 실제 기능 commit SHA를 기록하고, REPORT finalize commit이 별도면 둘 다 명시한다.

사용자에게는 완료 시 아래만 보고한다.

```text
FINAL SHA:
Agent models/roles:
Technical QA:
Screenshot count:
Visual status: READY_FOR_USER_REVIEW
```
