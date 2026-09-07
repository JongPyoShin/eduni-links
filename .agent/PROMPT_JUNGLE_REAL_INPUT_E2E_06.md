# PROMPT_JUNGLE_REAL_INPUT_E2E_06

## Mission
이전 `608cb89` E2E는 Playwright/Chromium을 사용했지만 핵심 진행에서 `player.x/y` 직접 변경(teleport)과 Waterfall reward의 `page.evaluate()` 강제 버튼 노출을 사용했다. 이번 작업은 그 두 우회를 제거하고 **실제 플레이어 입력과 실제 UI 상태 전이만으로** Camp / Waterfall / Sky Ridge를 끝까지 통과시키는 것이다.

## Branch / baseline
- Branch: `prototype/jungle-web-canvas-poc`
- Baseline: `608cb899bde0b4209258716c7f4291764477c6da` 이상 최신 HEAD
- 기존 사용자 변경 삭제/reset/clean 금지
- 시작 시 `git status --short`, `git rev-parse HEAD`, `git log -5 --oneline` 기록

## 절대 금지
아래 중 하나라도 사용하면 `REAL INPUT E2E PASS` 금지.

1. `globalThis.__eduniJungleGame.player.x/y = ...`
2. `globalThis.__eduniSkyRidgeGame.player.x/y = ...`
3. 어떤 형태의 teleport / 좌표 직접 대입 / state 직접 변경
4. `page.evaluate()`로 game state, progression state, codex, reward state를 변경
5. `page.evaluate()`로 `#modal-confirm`의 `style`, `hidden`, `display`, `disabled`, `visibility` 등을 강제 변경
6. DOM을 직접 조작해 modal/quiz/reward를 건너뜀
7. localStorage에 capture/reward 값을 직접 주입해 진행 우회
8. interactable의 실제 도달 없이 `openInteraction()` 등 내부 함수를 직접 호출

`page.evaluate()`는 **읽기 전용 관찰**에만 허용한다.
예: player 좌표 읽기, state snapshot 읽기, DOM text 읽기, console 상태 확인.

## 허용 입력
실제 사용자가 할 수 있는 입력만 사용한다.

우선순위:
1. `page.keyboard.down/up()` Arrow keys / A / B / Enter / Escape
2. 실제 화면의 D-pad / A / B button click/pointer
3. `?qa=1`의 QA input panel 클릭 (`#qa-hold-*`, `#qa-nudge-*`, `#qa-fine-*`, `#qa-interact`, `#qa-close`)

QA input panel은 `InputController.setDigitalAction()`을 통과하므로 허용한다.
단, hidden `qa-input-command`의 dataset 직접 조작은 이번 PASS 증거로 사용하지 않는다.

## 목표 1 — 실제 이동 helper 만들기
`tools/browser/jungle_e2e.mjs`를 정리하여 공통 이동 helper를 만든다.

필수 helper 개념:
- `readPlayer()` — 현재 좌표 읽기 전용
- `readInteractables()` — bridge getter로 위치 읽기 전용
- `moveToward(target, options)` — 방향키 또는 QA D-pad 입력만으로 목표 근처까지 이동
- `waitUntilNear(target, radius)` — 실제 좌표 변화 확인
- `pressA()` / `pressB()` — 실제 input path
- `chooseQuizByKeyboard(...)` 또는 실제 `.choice` 클릭

이동 중 매 step마다:
- player 좌표가 실제로 변화하는지 확인
- 일정 시간 좌표가 멈추면 방향 재계산
- 최대 timeout 초과 시 FAIL

월드 geometry를 무시하고 직선으로만 박지 말고, 충돌 때문에 막힐 경우 짧은 X/Y 분리 이동 또는 우회 waypoint를 사용한다.
**waypoint는 좌표 이동 명령이 아니라 방향 입력 목표점**이어야 한다.

## 목표 2 — Camp 실제 입력 완주
URL: `http://localhost:8124/?renderer=three&qa=1`

실제 입력 순서:
1. 시작 화면 screenshot
2. Hut까지 실제 이동
3. `A`로 quest 시작
4. Feather까지 실제 이동 → contextual A 확인 → A
5. q001 실제 선택/확정
6. Footprints 이동 → q004
7. Birdcall 이동 → q005
8. Bluebird까지 실제 이동 → A
9. capture/reward 완료
10. codex 등록 확인
11. reload 후 codex persistence 확인

증거:
- 이동 전후 좌표 로그
- 각 interactable 진입 직전 거리
- 최소 8장의 Camp screenshot

### Camp failure/retry
새 context/session에서:
- 3문제 모두 오답 또는 0~1점
- Bluebird 실제 이동/상호작용
- reward/codex 미지급 확인
- retry UI 실제 표시
- retry 선택 후 clue route를 다시 실제 이동 가능한지 최소 첫 clue까지 확인

## 목표 3 — Waterfall 실제 입력 완주
URL: `http://localhost:8124/?stage=waterfall&renderer=three&qa=1`

실제 이동으로 다음 순서 완주:
- stream gate
- stepping stones
- echo → q008
- mistTrail → q002
- waterDrops → q039
- lookout
- Kingfisher
- reward

### Waterfall reward 절대 조건
`page.evaluate()`로 버튼 노출/DOM 상태 변경 금지.

실제 로직으로:
1. reward panel open
2. `revealReady=false` 확인 가능
3. 실제 game loop의 `advanceSequences()`가 진행되도록 기다림
4. 최대 5초 내 `revealReady=true` 또는 confirm이 실제 visible/enabled가 되는지 관찰
5. 그 후 실제 click/A/Enter로 완료

2200ms animation이면 `waitForFunction()` / locator visibility wait / timeout을 사용한다.
**강제 reveal 금지.**

만약 5초 내 자연 전환이 안 되면 게임 코드 버그로 FAIL하고 root cause를 수정한 뒤 재검증한다.

## 목표 4 — Sky Ridge 실제 입력 완주
실제 stage URL/entry를 현재 코드에서 확인하고 사용한다.

실제 이동:
- sky gate
- windRibbon → q019
- cloudShadow → q015
- windChime → q017
- summit bridge
- Hawk
- reward/codex

teleport/state injection 없이 완료.

## 목표 5 — 실제 5-stage framing 비교
동일 viewport `1280x720`에서 실제 브라우저 screenshot:
- Camp
- Waterfall
- Cave
- Giant Tree
- Sky Ridge

단순 상수 비교가 아니라 screenshot 기반으로 다음 판정:
- apparent player size
- path width / prop scale
- initial framing
- foreground occlusion
- HUD/D-pad overlap

## Runtime checks
각 페이지마다 수집:
- `console.error`
- pageerror
- unhandled rejection
- navigation failure
- input freeze (입력 후 좌표 미변화)
- modal이 controls를 비정상적으로 영구 차단하는지

## Screenshots
최소 20장 이상 실제 저장.
필수:
- Camp start / hut / clue / quiz / bluebird / reward / persisted codex
- Camp fail / retry
- Waterfall start / clue / kingfisher / reward reveal waiting / reward complete
- Sky Ridge start / clue / hawk / reward
- 5-stage comparison

경로:
`artifacts/jungle-e2e-real-input/`

## Tests
E2E 완료 후:
- `node --test`
- `git diff --check`

## Acceptance — REAL INPUT E2E PASS
모두 만족해야 PASS:
- Camp success 실제 이동 입력 완주
- Camp failure/retry 실제 이동 입력 검증
- Waterfall 실제 이동 입력 완주
- Waterfall reward가 DOM 강제 조작 없이 자연 reveal 후 완료
- Sky Ridge 실제 이동 입력 완주
- codex/reward persistence 확인
- 최소 20 screenshots
- 5-stage visual comparison
- runtime error 0
- teleport 0회
- progression/state write via evaluate 0회
- DOM visibility/style forcing 0회
- 전체 unit tests PASS

## 구현 변경 허용 범위
이번에는 E2E가 실제 입력으로 막힐 경우 **실제 게임 버그 수정은 허용**한다.
단, 테스트 편의를 위해 gameplay를 우회하는 production API를 추가하지 않는다.

허용 예:
- collision/pathing 오류 수정
- contextual interaction radius 오류 수정
- reward timing/state transition 오류 수정
- genuine input handling 오류 수정

금지 예:
- `teleportTo(id)` production helper 추가
- `completeStageForQa()` 추가
- `forceRewardReveal()` 추가
- hidden QA-only progression shortcut 추가

## REPORT
`.agent/REPORT_JUNGLE_REAL_INPUT_E2E_06.md`

반드시 포함:
- START / FINAL HEAD
- Playwright/Chromium version
- server port
- viewport
- 실제 입력 방식
- 각 stage 이동 경로와 좌표 로그 요약
- interaction distance
- 실제 선택한 quiz 답
- Waterfall reward reveal 실제 대기 시간
- screenshots 목록
- runtime errors
- 수정한 실제 버그
- teleport/evaluate-write/style-force 사용 여부를 명시적으로 `0`으로 기록
- `node --test`, `git diff --check`
- 최종 `REAL INPUT E2E PASS / FAIL`

완료 시 코드 + E2E + REPORT를 commit/push한다. PR merge/close 금지.
