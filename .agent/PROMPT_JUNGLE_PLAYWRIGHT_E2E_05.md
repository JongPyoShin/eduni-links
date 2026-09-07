# PROMPT_JUNGLE_PLAYWRIGHT_E2E_05

## Mission
REAL_BROWSER_PLAYTEST_04가 터미널 전용 환경 때문에 BLOCKED 되었다. 이번 작업은 **터미널에서 실행 가능한 실제 브라우저 자동화 하네스**를 추가하고, Chromium/Chrome/Edge를 headless로 구동해 Camp/Waterfall/Sky Ridge를 실제 입력으로 플레이하여 스크린샷과 runtime evidence를 남기는 것이다.

이번에는 `HTTP 200`, grep, unit test만으로 PASS하지 않는다. **실제 browser process + 실제 DOM/D-pad/keyboard input + 실제 canvas 렌더링 + screenshot**이 있어야 한다.

## Branch / safety
- branch: `prototype/jungle-web-canvas-poc`
- 시작 시 `git status --short`, `git rev-parse HEAD`, `git log -3 --oneline`
- reset/clean으로 사용자 변경 삭제 금지
- production gameplay를 QA 편의를 위해 우회/teleport/state mutation 하지 않는다
- QA bridge는 **상태 읽기/assertion 용도만** 사용 가능

## Existing QA contracts to reuse
이미 존재하는 기능을 우선 사용한다.

Camp/Waterfall `index.html?qa=1`:
- `#qa-runtime-state` read-only snapshot
- `#qa-input-panel`
- `#qa-hold-up/down/left/right` (1000ms)
- `#qa-nudge-*` (250ms)
- `#qa-fine-*` (100ms)
- `#qa-interact`, `#qa-close`
- `globalThis.__eduniJungleGame` read-only bridge

`src/input.js`의 QA click input v2는 실제 InputController를 통과하므로 이를 적극 사용한다.
QA bridge의 `player`, `getState`, `getPhase`, `getTarget`, `getObjective`는 관찰용으로만 사용한다. 좌표 직접 대입, state 직접 변경, 함수 monkey patch로 진행 강제 금지.

## 1. Browser automation foundation
프로젝트에는 현재 browser automation dependency가 없다.

우선순위:
1. 로컬에 설치된 Chrome/Edge/Chromium을 탐지
2. Playwright가 설치 가능하면 devDependency로 `playwright` 또는 `@playwright/test` 추가
3. Playwright browser bundle 설치가 불필요하면 system Chrome/Edge `executablePath` 사용
4. Playwright 설치 자체가 막히면 Node + Chrome DevTools Protocol(CDP) zero/minimal-dependency fallback을 구현 가능

금지:
- 브라우저가 없다고 즉시 BLOCKED 종료
- 브라우저 실행 가능성 확인 없이 REPORT 작성

Windows 후보 예:
- `%ProgramFiles%\Google\Chrome\Application\chrome.exe`
- `%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe`
- `%LocalAppData%\Google\Chrome\Application\chrome.exe`
- `%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe`
- `%ProgramFiles%\Microsoft\Edge\Application\msedge.exe`

## 2. Deliverable
추천 구조:

```text
tools/browser/jungle_e2e.mjs
artifacts/jungle-e2e/                 # screenshots/results, 필요 시 gitignore 정책 판단
```

`package.json` script:

```text
qa:browser
```

자동화 코드는 production runtime dependency가 아니라 dev/QA 전용이어야 한다.

## 3. Real input rule
자동화는 다음 입력 중 하나를 실제 browser에 전달한다.

- Playwright `locator(...).click()` on QA/D-pad buttons
- Playwright keyboard `Arrow*`, `KeyA`/`Enter`, `KeyB`/`Escape`
- CDP `Input.dispatchKeyEvent` / mouse event

허용:
- `#qa-hold-*`, `#qa-nudge-*`, `#qa-fine-*` click
- `#qa-interact` click
- modal `.choice` click 또는 Arrow+Enter

금지:
- player.x/player.y 직접 대입
- chapter/waterfall/sky state 직접 변조
- localStorage에 capture/reward 결과를 미리 주입
- JS 함수 직접 호출로 clue complete/capture complete 수행

## 4. Navigation helper
자동화는 `#qa-runtime-state`의 player/target 상태를 읽어 실제 입력으로 목표까지 이동하는 helper를 만든다.

예:
1. snapshot에서 player 위치/현재 target 읽기
2. x/y 차이에 따라 hold/nudge/fine 버튼 클릭
3. 매 이동 후 snapshot 재확인
4. interaction radius에 들어오면 `#context-hint.visible` 또는 target proximity를 확인
5. `#qa-interact` 클릭

좌표를 읽는 것은 허용하지만 **이동은 반드시 input event로만** 한다.

경로 장애물 때문에 단순 직선 이동이 실패하면 기존 authored route/known walkable path를 따라 waypoint helper를 사용한다. 상태를 강제로 바꾸지 않는다.

## 5. Camp E2E
URL: `http://localhost:8124/?renderer=three&qa=1`

필수:
- gameplay-ready + Three ready 확인
- 시작 screenshot
- player가 foreground에 심하게 가려지지 않는지 확인
- Hut 실제 이동/상호작용
- Feather → q001 실제 화면/답 선택
- Footprints → q004
- Birdcall → q005
- Bluebird encounter
- 2/3 이상 success path → capture/reward/codex
- 새로고침 후 codex persistence 확인
- Camp failure path도 별도 fresh context/localStorage reset 후 0~1/3을 실제 선택하여 retry 표시 및 다시 이동 가능 확인

localStorage reset은 **테스트 시작 전 환경 정리**에만 허용한다. capture/reward 값을 주입하는 용도로 사용 금지.

## 6. Waterfall E2E
URL: `http://localhost:8124/?stage=waterfall&renderer=three&qa=1`

실제 입력으로:
- echo → q008
- mistTrail → q002
- waterDrops → q039
- wetFeather micro-discovery
- Kingfisher encounter
- success path → codex/reward
- contextual A 실제 변화 확인

## 7. Sky Ridge E2E
Sky Ridge의 실제 production URL/QA hook을 소스에서 확인한다.
필요하면 **QA read-only mirror/input hook만 최소 추가**할 수 있다. gameplay semantics 변경 금지.

실제 입력으로:
- windRibbon → q019
- cloudShadow → q015
- windChime → q017
- windFeather micro-discovery
- Sky Hawk encounter
- success path → codex/reward

Sky Ridge에 Camp/Waterfall과 동일한 QA hook이 없으면, 이번 작업 범위에서 동일 contract를 얇게 추가하는 것은 허용한다. 단 테스트 전용 DOM/read-only snapshot/input adapter여야 한다.

## 8. 5-stage visual smoke
같은 viewport(권장 1280×720 또는 1366×768)에서 실제 browser screenshot:
- Camp
- Waterfall
- Cave
- Giant Tree
- Sky Ridge

각 stage에서:
- player apparent size
- initial framing
- foreground occlusion
- HUD/D-pad overlap
- rendering fallback 여부
을 기록한다.

## 9. Screenshot evidence
최소 10장 실제 PNG 생성:
1. camp-start
2. camp-context-a
3. camp-quiz
4. camp-capture-reward
5. camp-retry
6. waterfall-gameplay
7. waterfall-capture
8. sky-ridge-gameplay
9. sky-ridge-capture
10. five-stage comparison evidence (개별 5장 추가 권장)

REPORT에 실제 경로와 파일 크기를 기록한다.
빈 파일/placeholder 금지.

## 10. Runtime evidence
각 page/context에서 수집:
- `console.error`
- `pageerror`
- unhandled rejection
- navigation/load failure
- renderer fallback 여부
- timeout/frozen input

실패가 있으면 screenshot + 마지막 QA snapshot + error를 함께 남긴다.

## 11. Tests
작업 후:
- `npm test` 또는 `node --test`
- `npm run qa:browser`
- `git diff --check`

browser E2E 테스트는 가능한 한 재실행 가능하고 deterministic 해야 한다.

## Acceptance
`REAL GAMEPLAY PASS` 조건:
- 실제 Chrome/Edge/Chromium process를 automation으로 launch/attach
- Camp success + failure/retry 실제 input 완료
- Waterfall actual input 완료
- Sky Ridge actual input 완료
- codex persistence 실제 browser reload로 확인
- micro-discovery actual interaction 확인
- contextual A actual visual state 확인
- 실제 PNG screenshots 존재
- 5-stage visual screenshots 존재
- console/page errors 없음 또는 허용 가능한 known warning만 명시
- 190+ 기존 unit tests 회귀 없음

browser binary/package 설치가 정말 불가능한 경우에만 `BLOCKED` 가능하며, 그 경우 **탐지한 browser 경로, 실행 명령, npm/package 실패 로그까지 증거**를 남긴다.

## Report
`.agent/REPORT_JUNGLE_PLAYWRIGHT_E2E_05.md`

포함:
- START/FINAL HEAD
- 사용 browser 이름/버전/executablePath
- Playwright/CDP 방식
- changed files
- 실제 실행 명령
- stage별 실제 input sequence 요약
- quiz에서 선택한 answer와 결과
- success/failure/retry 결과
- screenshot paths + file sizes
- runtime errors
- 5-stage visual verdict
- unit/E2E tests
- remaining issues
- 최종 `REAL GAMEPLAY PASS / FAIL / BLOCKED`

## Git
이번 작업은 QA automation tooling 구현이므로 **QA 코드 + package 변경 + REPORT + 필요한 테스트 전용 hook**을 commit/push한다.
PR merge/close 금지.
