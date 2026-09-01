# PROMPT_JUNGLE_ADVENTURE_GAMEPLAY_02

## Mission

Camp에서 구현한 Adventure Loop V2를 Waterfall / Sky Ridge로 확장하고, 실제 탐험 중 재미를 높이는 micro-discovery와 contextual feedback을 추가한다.

이번 작업의 핵심은 "기능 존재"가 아니라 **플레이 중 계속 다음 행동이 보이고, 탐험→단서→짧은 문제→새 발견→포획→도감/배지**가 자연스럽게 이어지는 것**이다.

기준 브랜치: `prototype/jungle-web-canvas-poc`
기준 HEAD: `ce7ebddf660e527ab4cf1fb9ae9425d7e2c3264d`

## 절대 원칙

- 최신 recovery 반영 후 시작
- 사용자 변경/reset/clean 금지
- Camp Adventure Loop V2 회귀 금지
- Three.js production renderer 유지
- logical X/Y gameplay authority 유지
- 기존 route/geometry는 blocker가 아니면 변경 금지
- React/new heavy dependency 금지
- PR merge/close 금지

## P0 — Waterfall Adventure Loop V2

기존 authored progression을 이용해 3개의 exploration beat에 quiz 1개씩 분산한다.

권장 mapping은 실제 코드의 현재 interactable/step 명칭을 기준으로 확정하되 다음 원칙을 지킨다.

- 첫 문제: 시작 후 30초 내 접근 가능한 위치
- 둘째 문제: stepping stones/echo/mist 등 중간 탐험 지점
- 셋째 문제: lookout 직전 또는 final bird encounter 전 지점
- Kingfisher에서 3문제 modal을 다시 띄우지 않음
- 누적 점수 >= 2/3 → kingfisher capture → codex → 기존 reward
- 0~1/3 → reward/codex 금지, retry 가능
- retry는 전체 스테이지 강제 초기화보다 가까운 관찰/보충문제 방식 우선

## P0 — Sky Ridge Adventure Loop V2

Waterfall과 동일한 shared contract로 구현한다.

기존 Wind Ribbon / Cloud Shadow / Wind Chime / Star Pattern / Summit Bridge 흐름 중 3곳을 clue quiz beat로 사용한다.

- Sky Hawk encounter에서 final 3-question modal 금지
- 누적 score >= 2/3 → skyHawk capture → codex → reward
- 실패 시 reward 없음 + 간단 retry
- 기존 Star Pattern mini-game 자체는 제거하지 않는다

## P1 — 공통 Adventure Quiz State

Camp/Waterfall/Sky Ridge가 서로 다른 임시 구현으로 갈라지지 않게 공통 state/helper를 만든다.

필수 개념:

- stageBirdId
- clueQuizAnsweredIds
- clueQuizScore
- clueQuizzesComplete
- capture threshold 2/3
- retry/reset policy

기존 `bird_quiz.js`, `bird_codex.js`, `bird_manifest.js`, `bird_quiz_bank.js` 재사용.

65문제 bank는 유지하되 clue 자체와 전혀 무관한 고정 q004/q005 같은 임시 mapping은 개선한다.
각 clue에는 최소한 주제적으로 납득 가능한 문제를 매핑하거나 category pool에서 선택한다.

## P1 — Micro Discovery

각 bird stage에 필수 진행을 막지 않는 작은 발견 요소를 최소 1개씩 넣는다.

예:
- Camp: 반짝이는 깃털 / 숨은 새 발자국
- Waterfall: 물방울 반짝이 / 작은 물고기 흔적 / 젖은 깃털
- Sky Ridge: 바람깃 / 별빛 조각 / 구름 그림자 관찰점

규칙:
- main route에서 크게 벗어나지 않음
- 1~3초 interaction
- 별도 inventory 시스템 만들지 않음
- 발견하면 작은 chime/sparkle + 한 문장
- progress 필수 조건 아님

## P1 — Contextual A / Hint Ladder

상호작용 범위 밖에서는 A를 중립으로 두고, 근접 시 의미가 명확히 바뀐다.

예:
- `A 단서 확인`
- `A 물소리 듣기`
- `A 흔적 살펴보기`
- `A 새 관찰`

힌트 강도:
- far: ambient sound / subtle sparkle / perch contrast
- medium: pulse / feather / ripple / wind cue
- near: contextual A label

거대한 화살표, 노란 tether, 화면 중앙 지속 popup 금지.

## P1 — Thinking Orbs 경량 PoC

`jungle-web-canvas-poc/docs/기술집.md`의 thinking-orbs 항목 참고.

라이브러리 전체/React는 추가하지 않는다.
작은 자체 Canvas/DOM effect 또는 최소 engine-like 구현으로 다음 중 2~3개만 적용한다.

- searching: clue 접근
- listening: birdcall/water/wind clue
- solving: micro quiz
- shaping/composing: capture success

조건:
- 게임 화면을 가리지 않음
- D-pad/A/B 가리지 않음
- 평상시 계속 animate하지 않음
- reduced-motion 고려
- 성능 부담이 있으면 이번 slice에서 POC LATER로 보고하고 제거 가능

## P1 — Stage Scale / Initial Framing 실제 비교

이전 REPORT의 "scale drift 없음"을 문자열 계약만으로 끝내지 말고 실제 browser screenshot으로 비교한다.

Camp / Waterfall / Cave / Giant Tree / Sky Ridge 시작 화면을 같은 viewport에서 캡처하고 다음 확인:

- player screen-height 약 12~16% 범위 또는 명시적 예외
- path width 대비 player 비율
- 시작 시 player가 foreground/HUD에 가리지 않음
- 첫 목표 방향이 화면에 읽힘
- stage별 camera scale 차이가 체감상 과도하지 않음

필요하면 공통 상수 + 제한 override만 수정한다.

## Tests

기존 188 tests 전부 유지.

추가 최소 테스트:

### Waterfall
- clue quiz 3개 각각 1회
- score 누적
- >=2 success
- <=1 failure no reward/codex
- kingfisher에서 duplicate 3-question modal 없음
- retry

### Sky Ridge
- 동일 계약

### Shared
- stage별 bird ID mapping
- clue quiz duplication 방지
- malformed/reload codex 기존 보장 유지
- Camp regression

`node --test` 전부 PASS 필수.
`git diff --check` PASS 필수.

## Browser QA

서버 8124 사용.

### Waterfall full play
- 시작 화면
- 첫 30초 내 clue/problem
- 세 clue 문제 분산
- 2/3 성공 capture/codex/reward
- 1/3 실패 no reward + retry

### Sky Ridge full play
- 동일

### Camp regression
- clue 3개 → quiz 3개 → bluebird capture

### Cross-stage
- 5 stage initial framing 비교
- console/page error 없음

스크린샷 최소:
- Waterfall 첫 clue
- Waterfall kingfisher capture
- Sky Ridge 첫 clue
- Sky Hawk capture
- 5-stage scale comparison evidence

## REPORT

`.agent/REPORT_JUNGLE_ADVENTURE_GAMEPLAY_02.md`

반드시 포함:
- START HEAD / FINAL HEAD (pending 금지, 실제 commit SHA 기입)
- changed files
- Waterfall clue→quiz mapping
- Sky Ridge clue→quiz mapping
- capture/retry behavior
- micro-discovery 구현 위치
- Thinking Orbs 적용 여부/이유
- 5-stage scale comparison
- tests
- browser QA
- remaining issues
- final PASS/FAIL

작업 완료 후 **코드 + REPORT commit/push**.
PR merge/close 금지.
