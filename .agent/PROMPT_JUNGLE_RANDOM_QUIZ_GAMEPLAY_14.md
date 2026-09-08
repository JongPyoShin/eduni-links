# PROMPT_JUNGLE_RANDOM_QUIZ_GAMEPLAY_14

## Mission
PROMPT 13까지 정글 어드벤처의 기능/실제 Chrome 플레이/시각 고급화는 안정화되었다.
다음 목표는 이미 확보된 **265문항 문제은행을 실제 5개 스테이지 플레이에 연결하여, 매 플레이마다 3문항이 실제로 랜덤 출제되고 반복 플레이 때 문제 조합이 달라지는 구조**를 완성하는 것이다.

이번 작업은 단순 테스트용 random picker 추가가 아니다.
**Camp / Waterfall / Cave / Giant Tree / Sky Ridge의 실제 플레이 UI에서 랜덤 문제를 풀고, 정답 수에 따라 기존 성공/실패/보상/잠금해제 흐름이 그대로 동작해야 한다.**

기존 기준:
- `BIRD_QUIZ_BANK`: 265문항
- `QUIZ_LENGTH = 3`
- `PASS_THRESHOLD = 2`
- `pickQuestions()` / `createBirdQuizSession()` 존재
- PROMPT 12 headed Chrome acceptance PASS
- PROMPT 13 visual acceptance 24/24 PASS

---

# 0. 시작 전 브랜치/REPORT 정리 — 필수

현재 원격에서 확인된 상태:
- `main`: `225f5b548f66823cdd6fa9a5c124ea7413441a26`
- `prototype/jungle-web-canvas-poc`: `9f03c48d8cc4d56e7a4226ff36ee38a8d868256a`
- `225f5b5`의 parent는 `9f03c48`이므로 PROMPT 13 구현은 main에만 올라가 있고 prototype이 한 커밋 뒤처져 있다.
- `jungle-web-canvas-poc/.agent/REPORT_JUNGLE_VISUAL_EXPERIENCE_UPGRADE_13.md`의 `FINAL HEAD`는 아직 `TBD`다.

작업 시작 시 반드시:

```bash
git remote -v
git status --short
git fetch origin main prototype/jungle-web-canvas-poc
```

1. 원격이 `JongPyoShin/eduni-links`인지 확인.
2. 로컬 변경이 있으면 보존한다. `reset --hard`, `clean -fd`, force push 금지.
3. `origin/prototype/jungle-web-canvas-poc`가 `origin/main`의 ancestor이고 차이가 PROMPT 13 + 본 지시서 문서뿐인지 확인.
4. 안전한 fast-forward가 가능하면 `prototype/jungle-web-canvas-poc`에 최신 main을 fast-forward 반영하고 push.
5. PROMPT 13 REPORT의 functional FINAL HEAD는 `225f5b5`로 고친다.
6. 브랜치 관계가 예상과 다르면 임의 merge하지 말고 REPORT에 BLOCKED 사유를 남긴다.

**PROMPT 14 실제 기능 개발은 `prototype/jungle-web-canvas-poc`에서 진행한다.**

---

# 1. 절대 보존 조건

다음은 깨지면 즉시 FAIL이다.

- Hub → 5 stages 순차 unlock
- Camp / Waterfall / Cave / Giant Tree / Sky Ridge 기존 이동/상호작용
- 발견/마일스톤 5/5
- reward/badge 5/5
- `배지 5 / 5 · 정글 탐험 완주!`
- mid/final reload persistence
- completed stage re-entry 시 중복 reward 없음
- keyboard / mouse / tablet touch
- portrait/landscape resize
- PROMPT 13 시각 효과 유지
- pageerror / gameplay console.error 0
- 기존 unit tests 전체 PASS

문제 randomization 때문에 stage geometry, player movement, collision, reward ID, storage key, unlock rule을 변경하지 않는다.

---

# 2. 현재 문제점

문제은행 자체는 265문항이고 `pickQuestions()`도 있지만, 실제 stage gameplay에는 과거 clue별 고정 question ID 또는 제한된 mapping이 남아 있다.

즉 현재는:

```text
265문항 존재
      ↓
실제 게임에서는 일부 고정/좁은 문제만 반복
```

이번 목표:

```text
265문항 bank
      ↓
stage별 theme pool
      ↓
현재 browser adventure session에서 사용하지 않은 문제 우선
      ↓
stage attempt 시작 시 3개 랜덤 선택
      ↓
실제 modal에 1 → 2 → 3번 표시
      ↓
2/3 이상 성공, 0~1/3 실패
      ↓
기존 discovery/reward/unlock으로 연결
```

---

# 3. 문제은행 보존

`BIRD_QUIZ_BANK`는 현재 **정확히 265문항**이다.

이번 작업에서:
- 기존 265문항을 삭제하지 않는다.
- 정답을 gameplay randomization에 맞추기 위해 임의 변경하지 않는다.
- 문제 품질 결함을 발견한 경우 별도 명확한 이유와 테스트를 남긴 최소 수정만 허용.
- 4지선다 구조 유지.
- `id`, `category`, `question`, `choices`, `answer`, `explanation` contract 유지.

기존 `bird_quiz.js`의 다음 contract 유지:

```js
QUIZ_LENGTH === 3
PASS_THRESHOLD === 2
```

---

# 4. Stage Theme Pool

265문항 전체에서 무작정 3개를 뽑지 않는다.
각 스테이지는 장소/단서와 최소한 납득 가능한 **theme pool**을 가져야 한다.

작업 시작 시 265문항의 category와 question text를 실제 분석하여 stage별 pool을 만든다.

권장 구현:

`src/content/stage_quiz_pools.js`

예시 API:

```js
getStageQuizPool(stageId, bank)
pickStageQuestions(stageId, bank, usedIds, rng)
```

구현 방식은 category filter 또는 curated ID allowlist 모두 가능하다.
단, category만으로 주제가 너무 넓어 어색한 문제가 섞이면 curated allowlist를 사용한다.

## Pool 품질 기준

각 stage pool:
- 최소 **20문항 이상**
- 모두 실제 `BIRD_QUIZ_BANK`의 ID
- duplicate ID 0
- 7~8세 수준의 현재 bank 범위 유지
- stage 분위기와 완전히 무관한 문항이 대량 섞이지 않을 것

예시 방향:
- Camp: 새/숲/자연/생활 관찰
- Waterfall: 물/날씨/자연/기초 과학
- Cave: 빛/소리/동물/자연/기초 과학
- Giant Tree: 나무/식물/숲/생태/관찰
- Sky Ridge: 하늘/바람/구름/빛/기초 과학

**예시는 방향일 뿐이며 실제 bank 내용을 보고 결정한다.**

REPORT에 각 stage pool count와 대표 question ID 10개 이상을 기록한다.

---

# 5. Randomization Contract

## 5.1 한 stage attempt

한 번의 stage attempt가 시작되면:
- 정확히 3문항 선택
- 3개 question ID 모두 서로 다름
- 문제 순서 랜덤
- 각 문제 choices 순서도 랜덤 가능

단, 같은 질문 modal을 닫았다가 다시 열거나 interaction을 재입력했다고 **질문 자체가 reroll되면 안 된다.**

즉:

```text
attempt 시작 → [qA, qB, qC] 고정
modal close/reopen → 현재 qA 유지
다음 문제 → qB
다음 문제 → qC
```

## 5.2 Adventure browser session 중복 방지

같은 browser session에서 Hub부터 5개 stage를 한 번 완주하면 총 15문항을 보게 된다.

**이 15문항의 question ID는 모두 달라야 한다.**

권장:
- `sessionStorage`에 used question IDs 저장
- 예: `eduni.jungle.quizUsedIds.v1`
- stage selector가 현재 pool에서 used ID를 먼저 제외
- pool 부족 시에만 명확한 fallback

`localStorage` 영구 저장은 사용하지 않는다.
새 브라우저 session에서는 새 random sequence가 자연스럽게 시작되어야 한다.

## 5.3 Retry / replay

실패 후 명시적 retry 또는 stage를 새 attempt로 다시 시작할 때:
- 새 3문항을 선택
- 직전 attempt 3문항과 동일한 세트가 나오지 않도록 우선 제외
- pool 크기가 충분하면 직전 문제와 immediate repeat 0

completed stage re-entry는 기존 reward를 다시 지급하면 안 된다.
퀴즈를 다시 제공하는 UX를 유지할지 skip할지는 기존 stage semantics를 우선하되, reward duplicate 0은 필수다.

---

# 6. RNG / Testability

현재 `pickQuestions(bank, count, rng)`처럼 RNG injection 가능한 pure function 구조를 유지/확장한다.

허용:
- unit test에서 seeded RNG 사용
- selector pure function 테스트

금지:
- production UI에서 테스트용 fixed answer injection
- URL query로 정답 강제
- 전용 production backdoor
- DOM에서 직접 progression state 설정
- localStorage에 진행 state 사전 주입

`currentQuestion()`에서 choice shuffle까지 재현 가능한 테스트가 필요하다면 RNG 전달 구조를 개선해도 된다.
단 gameplay 결과는 Math.random 기반 자연 랜덤이어야 한다.

---

# 7. 실제 5개 Stage 연결

모든 stage가 실제 random pool을 사용해야 한다.

## Camp
- 기존 clue progression 유지
- clue 3개에서 고정 question ID를 직접 참조하는 구조 제거/대체
- attempt용 3문항 random session과 실제 modal 연결
- Bluebird 성공 조건: 2/3 이상

## Waterfall
- echo / mistTrail / waterDrops 기존 clue 순서 유지
- q008/q002/q039 같은 고정 의존이 있으면 제거/대체
- Kingfisher reward는 2/3 이상에서만 기존대로 지급

## Cave
- 기존 8-step exploration 흐름 유지
- fireflyPattern 3 rounds를 random pool 3문항과 연결
- Bat milestone/reward semantics 유지

## Giant Tree
- 기존 8-step exploration 흐름 유지
- treeRing 3 rounds를 random pool 3문항과 연결
- Squirrel milestone/reward semantics 유지

## Sky Ridge
- corridor / windRibbon / cloudShadow / windChime 진행 유지
- 기존 q019/q015/q017 같은 고정 mapping 제거/대체
- Hawk encounter/reward 2-step 흐름 유지

---

# 8. 정답/실패 규칙

모든 stage에서 공통 기준:

### 3/3
Expected:
- success
- discovery/milestone 완료
- 해당 reward 정확히 1회 지급

### 2/3
Expected:
- success
- discovery/milestone 완료
- reward 정확히 1회 지급

### 1/3
Expected:
- fail
- reward 없음
- complete flag가 잘못 true가 되지 않음
- retry 가능

### 0/3
Expected:
- fail
- reward 없음
- retry 가능

오답 feedback:
- 정오 여부 표시
- explanation null/undefined 금지
- 다음 문제 진행 정상
- rapid input으로 한 문제에 score가 2번 올라가지 않음

---

# 9. Unit Tests — 필수

기존 테스트에 추가한다.

최소 TC:

### TC-RNG-001 Bank integrity
- 정확히 265문항
- unique ID 265
- question/choices/answer/explanation contract 정상

### TC-RNG-002 Stage pool integrity
- 5개 stage 모두 pool 존재
- 각 pool >=20
- pool ID는 전부 bank에 존재
- stage pool 내부 duplicate 0

### TC-RNG-003 Pick exactly 3
- 모든 stage에서 정확히 3개

### TC-RNG-004 No duplicate within attempt
- 각 attempt 3개 unique
- 1000 iterations 이상

### TC-RNG-005 Adventure session no duplicate
- Camp→Waterfall→Cave→GiantTree→SkyRidge 15개 선택 simulation
- 15 question IDs unique
- 500 simulated adventures 이상

### TC-RNG-006 Replay variation
- deterministic seeded RNG 여러 seed로 실행
- stage마다 최소 10개 이상의 서로 다른 question ID가 관찰될 것
- 매번 같은 3문항만 나오는 구현은 FAIL

### TC-RNG-007 Immediate retry variation
- 직전 3문항 exclude 후 새 attempt
- pool 여유가 있을 때 overlap 0

### TC-RNG-008 Pass threshold
- 3/3 success
- 2/3 success
- 1/3 fail
- 0/3 fail

### TC-RNG-009 Stable current question
- modal close/reopen에 현재 question ID 변화 없음

### TC-RNG-010 Double-answer guard
- 동일 question에 answer 2회 호출해도 score/progression 중복 증가 없음 또는 UI 레벨에서 2번째 입력 차단

기존 unit test 수가 증가할 수 있으므로 완료 기준은 `201 이상, fail 0`이다.

---

# 10. Headed Chrome 실제 Acceptance QA — 필수

**반드시 실제 Google Chrome headed mode**:

```js
chromium.launch({ channel: "chrome", headless: false })
```

headless smoke만 돌리고 PASS 처리 금지.
headed Chrome이 실행 불가하면 **BLOCKED**.

신규 권장 스크립트:

`tools/browser/jungle_random_quiz_acceptance_qa.mjs`

## RUN A — Desktop Full Adventure / 3-of-3
Viewport: 1280×800

Hub fresh 0/5 → 5 stages 전부 실제 플레이.

각 stage:
- 실제 UI에 3개의 서로 다른 question ID 등장
- visible question text 확인
- 4 choices 확인
- 전부 정답 선택

Expected:
- 5 stages success
- 총 15 question IDs unique
- rewards 5/5
- final Hub `배지 5 / 5 · 정글 탐험 완주!`
- reload 후 5/5
- errors 0

## RUN B — Desktop Replay / Variation + 2-of-3
Fresh browser context/session.

5 stages를 다시 플레이하되 각 stage에서 일부러 1개 오답 + 2개 정답.

Expected:
- 각 stage 2/3 success
- rewards 5/5
- RUN A와 각 stage의 3문항 set이 전부 동일해서는 안 됨
- 전체 15문항 중 RUN A 대비 충분한 variation 존재
- 최소 각 stage에서 1개 이상 question ID가 RUN A와 달라야 함

## RUN C — Negative / Retry
Fresh context.

Camp 또는 Waterfall에서:
- 0/3 또는 1/3

Expected:
- fail
- reward 없음
- Hub progress 증가 없음

그 후 명시적 retry:
- 새 attempt question set이 직전 set과 다름
- 2/3 또는 3/3로 성공
- reward 정확히 1회

추가:
- modal Escape/close → reopen 시 current question 동일
- rapid A/click 5회 → score duplicate 없음
- reload → corruption 없음

## RUN D — Tablet Touch
Viewport: 800×1280, `hasTouch:true`

최소:
- Hub
- Camp full quiz
- Waterfall full quiz
- Cave/GiantTree/SkyRidge quiz UI smoke 또는 가능하면 full run

Expected:
- 4 choices touch 가능
- text clipping 0
- D-pad/modal overlap 0
- portrait→landscape→portrait resize 후 정상

---

# 11. Visual/UX 기대 결과

PROMPT 13 시각 개선을 유지하면서 quiz UI가 어색해지지 않아야 한다.

각 question modal:
- 문제 번호 `1/3`, `2/3`, `3/3` 인지 가능
- question text 전체 읽힘
- 정확히 4 choices
- 선택 상태 명확
- 오답/정답 feedback 읽힘
- explanation 읽힘
- 다음 문제 이동 명확

7세 아이가 같은 문제를 반복해서 보는 느낌이 줄어야 한다.

---

# 12. Randomness Evidence

REPORT에 반드시 실제 question ID를 기록한다.

예:

```text
RUN A
Camp      q101 q044 q233
Waterfall q008 q181 q129
Cave      q203 q061 q145
Tree      q077 q211 q034
Sky       q019 q155 q260
Unique = 15/15

RUN B
...
```

단 위 ID는 예시이며 실제 결과를 기록한다.

추가 통계:
- 500~1000 simulated adventures
- duplicate within attempt count
- duplicate across 15-question adventure count
- stage별 observed unique count
- retry overlap count

Expected:
- within-attempt duplicate = 0
- adventure 15 duplicate = 0
- replay variation 확인

---

# 13. Persistence / sessionStorage

`sessionStorage`를 사용한다면 명확히 테스트한다.

Expected:
- stage page 이동/Hub 복귀 후 used-question IDs 유지
- browser 새 context에서는 초기화
- reward persistence(localStorage)와 독립
- reward key를 건드리지 않음
- mid-game reward reload 기존 동작 유지

session quiz history가 깨져도 gameplay progression/reward가 손상되지 않는 fallback을 둔다.

---

# 14. Error / Network

수집:
- `pageerror`
- `console.error`
- non-vendor HTTP >=400

Expected:
- gameplay pageerror = 0
- gameplay console.error = 0
- non-vendor response error = 0

기존 vendor GLB 404는 별도 expected warning으로 기록할 수 있으나 숨기지 말고 count를 REPORT에 남긴다.

---

# 15. Regression

PROMPT 14 완료 후 반드시:

1. `node --test`
2. 기존 full adventure E2E
3. 기존 real Chrome acceptance 또는 핵심 regression
4. visual acceptance 핵심 smoke
5. `git diff --check`

Expected:
- tests >=201, fail 0
- full adventure 5/5
- persistence 5/5
- visual effects 유지
- random quiz acceptance PASS

---

# 16. 금지사항

FAIL 처리:
- stage 위치 teleport
- player 좌표 직접 write
- progression state injection
- answer key를 DOM 밖에서 직접 stage complete 처리
- localStorage reward 사전 주입
- 고정 3문항인데 테스트만 random처럼 꾸미기
- E2E에서 production function을 직접 호출하여 완료시키기
- `page.evaluate()`로 게임 진행값 변경
- headless 결과를 headed PASS라고 기록
- 테스트 통과를 위해 시각 효과 제거
- PROMPT 13 구현을 prototype에 반영하지 않고 별도 stale branch에서 작업

읽기 전용 `getState()`, DOM, localStorage/sessionStorage observation은 증거 수집 용도로 허용.

---

# 17. Screenshot Evidence

경로 예:

`jungle-web-canvas-poc/artifacts/jungle-random-quiz-qa/`

최소 **60 screenshots**.

포함:
- Hub fresh/final
- 5 stages quiz 1/2/3
- wrong feedback
- 2/3 success
- fail result
- retry new questions
- final reward
- tablet quiz
- resize

스크린샷 수만 채우는 반복 캡처 금지.

---

# 18. 구현 범위 권장

주요 후보 파일:

- `src/content/bird_quiz.js`
- `src/content/bird_quiz_bank.js` (가능하면 데이터 변경 없음)
- `src/content/stage_quiz_pools.js` 신규 권장
- `src/game.js`
- `src/waterfall_game.js` 또는 실제 Waterfall game file
- `src/cave_game.js`
- `src/giant_tree_game.js`
- `src/sky_ridge_game.js`
- stage chapter/state helper
- tests
- browser QA script

파일명은 실제 repo 구조 확인 후 사용한다.

중복 randomization 로직을 각 stage에 복붙하지 말고 공통 selector/session helper를 우선한다.

---

# 19. REPORT

신규:

`jungle-web-canvas-poc/.agent/REPORT_JUNGLE_RANDOM_QUIZ_GAMEPLAY_14.md`

반드시 포함:

1. START HEAD
2. FINAL functional HEAD
3. branch reconciliation 결과
4. PROMPT 13 REPORT FINAL HEAD 정리 결과
5. changed files
6. bank count 265 확인
7. stage별 pool definition/count
8. stage별 대표 pool IDs
9. random selector architecture
10. session duplicate policy
11. retry policy
12. Run A 결과 + 실제 15 IDs
13. Run B 결과 + 실제 15 IDs
14. Run A/B variation 비교
15. Run C fail/retry 결과
16. Run D tablet 결과
17. 3/3 결과
18. 2/3 결과
19. 1/3 결과
20. 0/3 결과
21. modal close/reopen evidence
22. rapid input evidence
23. persistence evidence
24. reward 5/5 evidence
25. Hub final text
26. screenshots count/path
27. pageerror/console/network
28. vendor warning count
29. unit test count
30. full adventure regression
31. visual regression
32. `git diff --check`
33. prohibited actions count
34. remaining risks
35. final PASS / FAIL / BLOCKED

---

# 20. PASS Gate

**PASS는 아래 전부 만족할 때만 가능하다.**

- PROMPT 13 구현이 prototype 기준선에 안전하게 반영됨
- 265 bank 유지
- 5 stage theme pools 정상
- 각 stage 실제 UI에서 random 3문항
- attempt 내부 duplicate 0
- full adventure 15문항 duplicate 0
- replay variation 확인
- 2/3 success
- 3/3 success
- 0~1/3 fail/no reward
- retry에서 새 문제 조합
- reward duplicate 0
- Hub 5/5 complete
- reload persistence 유지
- headed Chrome desktop PASS
- headed Chrome negative/recovery PASS
- tablet touch PASS
- errors 0
- unit tests >=201, fail 0
- regression PASS
- screenshots >=60
- production test backdoor 0

하나라도 충족하지 못하면 PASS라고 쓰지 않는다.

---

# 21. Commit / Push

기능 + 테스트 + QA script + REPORT를 commit/push한다.

작업 대상 branch:

`prototype/jungle-web-canvas-poc`

main으로 merge하지 않는다.
force push하지 않는다.

REPORT FINAL HEAD는 기능 커밋 SHA를 실제 값으로 기록한다.
필요하면 기능 커밋 후 REPORT FINAL HEAD만 수정하는 documentation follow-up commit을 추가한다.

최종 응답은 짧게:

```text
STATUS: PASS/FAIL/BLOCKED
FUNCTIONAL SHA: ...
REPORT SHA: ...
TESTS: ...
HEADED CHROME: ...
RANDOM: 15/15 unique, replay variation ...
```
