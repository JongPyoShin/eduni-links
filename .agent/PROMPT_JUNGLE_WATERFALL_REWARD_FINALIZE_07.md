# PROMPT_JUNGLE_WATERFALL_REWARD_FINALIZE_07

## Mission
`1279f37`에서 real-input E2E는 Camp/Sky Ridge까지 완료됐지만 Waterfall은 `rewardComplete:false` 상태에서 종료됐다. 이번 작업은 **Waterfall 보상 패널이 자연 reveal된 뒤 실제 A/Enter 입력으로 최종 확정되어 `rewardComplete:true`가 되는 것까지** 검증/보완하는 마지막 마감 작업이다.

## Branch / baseline
- Branch: `prototype/jungle-web-canvas-poc`
- Baseline: `1279f3722c42b7e0e5cae558793e71aa0041800c` 이상 최신 HEAD
- 시작 시 `git status --short`, `git rev-parse HEAD`, `git log -5 --oneline`
- reset/clean/사용자 변경 삭제 금지

## 절대 조건
- teleport / player 좌표 직접 대입 금지
- `page.evaluate()` state write 금지
- DOM style/visibility/hidden 강제 변경 금지
- localStorage progression/reward 직접 주입 금지
- 내부 progression 함수 직접 호출 금지
- `page.evaluate()`는 읽기 전용 관찰만 허용
- 실제 이동/상호작용은 `page.keyboard` 또는 실제 D-pad/A/B 입력만 사용

## P0 — Waterfall 완전 종료
URL:
`http://localhost:8123/?stage=waterfall&renderer=three&qa=1`

`tools/browser/jungle_real_input_e2e.mjs`의 Waterfall flow를 실제 입력만으로 다음까지 완료한다.

1. Entrance → Stream Gate 실제 이동
2. Stream Gate panel open + confirm
3. Stepping Stones 이동 + confirm
4. echo → q008 실제 quiz
5. mistTrail → q002 실제 quiz
6. waterDrops → q039 실제 quiz
7. Lookout 이동 + confirm
8. auto-open Kingfisher panel 확인
9. 실제 A/Enter로 Kingfisher panel confirm
10. reward panel 실제 open
11. `revealReady=false` 관찰
12. game loop 자연 진행을 기다려 confirm이 실제 visible/enabled가 되는 시점 기록
13. **실제 A/Enter를 한 번 더 입력하여 reward panel 최종 confirm**
14. modal이 닫히는지 확인
15. `waterfall.rewardComplete === true` 확인
16. stage reward persistence/localStorage 저장 확인
17. reload 후 reward/codex persistence 확인

## 핵심 Acceptance
아래를 모두 만족해야 `WATERFALL FINAL PASS`:

- Kingfisher captured
- `birdComplete:true`
- reward panel 자연 reveal
- DOM 강제 조작 0회
- 자연 reveal 후 실제 입력으로 reward panel 닫힘
- **`rewardComplete:true`**
- reward storage persistence 확인
- reload 후 완료 상태/수집 보상 유지
- console/page errors 0

`rewardComplete:false` 상태에서 테스트 종료하면 FAIL.

## Natural reveal timing
- reward panel open 시각 기록
- confirm visible/enabled 시각 기록
- 실제 reveal 대기시간(ms) 기록
- 5초 내 자연 reveal되지 않으면 production bug로 FAIL
- 필요한 경우 실제 게임 코드의 timing/state transition 버그는 수정 가능
- 단 QA용 force helper/shortcut 추가 금지

## E2E script 정리
기존 `tools/browser/jungle_real_input_e2e.mjs`에서 Waterfall 부분을 보완한다.

권장 helper:
- `waitForRewardConfirmReady(page, timeoutMs=5000)`
- `confirmRewardByRealInput(page)`
- `assertWaterfallRewardComplete(page)`

helper는 DOM/state를 **읽기만** 하고 실제 확정은 keyboard/D-pad input path를 통과해야 한다.

## Screenshots
`artifacts/jungle-e2e-real-input/`에 최소 다음 추가/갱신:
- waterfall-kingfisher-panel
- waterfall-reward-before-reveal
- waterfall-reward-ready
- waterfall-reward-confirmed
- waterfall-after-reward
- waterfall-after-reload-persist

각 screenshot 파일명을 REPORT에 기록.

## P1 — Regression smoke
Waterfall 수정 후 기존 real-input E2E 전체를 다시 실행해 회귀 확인.

최소 확인:
- Camp pass
- Camp fail/retry
- Waterfall full complete (`rewardComplete:true`)
- Sky Ridge pass
- Cave render
- Giant Tree render
- 5-stage comparison
- runtime error 0

전체를 다시 돌리기 어렵다면 최소 Waterfall full + Camp/Sky Ridge smoke를 실제 브라우저로 수행하되, 가능하면 기존 5-stage suite 전체를 재실행한다.

## Tests
- `node --test`
- `git diff --check`
- E2E exit code 0

## REPORT
`.agent/REPORT_JUNGLE_WATERFALL_REWARD_FINALIZE_07.md`

반드시 포함:
- START / FINAL HEAD
- changed files
- Waterfall 실제 입력 순서
- Kingfisher capture state
- reward panel open/reveal/confirm 시각 및 대기시간
- confirm에 사용한 실제 입력
- 최종 `rewardComplete` 값
- reward/codex persistence 결과
- screenshots 목록
- runtime errors
- teleport count = 0
- evaluate-write count = 0
- DOM force count = 0
- unit tests / diff check / E2E 결과
- 최종 `WATERFALL FINAL PASS / FAIL`

완료 시 코드(필요한 경우) + E2E + REPORT commit/push. PR merge/close 금지.
