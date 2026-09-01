# PROMPT_JUNGLE_ADVENTURE_GAMEPLAY_01

## Mission

현재 Jungle Web Game은 기능적으로 퀴즈/도감이 존재하지만 실제 플레이에서는 **초기 시야 가림, 스테이지별 스케일 불일치, 탐험 중 할 일의 부재, 마지막에 갑자기 뜨는 시험형 퀴즈** 때문에 게임성이 약하다.

이번 작업은 단순 HUD 추가가 아니라 **아이에게 재미있는 탐험 → 단서 발견 → 짧은 문제 → 새 발견/포획 → 도감 등록** 루프로 재구성하는 작업이다.

관련 Issue: #59

## Source of truth / constraints

- 작업 브랜치: `prototype/jungle-web-canvas-poc`
- 현재 로컬에 Playable Core V1(새 3종 quiz/codex)이 미커밋 또는 원격보다 앞서 있으면 **절대 버리지 말고 그 상태를 기반으로 작업**한다.
- 시작 시 `git status --short`, `git rev-parse HEAD`, `git log -5 --oneline` 기록.
- reset/clean/checkout으로 사용자 변경 삭제 금지.
- Three.js production renderer와 logical X/Y gameplay authority 유지.
- geometry/gameplay 이동 경로는 꼭 필요한 경우 외에는 변경하지 않는다.
- `node --test`, `git diff --check`, 실제 browser QA 필수.

## Current observed defects

### A. Spawn / camera / foreground occlusion
사용자 실제 화면에서 시작 직후 캐릭터가 화면 하단 foreground/구조물에 가려져 보인다.

PASS 기준:
- 시작 후 0~3초 동안 player의 머리/몸/발이 모두 읽힌다.
- foreground tree/arch/foliage가 player를 20% 이상 가리지 않는다.
- 시작 지점에서 player가 화면 경계 또는 HUD에 붙지 않는다.
- 카메라가 첫 이동 방향과 첫 목표를 함께 보여준다.

해결 우선순위:
1. spawn 주변 foreground occluder 위치/scale 조정
2. camera initial framing 조정
3. 필요 시 player 근처 foreground opacity/culling

카메라를 확대해서 문제를 숨기지 마라.

### B. Stage scale consistency
Camp와 다른 stage에서 player/world/camera 비율이 달라 보인다.

공통 visual contract를 정하고 5 stage에 적용한다.

권장 기준:
- player screen-height occupancy: 약 12~16%
- 주요 path width: player body width의 약 1.8~2.6배
- 일반 tree/rock/prop scale은 stage identity를 해치지 않는 범위에서 공통 family 비율 유지
- interaction radius와 visual size가 심하게 어긋나지 않음
- camera height/distance/FOV 또는 orthographic framing을 stage별 임의값이 아니라 공통 baseline + 제한적 override로 관리

실제 현재 구현을 측정하고 공통 scale contract를 코드/문서에 남긴다.

## Core gameplay rework — Adventure Loop V2

현재 "마지막 새를 만나면 3문제 modal" 구조를 그대로 두지 않는다.

목표 루프:

`탐험 시작 → 시각/소리 힌트 → 단서 1 → 짧은 문제 → 단서 2 → 짧은 문제 → 단서 3 → 짧은 문제 → 새 발견 → 포획 판정 → 도감 등록 → 배지`

### 1. First 30 seconds

첫 30초 안에 반드시 다음을 경험해야 한다.

- 한 가지 현재 목표만 표시
- 멀리서 보이는 landmark 또는 bird cue
- 최소 1개 단서/상호작용
- 최소 1개의 짧은 문제 또는 관찰 선택

상시 거대 화살표/노란 tether 금지.

힌트 강도는 거리별로 바꾼다.

- 먼 거리: 새소리/작은 sparkle/perch contrast
- 중간 거리: 작은 pulse/feather/footprint cue
- 근거리: `A 살펴보기` contextual prompt

### 2. Questions become adventure beats

최종 encounter에서 3문제를 연속 시험처럼 띄우는 대신, **탐험 중 3개의 clue interaction에 문제를 1개씩 배치**한다.

Camp 예:
- Feather clue → 문제 1
- Footprints clue → 문제 2
- Birdcall clue → 문제 3
- Bluebird encounter → 누적 점수로 포획 판정

Waterfall/Sky Ridge도 기존 authored clue/minigame 위치를 활용해 동일 원칙을 적용한다.

질문은 기존 65문제 bank를 재사용하되:
- 4지선다 카드가 화면을 과도하게 가리지 않도록 compact presentation
- 가능하면 2~4개 큰 선택지
- 1문제는 5~10초 안에 끝나는 micro-learning
- 정답 후 바로 world로 복귀
- 오답은 정답/짧은 설명 후 계속 진행, game over 없음

포획 조건은 기존 `3문제 중 2개 이상 정답` 유지.

### 3. Capture result

새 encounter 시:
- 이미 clue 3문제를 모두 풀었으면 새 앞에서 다시 3문제를 반복하지 않는다.
- 점수 >= 2: 포획 성공 → codex → reward
- 점수 < 2: 새가 가까운 다른 perch로 이동하거나 `한 번 더 관찰하기` retry loop 제공
- 실패해도 reward/codex 등록 금지

재도전은 부족한 점수를 만회할 수 있는 1~2개 보충 문제 방식으로 단순화 가능.

### 4. Adventure elements

최소 다음 4가지를 실제 gameplay에 넣는다.

1. **Discovery clue trail**
   - feather / footprint / sound / sparkle 등 stage-specific clue
   - 가까워질수록 cue 강화

2. **Optional micro discovery**
   - main route에서 크게 벗어나지 않는 작은 숨은 반짝이/깃털/관찰 포인트 1~2개
   - 필수 진행을 막지 않음
   - 발견 시 작은 sparkle/chime만, 별도 복잡한 inventory는 만들지 않음

3. **Landmark arrival beat**
   - 주요 지점 도착 시 0.5~1.0초 visual/audio feedback
   - popup 남발 금지

4. **Contextual A action**
   - 평상시 A 버튼은 중립
   - 상호작용 범위에서 `A 살펴보기`, `A 단서 확인`, `A 새 관찰`처럼 의미가 바뀜

### 5. Thinking Orbs tech reference

`docs/기술집.md`의 thinking-orbs 기록을 참고한다.

이번 작업에서 full dependency/React 추가는 금지.
가능하면 작은 Canvas 기반 effect 또는 자체 경량 구현으로 다음 상태만 PoC:
- searching: 단서 접근
- listening: birdcall clue
- solving: 문제 선택 중
- shaping/composing: 포획 성공

이 효과는 decorative loader가 아니라 gameplay feedback으로만 사용한다.
성능/복잡도가 커지면 이번 slice에서는 생략하고 REPORT에 POC LATER로 기록한다.

## UI / HUD

- 게임 시작 시 player/world를 가리는 full-screen 안내 금지.
- objective는 상단 작은 mission chip 1개.
- codex 접근은 작은 `📖` 버튼 또는 메뉴 안에서 제공.
- quiz panel은 world context가 보이도록 최대한 compact하게.
- D-pad/A/B를 가리지 않는다.
- controller mode와 touch mode에서 중복 controls가 화면을 덮지 않게 한다.

## Stage priorities

이번 구현 우선순위:

### P0 — Camp 완성
Camp에서 위 Adventure Loop V2를 처음부터 끝까지 실제 browser play로 완성.

### P1 — Waterfall / Sky Ridge
Camp 구조를 공통 module로 재사용하여 bird stage 2개에 적용.

### P2 — Cave / Giant Tree
새 포획 stage가 아니므로 기존 관찰형 progression 유지하되 scale/initial framing/HUD consistency만 맞춘다.

## Tests

반드시 추가/수정:

- first clue가 시작 후 route 상에서 접근 가능
- clue 1/2/3 각각 quiz 1개와 연결
- clue quiz answer state 누적
- 2/3 이상 capture success
- 0~1/3 failure → no codex/reward
- final bird encounter에서 3-question modal이 중복으로 다시 열리지 않음
- retry path
- codex persistence 기존 테스트 유지
- 5-stage scale/framing contract 최소 static/contract test
- startup foreground/camera contract 가능하면 추가

전체 `node --test` PASS 필수.

## Browser QA

서버 8124에서 실제 확인한다.

### Camp
1. 새 세션 시작
2. 시작 시 player 가림 없음
3. 첫 화면에서 목표/길/landmark 읽힘
4. 30초 안에 clue/문제 1개 경험 가능
5. clue 3개 실제 이동/상호작용
6. 문제 3개가 각각 clue에서 등장
7. Bluebird에서 중복 3문제 modal 없음
8. 2/3 성공 → capture/codex/reward
9. 1/3 실패 시 no reward + retry 가능

### Cross-stage
- Waterfall player/world scale가 Camp와 일관
- Cave/GiantTree/SkyRidge initial framing 비교
- D-pad/A/B 가림 없음
- Console/Page errors 없음

스크린샷 최소:
- Camp 시작 직후
- 첫 clue + contextual prompt
- micro quiz
- bird encounter/capture
- Waterfall 또는 Sky Ridge scale comparison

## Acceptance criteria

다음 모두 만족해야 PASS:

- 시작 화면 캐릭터 가림 문제 해결
- 5 stage visual scale contract 적용 또는 명확한 제한 override
- 첫 30초 안에 실제 adventure beat 존재
- 문제는 final exam이 아니라 exploration 중 분산
- 2/3 포획 규칙 유지
- codex/reward persistence 유지
- Camp actual browser play에서 재미있는 탐험 흐름이 눈에 보임
- 기존 5-stage progression/test 회귀 없음

## Git workflow / report

작업 종료 시:

- `node --test`
- `git diff --check`
- browser QA
- `git status --short`

REPORT 생성:
`.agent/REPORT_JUNGLE_ADVENTURE_GAMEPLAY_01.md`

REPORT에 포함:
- START/FINAL HEAD
- changed files
- root causes
- scale contract
- Adventure Loop V2 구현 내용
- clue→quiz mapping 3 stage
- capture/retry behavior
- tests
- browser screenshots/observations
- remaining issues
- final PASS/FAIL

**코드 + REPORT를 commit/push한다.**
PR merge/close 금지.
