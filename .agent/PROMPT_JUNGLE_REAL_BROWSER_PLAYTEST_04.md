# PROMPT_JUNGLE_REAL_BROWSER_PLAYTEST_04

## Mission
이전 REPORT_JUNGLE_ADVENTURE_BROWSER_QA_03은 실제 브라우저 조작 증거 대신 code-level verification 중심이었다. 이번 작업은 **실제 브라우저에서 사용자 입력으로 처음부터 끝까지 플레이**하여 Adventure Loop V2가 체감상 정상인지 검증한다.

## 절대 원칙
- 코드 수정 금지.
- 소스 grep/정적 코드 확인만으로 PASS 판정 금지.
- HTTP 200, node --test, 함수 존재 여부만으로 GAMEPLAY PASS 금지.
- 실제 브라우저에서 canvas/game UI를 열고 이동/상호작용/퀴즈 선택/포획/도감 확인을 수행해야 한다.
- 브라우저 자동화가 불가능하면 억지로 PASS하지 말고 `REAL BROWSER QA: BLOCKED`로 보고한다.
- 기존 사용자 변경 삭제/reset/clean 금지.

## Branch
`prototype/jungle-web-canvas-poc`

시작 시 기록:
- git status --short
- git rev-parse HEAD
- git log -3 --oneline

## Actual browser playthrough
서버: `http://localhost:8124`

### 1. Camp — complete real play
- `/?renderer=three` 실제 로드
- 시작 직후 player가 foreground에 가리지 않는지 screenshot
- 실제 D-pad/keyboard/touch-equivalent 입력으로 Hut까지 이동
- Feather clue 근접 → contextual A 확인 → 실제 A/클릭
- q001 화면 실제 표시 screenshot → 선택지 클릭
- Footprints → q004 실제 플레이
- Birdcall → q005 실제 플레이
- Bluebird까지 실제 이동/상호작용
- 2/3 이상 시 capture → codex → reward 실제 화면 확인
- 새로고침 후 codex persistence 실제 확인

### 2. Camp failure path
- 새 세션/저장 초기화가 안전하게 가능한 QA 방식으로 0~1/3 점수 만들기
- Bluebird encounter에서 reward가 지급되지 않고 retry가 실제 표시되는지 확인
- retry 후 다시 clue route를 실제 진행할 수 있는지 확인

### 3. Waterfall — complete real play
- 실제 stage 진입
- echo → q008
- mistTrail → q002
- waterDrops → q039
- Kingfisher encounter
- capture/retry 중 최소 성공 path 실제 완료
- contextual A가 실제 근접도에 따라 바뀌는지 확인
- wetFeather micro-discovery 실제 상호작용

### 4. Sky Ridge — complete real play
- windRibbon → q019
- cloudShadow → q015
- windChime → q017
- Sky Hawk encounter
- capture/reward/codex 실제 확인
- windFeather micro-discovery 실제 확인

### 5. Scale / framing visual comparison
실제 browser screenshots로 다음 5개 stage를 같은 viewport에서 비교:
- Camp
- Waterfall
- Cave
- Giant Tree
- Sky Ridge

단순 상수 비교 금지. 화면에서 다음을 판정:
- player apparent screen size
- path/prop/tree scale
- initial camera framing
- foreground occlusion
- HUD/D-pad overlap

## Required screenshots
REPORT에 실제 생성된 screenshot 파일 경로를 기록한다. 최소 8장:
1. Camp start
2. Camp clue + contextual A
3. Camp quiz
4. Camp Bluebird capture/reward
5. Waterfall gameplay
6. Waterfall Kingfisher result
7. Sky Ridge gameplay/result
8. 5-stage scale comparison evidence (각 stage 개별 가능)

스크린샷을 생성하지 못하면 PASS 금지.

## Runtime error checks
실제 각 페이지에서:
- console error
- page error
- unhandled promise rejection
- frozen input
- overlay blocking controls
확인.

## Tests
브라우저 실플레이 후에만 보조 증거로:
- node --test
- git diff --check

## Acceptance
`REAL GAMEPLAY PASS`는 아래를 모두 만족할 때만:
- Camp success path 실제 플레이 완료
- Camp failure/retry 실제 플레이 완료
- Waterfall 실제 플레이 완료
- Sky Ridge 실제 플레이 완료
- 도감 persistence 실제 확인
- micro-discovery 실제 상호작용 확인
- contextual A 실제 동작 확인
- 5-stage screenshot 기반 scale/framing 비교 완료
- required screenshots 존재
- console/page runtime error 없음

## Report
`.agent/REPORT_JUNGLE_REAL_BROWSER_PLAYTEST_04.md`

반드시 포함:
- START/FINAL HEAD
- 사용한 실제 browser/automation 방식
- viewport
- 각 stage 실제 입력 순서
- 실제로 클릭/선택한 quiz 답
- success/failure/retry 결과
- screenshot 파일 경로
- runtime errors
- scale/framing visual verdict
- blockers
- 최종 `REAL GAMEPLAY PASS / FAIL / BLOCKED`

REPORT만 commit/push. 코드 수정 금지.
