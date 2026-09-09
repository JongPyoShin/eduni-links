# PROMPT_JUNGLE_MULTI_AGENT_VISUAL_REBUILD_17

## Mission
PROMPT 13의 시각 개선 결과는 **최종 시각 품질 기준에서 FAIL**로 간주한다.
현재 정글 어드벤처는 기능/진행은 존재하지만, 실제 플레이 화면은 넓은 단색 면·단순 primitive·낮은 환경 밀도 때문에 여전히 프로토타입처럼 보인다.

이번 작업의 목표는 **OpenCode Free 모델만으로 1 Main Orchestrator + 3 Sub-agent 협업 구조**를 구성하여 Camp / Waterfall / Cave / Giant Tree / Sky Ridge / Hub를 실제 게임 월드처럼 느껴질 수준으로 재설계하는 것이다.

핵심 원칙:

> Rules engine owns the outcome. Presentation owns the spectacle.

게임 진행/퀴즈/보상/저장/충돌/상호작용 좌표는 보존하고, 월드 구성·환경 밀도·재질·조명·랜드마크·전경/중경/배경·ambient animation·발견/보상 연출을 크게 강화한다.

이번 작업은 `particle 몇 개 + light 몇 개 + gradient 몇 개` 추가로 끝내면 FAIL이다.
**스크린샷만 봐도 이전/이후 차이가 즉시 보여야 하고, HUD를 가려도 5개 stage를 구분할 수 있어야 한다.**

---

# 0. 실행 환경 절대 제한 — OpenCode Free ONLY / Codex 사용 금지

이번 작업은 **OpenCode만 사용한다. Codex는 어떤 형태로도 사용하지 않는다.**

## 절대 금지
- Codex CLI
- ChatGPT Codex / Codex Remote
- Codex agent / Codex sub-agent
- `.codex` 설정/세션을 이용한 실행
- OpenAI paid model
- Claude paid model
- Gemini paid model
- DeepSeek paid API
- fal 유료 inference
- 자동 paid fallback
- free quota 소진 시 유료 provider로 전환
- OpenCode가 아닌 외부 coding agent가 대신 구현/리뷰/QA

**Codex를 병행 실행하거나 보조 reviewer로 사용하는 것도 FAIL이다.**

OpenCode 시작 시 실제 model list를 확인하고 아래 4개 ID가 현재 사용 가능한지 기록한다.
하나라도 없거나 free가 아니면 임의 대체하지 말고 `BLOCKED_MODEL_AVAILABILITY`로 보고한다.

## 고정 모델 배정

```text
Main  : opencode-free/big-pickle
Sub A : opencode-free/deepseek-v4-flash-free
Sub B : opencode-free/mimo-v2.5-free
Sub C : opencode-free/nemotron-3-ultra-free
```

모델을 임의로 MiniMax M3, paid DeepSeek, Claude, GPT, Gemini 등으로 바꾸지 않는다.

## 역할 고정

| Role | Model ID | 역할 |
|---|---|---|
| Main O | `opencode-free/big-pickle` | Orchestrator / Integrator / Blueprint / 최종 기술 QA |
| Sub A | `opencode-free/deepseek-v4-flash-free` | Cave + Giant Tree / 구조적 코드 리뷰 |
| Sub B | `opencode-free/mimo-v2.5-free` | Camp + Waterfall + Hub / 2D world·UX visual |
| Sub C | `opencode-free/nemotron-3-ultra-free` | Sky Ridge + shared presentation + performance/QA |

Main은 오케스트레이션과 통합을 우선하며, 처음부터 혼자 전체 코드를 구현하지 않는다.
3개 Sub-agent 모두 실질적인 독립 작업과 commit을 남겨야 한다.

REPORT에는 다음을 반드시 남긴다.

| Role | Exact Model ID | free 확인 방법/출력 | Session | Branch | 담당 | Commit |
|---|---|---|---|---|---|---|

Codex 사용 여부도 명시한다.

```text
Codex used: NO
OpenCode-only execution: YES
Paid fallback used: NO
```

---

# 1. Git / dirty workspace 보호

기준 branch:

`prototype/jungle-web-canvas-poc`

작업 시작 시 반드시:

```bash
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
git fetch origin prototype/jungle-web-canvas-poc
git log -5 --oneline --decorate
```

현재 root workspace에는 PROMPT 16 관련 미완료 dirty 변경이 남아 있을 수 있다.
예:
- `src/game.js` 랜덤 퀴즈 flow fix
- `tools/browser/jungle_random_quiz_real_acceptance_qa.mjs`
- PROMPT 16 REPORT

절대 금지:
- `git reset --hard`
- `git clean -fd`
- force push
- 사용자 dirty 파일 덮어쓰기
- unrelated 변경을 함께 commit
- 사용자 변경을 임의 stash/pop/commit

root가 dirty라면 그 root에서 visual rebuild를 하지 않는다.
최신 원격 기준으로 **별도 worktree/agent branch**를 만든다.

---

# 2. Multi-Agent / Worktree 구성

동시에 최대 4 thread를 사용한다.

권장 branch/worktree:

```text
agent/vr17-deepseek-cave-tree
agent/vr17-mimo-camp-waterfall-hub
agent/vr17-nemotron-sky-shared
agent/vr17-big-pickle-integration
```

규칙:
- 각 writer agent는 자기 branch/worktree만 수정.
- 같은 파일을 두 writer가 동시에 수정하지 않는다.
- Sub-agent는 `prototype/jungle-web-canvas-poc`를 직접 push하지 않는다.
- Main O만 diff/handoff/review 후 integration branch에 반영한다.
- shared helper ownership은 기본적으로 Sub C, 충돌 시 Main O가 결정.
- remote branch가 이동하면 fetch 후 안전하게 rebase/cherry-pick/merge한다.
- force push 금지.

commit 예:

```text
vr17(deepseek): rebuild cave and giant tree worlds
vr17(mimo): rebuild camp waterfall and hub worlds
vr17(nemotron): rebuild sky ridge and presentation system
vr17(big-pickle): integrate visual rebuild and QA
```

---

# 3. Phase A — 코딩 전에 각 Sub-agent가 현재 화면을 비판적으로 분석

3개 Sub-agent는 코드 수정 전에 자신의 stage를 **실제 browser로 열어 현재 screenshot을 캡처**하고 문제를 분석한다.

최소 확인:
- PROMPT 13
- PROMPT 13 REPORT
- `docs/VISUAL_REFERENCES.md`
- 현재 visual source files
- 현재 1280×800 대표 gameplay view
- tablet 800×1280 view

작성:

```text
docs/visual-rebuild-17/AGENT_A_DEEPSEEK_RESEARCH.md
docs/visual-rebuild-17/AGENT_B_MIMO_RESEARCH.md
docs/visual-rebuild-17/AGENT_C_NEMOTRON_RESEARCH.md
```

각 memo 필수:
1. 현재 화면이 prototype처럼 보이는 이유
2. 담당 stage별 시각 문제 최소 5개
3. reference에서 실제 적용 가능한 원칙
4. **활용 가능 범위**
5. **활용처**
6. **바로 적용할 부분**
7. **POC 후 적용할 부분**
8. 적용하지 않을 부분과 이유
9. 구체적인 파일/코드 제안
10. 예상 성능 위험
11. before screenshot path

---

# 4. Reference — 반드시 실제로 읽고 화면/코드와 연결

## A. BUFATECHNO Web Game Dev

Repo:
`https://github.com/bufatechno/bufatechno-webgamedev`

최소 확인:
- `SKILL.md`
- `references/design-system.md`
- `references/2d-drawing-textures.md`
- `references/animation-system.md`
- `references/asset-pipeline.md`
- `references/audio-ui-systems.md`
- `references/performance-optimization.md`

적용 핵심:
- shipped game 수준의 coherent visuals
- stage-specific palette / lighting / material
- foreground / gameplay / background depth
- procedural surface detail
- environmental animation
- coherent VFX
- performance budget
- generic template/AI-slop 느낌 제거

## B. pokemonlive

Repo:
`https://github.com/xflare-bot/pokemonlive`

참고 원칙:

> Rules engine owns the outcome. Presentation owns the spectacle.

적용:
- deterministic gameplay state는 기존 코드가 소유
- presentation event는 camera/VFX/particle/animation만 담당
- presentation 실패가 progression을 막지 않음
- discovery/reward 순간 stage별 visual signature
- continuity/fallback 사고방식

Pokémon IP/캐릭터/asset/style 복제 금지.

## C. fal H3 Max

- `https://fal.ai/models/minimax/h3-max/image-to-video`
- `https://fal.ai/models/minimax/h3-max/reference-to-video`

이번 작업에서는 미래 POC 아이디어만 참고한다.
실제 API 호출/키/runtime dependency 금지.

Reference는 문서에 이름만 적으면 인정하지 않는다.
REPORT의 research matrix에서 **어떤 원칙이 어떤 코드/화면 변화로 연결됐는지** 증명한다.

---

# 5. Main O Blueprint Gate — 구현 전 필수

3개 research memo가 완료되면 Main O (`big-pickle`)가 통합 blueprint를 만든다.

`docs/visual-rebuild-17/VISUAL_REBUILD_BLUEPRINT_17.md`

이 문서가 없으면 implementation phase 시작 금지.

필수:

## Global visual grammar
- palette
- lighting direction/color
- surface/material
- foreground / midground / background
- prop density
- ambient motion
- hero landmark
- discovery/reward presentation
- tablet readability
- performance budget

## Stage identity table

각 stage마다:
- 한 문장 fantasy
- hero landmark
- palette 3~5색
- foreground 요소
- playable midground 요소
- background 요소
- prop cluster 계획
- ambient motion 2종 이상
- discovery signature
- reward signature
- interactive target readability

Main O가 Blueprint에서 각 Sub-agent의 작업 경계를 확정한 후에만 코드 수정한다.

---

# 6. Visual Quality Gate — PROMPT 13 실패 반복 금지

다음만 추가하고 완료 처리하면 FAIL:
- particle 수 증가
- directional light 한두 개
- radial gradient 몇 개
- primitive cone/mountain 몇 개
- camera punch만 추가
- static foreground silhouette 몇 개

**scene composition 자체가 달라져야 한다.**

모든 stage 공통 최소 조건:

1. 1280×800에서 foreground / playable midground / background 3 layer가 육안으로 분리.
2. screenshot의 중심이 되는 hero landmark 존재.
3. 환경 prop cluster 최소 8개 이상.
4. 큰 flat-color surface를 texture/gradient/shadow/terrain breakup/detail로 분해.
5. 서로 다른 목적의 ambient motion 최소 2종.
6. foreground framing이 depth를 만들지만 player/HUD/path는 가리지 않음.
7. 장식 후에도 이동 경로/상호작용 target 읽힘.
8. HUD 없이 stage silhouette를 구분 가능.
9. before/after가 작은 디테일 차이가 아니라 즉각적으로 다른 화면이어야 함.

Particle는 prop cluster로 계산하지 않는다.

---

# 7. Sub B — MiMo: Camp / Waterfall / Hub

Model: `opencode-free/mimo-v2.5-free`

## Camp — 살아있는 정글 베이스캠프

현재 대표 문제:
- 넓은 단색 초록 바닥
- 단순 house/road/tree 도형
- 빈 공간 과다
- 숲/생활감/깊이 부족

필수 rebuild:
- canopy + large trunk framing
- 길 가장자리 fern/grass/leaf cluster 밀도 증가
- hut 주변 rope/crate/lantern/sign/tool/footprint
- patchy grass/soil/leaf litter/stone breakup
- dappled shadow/light
- 작은 ambient wildlife actor 최소 1종
- background jungle depth
- Bluebird/clue target contrast

**현재 사용자가 지적한 단순 초록 평지 인상이 남으면 FAIL.**

## Waterfall — 물·안개·젖은 바위

`이미 충분히 rich` 판단 금지.

필수:
- waterfall hero landmark
- water motion / foam / spray / ripple
- mist depth
- wet rock material variation
- river-edge vegetation
- foreground leaves/rocks
- reflection/highlight
- Kingfisher cyan/splash signature

기존 path/collision/stepping-stone geometry 변경 금지.

## Hub — 탐험 지도

card hover만 추가하고 완료 금지.

필수:
- 5개 지역이 지도/섬/지역으로 느껴지는 composition
- 각 region visual identity
- locked/unlocked/completed 즉시 구분
- badge 0→5 progress growth
- final 5/5 completion moment
- 기존 link/unlock logic 보존

---

# 8. Sub A — DeepSeek: Cave / Giant Tree

Model: `opencode-free/deepseek-v4-flash-free`

## Cave — 어둠 속 반딧불·수정 동굴

필수:
- rock wall/ceiling/floor로 실제 cave enclosure
- 가까운 foreground rock occluder
- 깊은 background rock silhouette
- crystal landmark cluster
- glow/reflection/rim light
- firefly cluster
- drip/reflection/glow 등 dust와 다른 ambient motion
- 7세가 route를 읽을 수 있는 contrast

Dust particle만 늘리면 FAIL.

## Giant Tree — 거대한 나무 자체를 탐험

필수:
- trunk/root scale가 player보다 압도적
- giant root foreground/midground layers
- bark surface variation
- moss/mushroom/vine/branch detail
- canopy depth
- dapple/light shaft
- falling leaf/seed/pollen 중 2종 이상
- Squirrel route cues

primitive cylinder/plane + particle 수준이면 FAIL.

## DeepSeek 구조 리뷰 역할

자기 구현 후 Sub B/C diff를 read-only review하여 다음을 확인:
- gameplay contract 변경 여부
- visual helper coupling
- redundant animation loop
- unbounded allocation
- stage identity/prop density 부족

---

# 9. Sub C — Nemotron: Sky Ridge / Shared Presentation / Performance

Model: `opencode-free/nemotron-3-ultra-free`

## Sky Ridge — 높이·바람·절벽

필수:
- 가까운 ridge/cliff edge
- 중경 path/rock/grass
- 먼 mountain 최소 3 distance band
- cloud layer
- atmospheric perspective/fog
- 방향성이 느껴지는 wind motion
- 아래로 떨어지는 공간감
- Hawk discovery sky/light/wind signature

단순 cone mountain 4개 추가 수준이면 FAIL.

## Shared presentation

낮은 coupling helper를 우선 검토:

```text
PresentationEvent
  type
  stage
  subject
  result
  seed
```

후보 event:
- clueFound
- quizStart
- discovery
- reward

Rules engine은 그대로 두고 presentation만 반응한다.
presentation 실패 시 gameplay는 계속 가능해야 한다.

## Performance ownership

Sub C가 공통으로 확인:
- particle/object pool/reuse
- duplicate rAF loop
- resize 이후 loop 중복
- stage transition leak
- per-frame allocation 증가
- tablet frame-time 위험

---

# 10. Handoff / Cross Review

각 Sub-agent는 구현 후 handoff 작성:

```text
docs/visual-rebuild-17/AGENT_A_DEEPSEEK_HANDOFF.md
docs/visual-rebuild-17/AGENT_B_MIMO_HANDOFF.md
docs/visual-rebuild-17/AGENT_C_NEMOTRON_HANDOFF.md
```

필수:
- exact model ID
- branch
- commit SHA
- modified files
- visual beats
- before/after screenshot paths
- 성능 영향
- known issues
- 건드리지 않은 gameplay contract

Cross-review:

```text
DeepSeek → MiMo 결과 review
MiMo → Nemotron 결과 review
Nemotron → DeepSeek 결과 review
```

작성:

```text
docs/visual-rebuild-17/REVIEW_DEEPSEEK_OF_MIMO.md
docs/visual-rebuild-17/REVIEW_MIMO_OF_NEMOTRON.md
docs/visual-rebuild-17/REVIEW_NEMOTRON_OF_DEEPSEEK.md
```

각 review 최소:
- visual depth
- stage identity
- prop density
- gameplay readability
- performance risk
- reference 실제 적용 여부
- BLOCKER 여부

BLOCKER는 integration 전에 수정.

---

# 11. Main O Integration

Main O (`opencode-free/big-pickle`)는 각 Sub commit/handoff/review를 읽고 integration branch에 반영한다.

필수:
- shared helper conflict 해결
- duplicate helper/animation 제거
- palette/quality 편차 정리
- import/runtime error 제거
- gameplay state diff audit
- visual blueprint 충족 여부 audit

시각 이유로 변경 금지:
- collision geometry
- interact coordinates
- player spawn
- quiz answer
- stage completion condition
- reward ID
- storage key
- Hub unlock rule

Main O가 sub-agent 결과를 그대로 합치기만 하면 안 된다.
최종 화면의 일관성과 품질을 책임지고 integration audit를 수행한다.

---

# 12. Headed Google Chrome Visual Acceptance

QA script:

`tools/browser/jungle_visual_rebuild_17_qa.mjs`

반드시 실제 Google Chrome headed mode:

```js
chromium.launch({ channel: "chrome", headless: false })
```

## Run V1 — Desktop before/after

1280×800, Hub + 5 stage 각각:
- before representative
- after representative
- hero landmark
- foreground depth
- ambient motion evidence
- interaction/discovery/reward

Artifacts:

`artifacts/jungle-visual-rebuild-17/`

최소 **72 screenshots**.

## Run V2 — Stage identity

HUD/modal을 숨긴 representative screenshot을 stage별 캡처.
각 screenshot에서 해당 stage를 구분하는 visual cue를 REPORT에 설명.

## Run V3 — Empty-space audit

FAIL 예:
- 화면 절반 이상 featureless flat green/gray/brown
- primitive 몇 개만 넓게 흩어짐
- foreground/background가 사실상 없음
- hero landmark가 없음

## Run V4 — Ambient observation

각 stage 최소 8초 관찰.

Expected:
- 최소 2 ambient motion
- stuck/flicker 없음
- uncontrolled particle explosion 없음
- resize 후 duplicate animation loop 없음

## Run V5 — Tablet

800×1280, `hasTouch:true`.

검증:
- D-pad/A/B 가림 없음
- foreground가 player/HUD를 막지 않음
- modal clipping 없음
- portrait → landscape → portrait
- blank canvas 없음

## Run V6 — Functional regression

최소:
- 5 stage load
- interaction modal
- reward presentation
- Hub load
- random quiz flow 유지

PROMPT 16 full-adventure QA가 실행 가능한 상태라면 함께 재실행한다.
단 **Codex로 QA를 실행하거나 보조 분석하지 않는다.**

---

# 13. Performance / Error Gate

각 stage baseline vs rebuilt 기록 가능한 만큼 측정:
- render calls
- triangles/objects
- avg/median frame time
- p95 frame time
- long task count
- JS heap

완료 기준:
- 눈에 띄는 stutter/freeze 없음
- 심각한 frame-time regression 없음
- particle/object 무한 증가 없음
- resize/transition 후 duplicate loop 없음
- reusable/pooling/instancing 우선

Integration 후:

```bash
node --test
git diff --check
```

Expected:
- 전체 tests fail 0
- 기존 테스트 수 감소 금지
- pageerror 0
- gameplay console.error 0
- vendor GLB 404는 별도 기록, 숨기지 않음
- new 404 = 0

---

# 14. Visual 최종 판정

Agent는 `VISUAL FINAL PASS`를 스스로 선언하지 않는다.

Agent가 선언 가능한 상태:

```text
TECHNICAL PASS
VISUAL STATUS: READY_FOR_USER_REVIEW
```

시각 품질은 사용자가 before/after screenshot을 보고 최종 승인한다.
PROMPT 13처럼 자동 QA PASS만으로 시각 PASS 처리하지 않는다.

---

# 15. 명확한 FAIL 조건

다음 중 하나라도 있으면 FAIL:

1. Codex 사용 흔적 존재
2. 지정된 OpenCode Free 4개 모델 외 모델로 임의 대체
3. paid fallback/API 사용
4. 3 Sub-agent 중 하나가 실질 작업/commit 없이 형식적으로만 참여
5. particles/light/gradient만 늘리고 scene composition이 그대로
6. Camp가 여전히 넓은 단색 초록 평지처럼 보임
7. Waterfall을 거의 수정하지 않음
8. Hub가 card hover 수준
9. Cave/GiantTree/Sky가 primitive 몇 개 추가 수준
10. reference를 문서에만 적고 코드/화면 변화와 연결하지 못함
11. gameplay geometry/progression을 visual 이유로 변경
12. 사용자 dirty PROMPT16 작업 손실
13. pageerror/gameplay console.error 신규 발생
14. tablet HUD/player 가림
15. screenshot evidence 없이 시각 개선 주장
16. agent가 Visual Final PASS 셀프 승인

---

# 16. Deliverables

## Research / Blueprint
- `docs/visual-rebuild-17/AGENT_A_DEEPSEEK_RESEARCH.md`
- `docs/visual-rebuild-17/AGENT_B_MIMO_RESEARCH.md`
- `docs/visual-rebuild-17/AGENT_C_NEMOTRON_RESEARCH.md`
- `docs/visual-rebuild-17/VISUAL_REBUILD_BLUEPRINT_17.md`

## Handoff / Review
- `docs/visual-rebuild-17/AGENT_A_DEEPSEEK_HANDOFF.md`
- `docs/visual-rebuild-17/AGENT_B_MIMO_HANDOFF.md`
- `docs/visual-rebuild-17/AGENT_C_NEMOTRON_HANDOFF.md`
- `docs/visual-rebuild-17/REVIEW_DEEPSEEK_OF_MIMO.md`
- `docs/visual-rebuild-17/REVIEW_MIMO_OF_NEMOTRON.md`
- `docs/visual-rebuild-17/REVIEW_NEMOTRON_OF_DEEPSEEK.md`

## Code
- stage visual source changes
- 필요한 shared presentation/visual helper
- QA script

## Evidence
- `artifacts/jungle-visual-rebuild-17/`
- before/after 포함 72+ screenshots

## Final report

`jungle-web-canvas-poc/.agent/REPORT_JUNGLE_MULTI_AGENT_VISUAL_REBUILD_17.md`

필수:
- START HEAD
- FINAL FUNCTIONAL HEAD
- exact OpenCode model ID/role/session/branch/commit table
- `Codex used: NO`
- `OpenCode-only execution: YES`
- `Paid fallback used: NO`
- agent별 research/handoff/cross-review 요약
- reference 적용 matrix
- stage별 before/after
- stage별 visual beats
- changed files
- performance baseline/after
- desktop/tablet QA
- screenshot index
- `node --test`
- `git diff --check`
- error/404 count
- gameplay contract 보존
- remaining visual debt
- `TECHNICAL PASS/FAIL`
- `VISUAL STATUS: READY_FOR_USER_REVIEW`

---

# 17. 최종 Git 전달

순서:

```text
OpenCode Main O 시작
→ 3 OpenCode Free Sub-agent 병렬 research
→ Main O Blueprint
→ 3 worktree 병렬 구현
→ Handoff
→ Cross-review
→ Main O integration
→ headed Chrome QA
→ performance/regression
→ REPORT
→ commit/push
```

최종 integration을 `prototype/jungle-web-canvas-poc`에 안전하게 push한다.
remote가 이동했다면 fetch 후 안전하게 통합하고 force push는 하지 않는다.

사용자에게 완료 시 아래만 보고한다.

```text
FINAL SHA:
Main: opencode-free/big-pickle
Sub A: opencode-free/deepseek-v4-flash-free
Sub B: opencode-free/mimo-v2.5-free
Sub C: opencode-free/nemotron-3-ultra-free
Codex used: NO
Technical QA:
Screenshot count:
Visual status: READY_FOR_USER_REVIEW
```
