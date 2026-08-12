# Jungle 2.0 · ChatGPT + Codex + Manus 협업 규약

이 문서는 `정글 대탐험`의 완성도를 높이기 위한 3-Agent 개발 운영 기준이다.
기준 작업은 GitHub Issue `JNG-xxx`이며, 대화창의 기억보다 저장소 문서와 Issue/PR 내용을 우선한다.

## 1. 역할

### ChatGPT — Director / Architect
- 제품 방향과 우선순위를 정한다.
- 기능을 `JNG-xxx` 단위로 분해한다.
- Codex와 Manus에 전달할 작업 범위와 Acceptance Criteria를 만든다.
- Codex 구현 결과와 Manus UX 결과를 함께 검토한다.
- canonical runtime, 아키텍처, migration/legacy 판단을 책임진다.

### Codex — Lead Developer
- 실제 production 코드를 구현한다.
- 기술부채, 회귀 위험, 테스트 누락을 분석한다.
- 관련 파일만 좁게 읽고 수정한다.
- 한 기능은 한 feature branch와 한 Draft PR로 만든다.
- 작업 종료 시 changed files / validation / compatibility / commit SHA / risks를 보고한다.

### Manus — Game UX / Visual QA
- 실제 플레이 결과를 기준으로 시각/게임 체감을 평가한다.
- 캐릭터 이동감, 카메라, 맵 밀도, 터치 UX, HUD, 발견/포획/보상 연출을 점검한다.
- 가능한 경우 prototype/mockup을 제안하되 production 로직의 source of truth가 되지 않는다.
- 제안은 `문제 → 플레이 영향 → 권장 수정 → 우선순위` 형태로 남긴다.

## 2. Source of Truth

우선순위는 아래와 같다.

1. 현재 merge된 `main`
2. 현재 `JNG-xxx` GitHub Issue
3. 해당 feature Draft PR
4. 이 협업 문서
5. 기존 Jungle 문서
6. 대화 기록

기존 `README.md`, `phase_plan.md`, `acceptance_checklist.md`는 초기 트럭형 MVP 기준이므로 JNG-000에서 canonical runtime이 확정되기 전까지 **legacy planning reference**로 취급한다.

## 3. 현재 기준선 이슈

- `JNG-000` · Jungle 2.0 Baseline Audit & Canonical Runtime
- 현재 저장소에는 최소 두 정글 구현이 공존한다.
  - `portal_app/jungle_expedition.py`: 트럭형 채집 MVP 계열
  - `portal_app/static_games/eduni_jungle.html`: 캐릭터 직접 이동 Adventure 계열
- JNG-000 완료 전에는 대규모 신규 기능을 추가하지 않는다.

## 4. 작업 단위

모든 작업은 다음 템플릿을 사용한다.

### WHY
이 변경이 플레이 경험 또는 안정성에 왜 필요한가.

### WHAT
구현할 구체 범위.

### DO NOT CHANGE
관련 없는 시스템과 보존할 route/data contract.

### TARGET FILES
우선 읽을 파일. 전체 저장소 스캔 금지.

### UX TARGET
사용자가 느껴야 하는 변화.

### ACCEPTANCE CRITERIA
완료를 판단할 수 있는 체크 항목.

### VALIDATION
focused test + repository validation.

## 5. Branch / PR 규칙

- `main` 직접 수정 금지.
- branch 예: `jng/001-player-movement`
- 한 기능 = 한 branch = 한 Draft PR.
- 서로 다른 Agent가 같은 branch를 동시에 수정하지 않는다.
- Manus prototype은 production branch에 직접 병합하지 않는다.
- Codex가 production implementation을 담당한다.
- merge는 ChatGPT review 후 사용자 지시에 따라 진행한다.

## 6. 3-Agent 작업 흐름

1. ChatGPT가 `JNG-xxx` Issue와 Acceptance Criteria를 작성한다.
2. Manus가 UX/game-feel 관점의 audit 또는 prototype을 제안한다.
3. ChatGPT가 Manus 제안을 production spec으로 변환한다.
4. Codex가 feature branch에서 구현하고 Draft PR을 만든다.
5. Manus가 실제 구현 결과를 다시 플레이 QA한다.
6. ChatGPT가 code/architecture/UX를 함께 review한다.
7. 회귀 검증 후 merge 여부를 결정한다.

## 7. Jungle 2.0 Track

### P0 · Baseline
- canonical runtime
- legacy/keep/migrate 분류
- route/data/save/test 기준선

### P1 · Movement
- player movement
- joystick dead zone
- walk/run transition
- direction/facing
- camera follow
- collision

### P2 · World
- map composition
- jungle density
- area identity
- exploration path
- environment feedback

### P3 · Encounter
- bird spawn
- discovery
- capture
- rarity
- reward feedback
- quiz transition

### P4 · Game Feel
- animation timing
- particles
- sound hooks
- transitions
- HUD feedback

### P5 · Progression
- collection
- unlocks
- achievements
- long-term progression

### P6 · Learning
- quiz pacing
- retry/hint
- difficulty
- learning event logging

### P7 · Polish
- Android
- performance
- loading
- save recovery
- error handling

## 8. Codex JNG-000 Audit Prompt

Read only:
- root `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- this file
- GitHub Issue JNG-000
- targeted jungle files discovered from those documents

Do not implement new gameplay yet.
Produce:
1. actual jungle routes and entry points
2. canonical runtime recommendation
3. `keep / migrate / legacy / delete-later` file classification
4. state/save/question/collection dependency map
5. movement/camera/game-loop technical risks
6. test coverage and missing tests
7. P0/P1 backlog ordered by impact and risk

## 9. Manus JNG-000 Audit Prompt

Evaluate the currently used character-movement Jungle game as a game for a young child.
Do not redesign unrelated portal screens.
Report:
1. first 30-second comprehension
2. movement and joystick feel
3. player facing/animation quality
4. camera behavior
5. jungle density and exploration feeling
6. bird discovery/capture feedback
7. quiz interruption cost
8. HUD clutter/readability
9. portrait/landscape mobile usability
10. top 10 improvements ranked P0/P1/P2

For every item use:
`problem / why it matters / recommended change / priority`.
