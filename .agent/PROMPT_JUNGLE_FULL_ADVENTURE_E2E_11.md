# PROMPT_JUNGLE_FULL_ADVENTURE_E2E_11

## Mission
현재까지 개별 검증된 Camp / Waterfall / Cave / Giant Tree / Sky Ridge를 **한 번의 실제 플레이 흐름**으로 연결해 처음부터 끝까지 완주한다.

목표는 단순히 각 스테이지 URL이 열리는지 확인하는 것이 아니다.

**Camp → Waterfall → Cave → Giant Tree → Sky Ridge → 발견/마일스톤 5/5 + 보상 5/5 → 정글 탐험 완주**를 실제 사용자 입력만으로 끝까지 진행하고, 중간 저장/재로드/보상 누적까지 검증한다.

참고: bat(Cave)와 squirrel(Giant Tree)는 birdCodex에 등록되지 않는다 (captureBird 미호출). 5/5는 **스테이지 보상(badge) 5개** 기준이다: bluebird-feather, kingfisher-drop, firefly-crystal, ancient-seed, sky-star.

## Branch
`prototype/jungle-web-canvas-poc`

작업 시작 전 반드시 최신 원격을 반영한다.

```bash
git fetch origin prototype/jungle-web-canvas-poc
```

기준 HEAD는 작업 시작 시점의 최신 `origin/prototype/jungle-web-canvas-poc`로 기록한다.

현재 확인된 기준선은 `329d5a9`이며 이후 커밋이 있으면 최신 원격을 우선한다.

---

## 이미 완료된 기반 작업
이번 작업은 아래 결과를 깨뜨리면 안 된다.

- 07 Waterfall reward finalize: 실제 입력으로 `rewardComplete:true`
- 08 Cave/GiantTree: 두 스테이지 real-input E2E, reward=true
- 09 Quiz bank: 총 265문항, 실제 `pickQuestions()` 기반 세션 중복 방지 검증
- 10 Tablet/Touch/Perf QA: 4 viewport × 5 stages PASS

기존 개별 E2E를 다시 우회 구현하지 말고, **통합 플레이에서 실제로 이어지는지**를 검증한다.

---

# 1. 최종 사용자 플레이 흐름

새 브라우저 컨텍스트에서 Camp부터 시작한다.

```text
Camp
  ↓
Waterfall
  ↓
Cave
  ↓
Giant Tree
  ↓
Sky Ridge
  ↓
도감 5종 등록
  ↓
보상/배지 5 / 5
  ↓
정글 탐험 완주
```

### 기대 발견/마일스톤 (스테이지 완료 기준)
1. Camp → Bluebird 발견 + bluebird-feather 배지
2. Waterfall → Kingfisher 발견 + kingfisher-drop 배지
3. Cave → Bat 발견 + firefly-crystal 배지
4. Giant Tree → Squirrel 발견 + ancient-seed 배지
5. Sky Ridge → Hawk 발견 + sky-star 배지

### 기대 보상 (스테이지 배지)
- Camp: 파랑새 깃털 배지 (bluebird-feather)
- Waterfall: 물총새 물방울 배지 (kingfisher-drop)
- Cave: 반딧불 수정 배지 (firefly-crystal)
- Giant Tree: 고목 씨앗 배지 (ancient-seed)
- Sky Ridge: 하늘별 배지 (sky-star)

최종 Hub에 **배지 5 / 5 및 완주 상태**가 보여야 한다.

---

# 2. 가장 중요한 원칙 — REAL INPUT ONLY

첫 진입 이후 진행은 실제 플레이어가 할 수 있는 입력만 사용한다.

허용:
- `page.keyboard.down/up/press()`
- Arrow keys / WASD
- A / Enter / Space
- B / Escape
- 실제 D-pad / A / B DOM click/tap
- 실제 화면에 존재하는 다음 지역/확인/도감 버튼 click
- DOM text/visibility 읽기
- 공개 read-only game state (`getState()`) 읽기
- 플레이어 좌표 읽기

## 절대 금지
다음 중 하나라도 사용하면 FAIL이다.

- player 좌표 직접 대입 / teleport
- `evaluate()`로 progression/state 값 수정
- `rewardComplete`, quiz score, clue state 강제 변경
- DOM `style/display/visibility` 강제 변경
- hidden QA progression helper 호출
- 내부 `completeStep()`, `advance()`, `unlock()`, `finishReward()` 같은 진행 함수 직접 호출
- localStorage/sessionStorage에 도감/보상/진행 상태 직접 주입
- production 코드에 E2E 전용 backdoor 추가
- 정답을 내부 answer key/state에서 읽어서 직접 주입
- 첫 스테이지 이후 URL을 임의로 바꿔 다음 스테이지를 건너뛰는 방식

`evaluate()`는 **읽기 전용 관찰**에만 허용한다.

---

# 3. Stage transition 검증

이번 Prompt의 핵심은 5개 스테이지를 따로 여는 것이 아니라 **Hub 내비게이션을 통해 다음 지역에 도달하는 것**이다.

### 원칙
- 첫 진입은 Hub URL(`jungle-hub.html`)을 직접 연다.
- Hub에서 각 스테이지 `<a href>` 링크를 **click**하여 진입한다.
- 스테이지 완료 후 `page.goBack()`으로 Hub로 돌아간다.
- Hub를 `page.reload()`하여 배지 상태를 갱신하고 다음 스테이지 잠금 해제를 확인한다.
- **`page.goto`를 사용하지 않는다** (첫 Hub 진입 제외).
- `page.goBack()` + `page.reload()` 조합으로 Hub ↔ 스테이지를 오간다.

### transition마다 확인
- 이전 stage reward 완료
- 배지/보상 누적
- Hub에서 다음 stage 잠금 해제 확인
- 이전 stage 데이터 유실 없음
- console/page error 없음

---

# 4. 각 Stage 완주 기준

## Camp
실제 탐험 → 단서/quiz → Bluebird 발견 → 포획 성공 → 도감 등록 → reward 완료.

반드시 성공 경로를 실제 입력으로 완료한다.

## Waterfall
기존 07에서 검증한 자연스러운 reward reveal 흐름을 유지한다.

- clue/quiz 실제 입력
- Kingfisher 발견
- reward panel 자연 reveal
- 실제 A/Enter 확인
- `rewardComplete:true`

## Cave
08 흐름을 실제 통합 세션에서도 그대로 수행한다.

```text
caveGate
→ glowTrail
→ echoCrystal
→ shadowMark
→ fireflyPattern (3 round)
→ crystalBridge
→ bat
→ reward
```

## Giant Tree
```text
rootGate
→ barkPattern
→ seedTrail
→ hollowEcho
→ treeRing (3 round)
→ canopyStairs
→ squirrel
→ reward
```

## Sky Ridge
실제 이동/상호작용 → quiz → Hawk 발견 → reward 완료.

기존 real-input E2E에서 확인된 confirm gate / bridge ordering을 유지한다.

---

# 5. Quiz / Random bank 실제 게임 연결 확인

현재 quiz bank는 265문항이다.

통합 플레이에서 다음을 기록한다.

- 실제 표시된 question id/text
- 각 stage에서 실제 출제된 문제 수
- 한 quiz session 안에서 동일 question id 중복 0
- choice 4개 정상 표시
- 선택 후 feedback 정상 표시
- PASS threshold 및 reward 진행 정상

정답 선택은 **화면에 표시된 UI와 피드백을 따라 플레이**한다.
내부 answer state/key를 읽어서 정답을 자동 주입하지 않는다.

가능하면 통합 E2E를 3회 실행해 출제 조합이 고정 3문제만 반복되지 않는지도 evidence로 남긴다.

---

# 6. Persistence / Reload 검증

통합 완주 후 반드시 저장 지속성을 검증한다.

## 필수
1. 5개 stage 모두 reward 완료
2. 배지 5개 확인 (stageRewards: bluebird-feather, kingfisher-drop, firefly-crystal, ancient-seed, sky-star)
3. 페이지 reload
4. 다시 UI에서 다음이 유지되는지 확인
   - 배지 5 / 5
   - 최종 완주 상태

가능하면 중간에도 1회 reload한다.

권장 지점:
- Waterfall 완료 후 reload
- 도감/보상 누적 유지 확인
- 정상적으로 다음 지역 진행

### 금지
Persistence 검증을 위해 localStorage 값을 직접 쓰지 않는다.

읽기는 보조 evidence로만 허용하며, 최종 판정은 UI 또는 공개 read-only game state로 확인한다.

---

# 7. E2E script

신규 또는 통합 스크립트:

`jungle-web-canvas-poc/tools/browser/jungle_full_adventure_e2e.mjs`

기존 스크립트의 real-input helper를 재사용해도 된다.

재사용 후보:
- `jungle_real_input_e2e.mjs`
- `cave_gianttree_e2e.mjs`
- tablet QA helper

단, 복사/붙여넣기로 동일 로직을 여러 벌 만들기보다 공통 helper 추출이 안전하면 최소 범위에서 정리한다.

---

# 8. E2E 실행 횟수

## 필수 Run A — Full clean run
새 browser context에서 Hub부터 시작해 Camp → Waterfall → Cave → Giant Tree → Sky Ridge까지 완주.
Hub 내비게이션 클릭으로 스테이지 간 이동 (page.goto 사용 금지).

## 필수 Run B — Persistence run
완주 상태 reload 후 배지 5/5 유지 확인.

## 권장 Run C/D — Random quiz variation
새 context로 통합 또는 quiz 관련 구간을 반복해 실제 출제 조합 변화 확인.

---

# 9. Screenshot evidence

최소 **30장**.

권장:
- 각 stage 시작 1
- 핵심 clue/interaction 1
- quiz 1
- 동물 발견 1
- reward 완료 1

5 stages × 5 = 25장 이상

추가:
- 도감 5종
- reward 5/5
- 최종 완주 화면
- reload 후 persistence
- 필요 시 오류/회귀 증거

저장 위치:

`jungle-web-canvas-poc/artifacts/jungle-full-adventure-e2e/`

artifact가 gitignored이면 REPORT에 파일 수/경로/크기를 기록한다.

---

# 10. Error policy

반드시 수집:
- `pageerror`
- `console.error`
- failed requests

### FAIL
- JS runtime/page error
- stage progression error
- reward/codex persistence error
- 입력 먹통
- modal stuck
- route dead-end
- blank canvas

기존 vendor GLB 404가 procedural fallback으로 처리되는 경우:
- 별도 expected asset warning으로 분류
- JS/gameplay error와 섞지 않는다
- 신규 404는 FAIL 후보로 조사

---

# 11. Regression tests

작업 완료 전 반드시:

```bash
node --test
git diff --check
```

기준:
- 전체 test 0 fail
- 기존 Camp/Waterfall/Cave/GiantTree/Sky Ridge 단위/계약 테스트 회귀 없음
- quiz bank 265문항 유지
- `pickQuestions()` 500회 dedup 테스트 유지
- tablet/touch 관련 기존 테스트/구조 회귀 없음

생산 코드 수정이 발생했다면 수정 이유와 영향 범위를 REPORT에 명확히 적는다.

---

# 12. PASS 기준

다음 모두 만족해야 **PASS**다.

- [ ] Camp부터 시작
- [ ] Waterfall 실제 내부 transition
- [ ] Cave 실제 내부 transition
- [ ] Giant Tree 실제 내부 transition
- [ ] Sky Ridge 실제 내부 transition
- [ ] 5개 stage 모두 real input 완주
- [ ] teleport 0
- [ ] state injection 0
- [ ] DOM force 0
- [ ] storage injection 0
- [ ] direct progression call 0
- [ ] Bluebird 등록
- [ ] Kingfisher 등록
- [ ] Bat 등록
- [ ] Squirrel 등록
- [ ] Hawk 등록
- [ ] reward/badge 5 / 5
- [ ] 최종 정글 탐험 완주 표시
- [ ] reload 후 도감/5/5/완주 유지
- [ ] quiz session 내 중복 0
- [ ] screenshot >= 30
- [ ] pageerror 0
- [ ] 전체 `node --test` 0 fail
- [ ] `git diff --check` clean

하나라도 핵심 항목이 미충족이면 PASS라고 쓰지 않는다.

---

# 13. Report

작성:

`.agent/REPORT_JUNGLE_FULL_ADVENTURE_E2E_11.md`

반드시 포함:

1. START HEAD
2. FINAL HEAD
3. changed files
4. production code 변경 여부
5. 실제 5-stage route
6. stage별 시작/완료/reward 결과
7. 동물/도감 등록 결과
8. reward/badge 5/5 결과
9. quiz 실제 출제 evidence
10. reload/persistence 결과
11. screenshot 수/경로
12. pageerror/console/request failure 집계
13. `node --test` 결과
14. `git diff --check` 결과
15. 금지행위 사용 여부를 명시적으로 0건 표기
16. 남은 이슈
17. 최종 PASS/FAIL

REPORT에 단순 주장만 쓰지 말고 E2E 로그/DOM/read-only state에서 관찰한 구체 evidence를 적는다.

---

# 14. Deliverable

필요한 코드 수정 + E2E script + REPORT를 한 작업으로 commit/push 한다.

```text
code (필요할 때만)
+ jungle_full_adventure_e2e.mjs
+ REPORT_JUNGLE_FULL_ADVENTURE_E2E_11.md
```

최종적으로:

```bash
git status
git log -1 --oneline
git push origin prototype/jungle-web-canvas-poc
```

remote branch가 FINAL HEAD와 동일한지 확인한다.

**merge/close 금지.**