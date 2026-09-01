# PROMPT_JUNGLE_ADVENTURE_BROWSER_QA_03

## Mission
코드 수정 없이 Adventure Loop V2 실제 브라우저 플레이를 검증한다. 코드/테스트 PASS만으로 완료 판정하지 않는다.

## Baseline
- Branch: `prototype/jungle-web-canvas-poc`
- Expected HEAD at start: `4d1f97164c2d18b57dcf7b5dfe06e268a47acb6f` 또는 그 이후 fast-forward
- 기존 사용자 변경 삭제 금지
- 코드 수정 금지
- PR merge/close 금지

## Required QA
서버 `http://localhost:8124`에서 실제 브라우저 플레이.

### Camp
- 시작 시 캐릭터/길/목표 가림 없음
- Feather → quiz 1
- Footprints → quiz 2
- Birdcall → quiz 3
- Bluebird에서 3문제 modal이 다시 뜨지 않음
- 2/3 이상 → codex + reward
- 1/3 이하 → reward 없음 + retry 가능
- shinyFeather micro-discovery 실제 접근/표시
- contextual A label 실제 변경

### Waterfall
- echo → quiz 1
- mistTrail → quiz 2
- waterDrops → quiz 3
- Kingfisher에서 누적 점수로 포획 판정
- 2/3 성공 / 1/3 실패+retry 각각 확인
- wetFeather micro-discovery 확인
- contextual A label 확인

### Sky Ridge
- windRibbon → quiz 1
- cloudShadow → quiz 2
- windChime → quiz 3
- Sky Hawk에서 누적 점수로 포획 판정
- 2/3 성공 / 1/3 실패+retry 각각 확인
- windFeather micro-discovery 확인
- contextual A label 확인

### Scale / framing comparison
Camp / Waterfall / Cave / Giant Tree / Sky Ridge 시작 화면을 실제 브라우저에서 비교한다.
각 stage에 대해 기록:
- player screen occupancy
- path width 대비 player
- 초기 카메라 framing
- foreground occlusion
- HUD/D-pad/A/B overlap

숫자를 추측하지 말고 실제 화면 기준 PASS/FAIL을 기록한다.

### Persistence
- bird codex 3종 등록 상태 확인
- hub count 확인
- reload 후 유지 확인

### Errors
각 페이지 Console error / Page error 확인.

## Evidence
가능하면 스크린샷 최소 6장:
1. Camp 시작
2. Camp clue quiz
3. Waterfall clue quiz
4. Sky Ridge clue quiz
5. capture/codex
6. 5-stage scale comparison representative

## Test commands
- `node --test`
- `git diff --check`

## Report
`.agent/REPORT_JUNGLE_ADVENTURE_BROWSER_QA_03.md` 생성.
포함:
- HEAD
- browser QA 결과
- Camp/Waterfall/Sky Ridge 실제 progression
- success/failure retry 확인
- micro-discovery 확인
- contextual A 확인
- 5-stage scale/framing 표
- persistence
- Console/Page errors
- screenshots/evidence
- 최종 `GAMEPLAY PASS / FAIL`

코드는 수정하지 않는다. REPORT만 commit/push한다.
