# PROMPT_JUNGLE_CAVE_GIANTTREE_ADVENTURE_08

## Mission
Camp/Waterfall/Sky Ridge의 Adventure Loop V2와 독립적으로, Cave와 Giant Tree를 단순 관찰 스테이지가 아니라 **짧은 탐험 → 단서/관찰 → 선택/미니문제 → 발견 → 보상** 흐름으로 강화한다.

## Branch
`prototype/jungle-web-canvas-poc`

## 병렬 작업 규칙
- Waterfall reward finalize 작업 파일(`src/game.js`, `tools/browser/jungle_real_input_e2e.mjs`, 관련 REPORT)과 충돌을 피한다.
- 가능하면 Cave/Giant Tree 전용 파일과 공통 신규 모듈만 수정.
- 기존 Camp/Waterfall/Sky Ridge 로직은 건드리지 않는다.

## Cave
- 박쥐/수정/반딧불 중심의 3-beat 탐험 루프 구성.
- 예: 반향 소리 → 발광 흔적 → 수정 관찰 → 박쥐 발견/보상.
- 각 beat는 5~10초 내 끝나는 선택/관찰형 micro-learning.
- contextual A, 거리별 cue, 작은 discovery 1개 포함.
- 실패 game over 없음.

## Giant Tree
- 다람쥐/씨앗/나무 흔적 중심 3-beat 탐험 루프 구성.
- 예: 긁힌 나무껍질 → 떨어진 씨앗 → 흔들리는 가지 → 다람쥐 발견/보상.
- contextual A + optional micro discovery 1개.

## UX
- 전체 화면 시험형 modal 금지.
- world context가 보이는 compact panel.
- D-pad/A/B 가림 금지.
- 첫 30초 안에 최소 1 interaction.

## Tests
- 각 스테이지 3-beat 순서/상태 전이
- reward 조건
- retry/재관찰 가능
- persistence 회귀 없음
- node --test / git diff --check

## Browser QA
Playwright 가능 시 실제 입력으로 Cave/Giant Tree 완주하고 screenshot 최소 8장.
teleport/state injection 금지.

## Report
`.agent/REPORT_JUNGLE_CAVE_GIANTTREE_ADVENTURE_08.md`
START/FINAL HEAD, changed files, 루프, 테스트, 브라우저 결과, 남은 이슈, PASS/FAIL.

코드+REPORT commit/push. merge/close 금지.