# EDUNI PROMPT 06 — 바둑 초보자 실시간 코치

## 작업 기준
- 대상 브랜치: `feature/eduni-space-mvp`
- 이 문서 작성 시 원격 HEAD: `c3f43ce5d83d03df4f3934d63687df072fbec0e4`.
- 시작 시 반드시 `git fetch` 후 remote/branch/HEAD 확인.
- 더 최신 원격 HEAD가 있으면 최신 HEAD를 안전하게 반영한 뒤 진행하고 다른 작업을 덮어쓰지 말 것.
- `git reset --hard`, `git clean`, `docker compose down -v`, force-push 금지.
- merge/PR close 금지.

## 먼저 읽기
1. `/AGENTS.md`
2. `/nice-gui-1-1-7/AGENTS.md`
3. `.agent/PROMPT_EDUNI_BADUK_GAME_04.md`
4. `.agent/PROMPT_EDUNI_BADUK_VERIFY_FIX_05.md`
5. `.agent/REPORT_EDUNI_BADUK_VERIFY_FIX_05.md`
6. 현재 구현
   - `nice-gui-1-1-7/portal_app/static_games/eduni_baduk.html`
   - `nice-gui-1-1-7/portal_app/baduk.py`
   - `nice-gui-1-1-7/tests/test_baduk_game.py`

## 배경
현재 바둑은 9×9 입문 게임으로 포획, 활로, 자충, simple ko, 패스, 기권, 영역 점수, 입문 AI가 동작한다.
하지만 바둑을 처음 접하는 사용자는 다음을 알기 어렵다.

- 내가 이 자리에 두어도 되는가?
- 안 된다면 왜 안 되는가?
- 둘 수는 있지만 위험한 자리인가?
- 이곳에 두면 무엇이 달라지는가?
- 상대/AI는 방금 왜 그 자리에 두었는가?

이번 작업의 핵심은 **착수 전 실시간 설명 + 착수 후 상대 수 설명을 그림과 짧은 문장으로 보여주는 초보자 코치**다.

중요: 이것은 강한 바둑 AI를 만드는 작업이 아니다. 기존 rule engine과 기존 AI의 실제 판단 근거를 사용해 초보자가 이해할 수 있게 시각화한다.

---

# 1. 최종 UX 목표

## 1.1 초보자 코치 토글
게임 화면에 명확한 토글을 추가한다.

예:
- `초보자 코치 ON`
- `초보자 코치 OFF`

기본값:
- AI와 두기: ON
- 로컬 둘이 두기: ON이어도 되지만 상대 의도를 추측하지 말고 실제 판 변화만 설명한다.

코치 OFF에서는 현재 게임의 **즉시 한 번 클릭/탭 착수 UX를 그대로 유지**해야 한다.

## 1.2 코치 ON — 착수 전 2단계 입력
빈 교차점을 클릭/탭했을 때 바로 돌을 놓지 않는다.

1. 후보 위치를 선택한다.
2. 반투명 가상 돌(ghost stone)과 실시간 코치 팝업을 표시한다.
3. 팝업에서 `여기에 두기`를 눌러야 실제 착수한다.
4. `다른 곳 보기` 또는 다른 교차점 선택 시 후보가 바뀐다.

불법 착수라면:
- 실제 보드는 절대 변경하지 않는다.
- `여기에 두기` 버튼은 숨기거나 disabled.
- 왜 둘 수 없는지 그림 + 짧은 문장으로 설명한다.

## 1.3 문구는 “규칙상 가능”과 “좋은 수”를 구분
절대 다음처럼 잘못 가르치지 말 것.
- `둘 수 있어요 = 좋은 수예요`

대신:
- `규칙상 둘 수 있어요.`
- `다만 활로가 1개뿐이라 위험해요.`
- `상대 돌 2개를 잡을 수 있어요.`

전략적 최선수를 단정하지 않는다.

---

# 2. 착수 전 실시간 분석

순수 함수 형태의 분석 로직을 추가한다. 기존 `tryMove()`와 `groupAt()`을 최대한 재사용한다.

권장 형태:

```js
analyzeMove(source, row, col, color, koState)
```

반환 예시는 자유지만 다음 정보를 테스트 가능하게 구조화한다.

- `legal`
- `reasonCode`
- `title`
- `summary`
- `captured`
- `ownLibertiesAfter`
- `opponentAtariGroups`
- `rescuedOwnGroups`
- `connectedOwnGroups`
- `selfAtariRisk`
- 시각화에 필요한 좌표 목록

분석은 보드 state를 mutation하지 않아야 한다.

## 2.1 반드시 구분할 reason

### 불법
1. 이미 돌이 있는 자리
   - 예: `여기는 이미 돌이 있어요.`
2. 자충수
   - 예: `여기에 두면 내 돌이 숨 쉴 곳(활로)이 하나도 없어요.`
3. simple ko
   - 예: `방금 전 모양으로 바로 돌아가는 패라서 지금은 둘 수 없어요.`
4. 바둑판 밖 좌표
   - 엔진 레벨에서 reason 유지.

### 합법 — 우선 설명할 가치가 높은 경우
1. 상대 돌 포획
   - `여기에 두면 상대 돌 2개를 잡아요.`
2. 내 단수 그룹 구출
   - `위험했던 내 돌의 활로가 늘어나요.`
3. 상대를 단수로 만듦
   - `상대 돌의 활로가 1개만 남아요.`
4. 내 돌 두 그룹 이상 연결
   - `떨어져 있던 내 돌이 이어져요.`
5. 내 활로 증가/안전한 확장
   - `내 돌이 숨 쉴 곳이 3개 생겨요.`
6. 합법이지만 self-atari 위험
   - 실제 자충은 아니지만 결과 그룹 활로가 1개이고 즉시 포획 이득도 없다면 경고.
   - `둘 수는 있지만 내 돌의 활로가 1개뿐이라 위험해요.`
7. 특별한 전술 효과가 없는 일반 합법수
   - `규칙상 둘 수 있어요. 놓은 뒤 내 돌의 활로는 N개예요.`

여러 이유가 동시에 있으면:
- 가장 중요한 1개를 제목/주 설명으로 표시.
- 최대 2개의 보조 badge 또는 짧은 부가 설명까지 허용.
- 어린 사용자가 읽기 어렵게 긴 문단을 만들지 않는다.

---

# 3. 그림으로 설명

텍스트만 추가하면 완료가 아니다.

## 3.1 메인 보드 오버레이
코치 후보를 선택하면 현재 canvas 위에 다음 표식을 그린다.

- 후보 착수점: 반투명 ghost stone + 노란 테두리
- 내 돌의 착수 후 활로: 초록 작은 점
- 단수가 되는 상대 그룹: 주황/빨강 링
- 잡히게 되는 상대 돌: 빨간 X 또는 사라질 돌 강조
- ko로 금지된 후보: 보라색/빨간 금지 표시

표식은 실제 stone state와 별도로 렌더링하며 게임 state를 변경하지 않는다.

## 3.2 코치 팝업 안 미니 그림
팝업 또는 코치 카드 안에 **작은 바둑판 그림**을 추가한다.

권장:
- 후보 지점을 중심으로 3×3 또는 5×5 영역을 확대해서 mini canvas/SVG로 표현.
- 전체 9×9를 작게 그려도 되지만 모바일에서 의미가 분명해야 한다.
- 후보점/활로/위험 돌/잡힐 돌 표시를 동일한 색 체계로 사용.

팝업 하단에 아주 짧은 범례:
- 초록 점 = 활로
- 빨간 표시 = 잡히거나 위험한 돌
- 노란 돌 = 지금 보고 있는 자리

외부 이미지/API/CDN 사용 금지. 현재 HTML/CSS/canvas/SVG만으로 구현한다.

## 3.3 반응형
- 데스크톱: 보드 옆 또는 후보 근처 floating coach card 허용.
- 모바일: 보드를 가리지 않는 bottom sheet/보드 아래 카드 권장.
- 360×800에서 팝업이 화면 밖으로 잘리거나 가로 스크롤이 생기면 FAIL.

---

# 4. 상대가 둔 이유 실시간 설명

## 4.1 AI 대국
현재 `aiPickMove()`는 다음 요소를 실제 점수 계산에 사용한다.
- 포획
- 상대 단수 증가
- 자신의 활로
- 주변 돌과의 인접/연결
- 중앙 선호
- 가장자리 penalty
- 작은 random jitter

AI가 착수한 직후 **실제로 그 수를 고를 때 계산했던 근거를 저장하고 설명**한다.

권장 구조:

```js
scoreAiMove(...)
// => { total, components: { capture, atari, liberties, neighbors, center, edge, jitter }, ... }

aiPickMove(...)
// => 기존 row/col/result + explanation metadata
```

### 핵심 원칙
- 선택 후 판을 보고 그럴듯하게 “의도를 만들어내지” 말 것.
- 실제 AI score component에서 가장 큰 유효 요인을 기반으로 설명할 것.
- random jitter는 사용자에게 전략 이유처럼 설명하지 않는다.

표시 예:
- `AI가 여기 둔 이유: 내 돌 1개를 잡을 수 있어서예요.`
- `AI가 여기 둔 이유: 흑돌의 활로를 1개로 줄여 단수를 만들었어요.`
- `AI가 여기 둔 이유: 백돌과 이어지고 활로를 늘릴 수 있어서예요.`
- 특별한 전술 이유가 약하면 `여러 후보 중 중앙에 가깝고 활로가 넉넉한 곳을 골랐어요.`

AI 착수 직후:
- 방금 둔 백돌을 강조한다.
- 영향을 받은 돌/활로를 그림으로 표시한다.
- 코치 팝업을 자동 표시한다.
- 사용자가 다음 후보점을 누르면 자연스럽게 착수 전 설명으로 전환한다.

## 4.2 로컬 둘이 두기
사람 상대의 “의도”를 추측하지 않는다.

대신:
- `상대가 둔 이유`가 아니라 `이 수로 바뀐 점`을 보여준다.
- 실제 보드 변화만 설명한다.

예:
- `이 수로 내 돌 1개가 단수가 됐어요.`
- `상대 돌 두 무리가 연결됐어요.`
- `이 수로 잡힌 돌은 없어요. 상대 돌의 활로는 3개예요.`

---

# 5. 코치 팝업 UI

최소 구성:

### 합법 후보
- 상태 아이콘: ✅
- 제목: `여기는 둘 수 있어요`
- 한 줄 핵심 이유
- 미니 그림
- 보조 정보 1~2개
- `여기에 두기`
- `다른 곳 보기`

### 불법 후보
- 상태 아이콘: 🚫
- 제목: `여기는 지금 둘 수 없어요`
- 한 줄 이유
- 미니 그림
- `다른 곳 보기`

### AI 수 설명
- 상태 아이콘: 💡
- 제목: `AI는 왜 여기에 뒀을까?`
- 실제 AI 평가 근거 한 줄
- 미니 그림
- `알겠어요` 또는 비차단형 자동 전환

팝업은 `alert()` 사용 금지.
게임 흐름을 막는 전통적인 blocking modal보다, 화면 안 coach card/popover/bottom sheet 방식으로 구현한다.

---

# 6. 상태/입력 규칙

- 코치 ON에서 첫 클릭은 preview일 뿐 `board`, `moveCount`, `captures`, `previousPosition`, `currentPlayer`를 바꾸지 않는다.
- `여기에 두기` 확인 때만 기존 `playMove()`를 통해 실제 착수한다.
- 코치 OFF는 기존 `pointerup → playMove()` 흐름과 동일하게 한 번에 착수한다.
- AI thinking 중에는 사용자 preview/confirm으로 중복 착수 불가.
- 새 게임/모드 변경/기권/대국 종료 시 preview와 coach overlay를 안전하게 초기화한다.
- resize/orientation change 후 ghost/overlay/mini diagram 좌표가 깨지지 않는다.
- pass는 preview를 취소한 뒤 기존 동작 유지.
- 두 번 연속 pass 종료, 점수, 포획 수, ko, 자충 등 기존 규칙 동작은 변경하지 않는다.

---

# 7. 구현 원칙

- 기존 9×9 엔진을 갈아엎지 않는다.
- 고급 바둑 엔진/Minimax/MCTS/외부 AI API 도입 금지.
- 기존 AI strength를 의도적으로 강화/약화하지 않는다.
- `aiPickMove()` 리팩터링은 **설명 가능한 score breakdown 확보**를 위한 범위만 허용.
- 새 외부 dependency, CDN, telemetry, analytics 금지.
- 현재 single-file static game 구조를 유지해도 된다.
- 테스트 가능성을 위해 순수 helper를 `window.EDUNIBadukEngine`에 read-only 성격으로 노출하는 것은 허용.
- 실제 게임 state를 임의 주입/변경하는 QA backdoor는 추가하지 않는다.

---

# 8. 자동 테스트 — 반드시 추가

기존 테스트 88개를 깨지 않고 신규 regression test를 보강한다.

최소 테스트 케이스:

## TC01 빈 판 일반 합법수
- 중앙 빈 점 분석.
- 기대:
  - `legal === true`
  - preview 분석만으로 board 불변
  - 설명/활로 정보 존재

## TC02 이미 돌이 있는 자리
- 기대:
  - 불법
  - `occupied` 계열 reason
  - 실제 board/moveCount 불변

## TC03 자충수
- deterministic fixture 구성.
- 기대:
  - 불법
  - 자충 설명
  - confirm 불가

## TC04 포획을 동반해 살아나는 수
- 겉보기에는 둘러싸였지만 상대 돌을 잡아 합법인 fixture.
- 기대:
  - 합법
  - captured > 0
  - 포획 설명

## TC05 simple ko 즉시 되따내기
- 기대:
  - 불법
  - ko 설명

## TC06 상대 포획
- 기대:
  - 합법
  - 잡히는 돌 좌표가 visualization 데이터에 포함

## TC07 상대 단수 만들기
- 기대:
  - 합법
  - opponent atari 정보 존재

## TC08 내 단수 그룹 구출
- 기대:
  - rescued group 감지
  - 설명이 실제 before/after liberties와 일치

## TC09 내 돌 연결
- 서로 떨어진 friendly group 2개 이상이 한 수로 연결되는 fixture.
- 기대:
  - connectedOwnGroups >= 2 또는 동등 정보

## TC10 합법 self-atari 경고
- 실제 자충은 아니지만 착수 후 내 그룹 활로가 1개인 fixture.
- 기대:
  - legal true
  - selfAtariRisk true
  - `둘 수 있지만 위험` 계열 설명

## TC11 AI explanation 정합성
- AI chosen move에 score component metadata가 존재.
- 포획 가능한 fixture에서는 capture component가 설명 근거로 선택되는지 확인.
- 설명이 실제 score component와 모순되지 않아야 함.

## TC12 분석 순수성
- `analyzeMove()` 전/후 `boardKey(source)` 동일.

## TC13 코치 OFF backward compatibility
- 코치 OFF일 때 기존 한 번 클릭 착수 경로 유지.

## TC14 기존 규칙 회귀
- 포획
- 자충 금지
- simple ko
- 두 번 연속 pass 종료
- score
- AI illegal move 미선택
기존 PASS 유지.

테스트 방법은 현재 구조에 가장 작은 변경을 택한다.
필요하면 기존 `test_baduk_game.py` + Node 실행을 병행한다. 새 dependency 설치 금지.

실행:

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
python -m py_compile app.py portal_app/baduk.py
cd ..
git diff --check
```

---

# 9. 실제 브라우저 검증

단순 문자열 테스트만으로 PASS 금지.
실제 브라우저에서 화면/입력/팝업을 확인한다.

## Browser A — 데스크톱 AI 대국
1. `/baduk` 진입
2. 초보자 코치 ON 확인
3. 빈 교차점 클릭
4. 돌이 즉시 놓이지 않고 ghost + 코치 팝업 표시
5. 설명 안의 미니 그림/활로 표시 확인
6. `여기에 두기` 클릭
7. 실제 흑돌 1개만 착수
8. AI 착수 대기
9. AI 백돌 착수 직후 `AI는 왜 여기에 뒀을까?` 팝업 확인
10. 설명이 방금 둔 위치와 시각 표식에 일치

## Browser B — 불법수 설명
브라우저 조작 또는 deterministic fixture/허용된 test setup으로:
- 이미 돌이 있는 자리
- 자충
- ko
최소 각각 1회 표시 확인.

기대:
- 실제 착수 없음
- 이동 수 증가 없음
- 설명 문구 정확
- 불법 후보에 confirm 없음/disabled

## Browser C — 전술 설명
최소:
- 상대 돌 포획
- 상대 단수
- 내 단수 구출
- 연결
- self-atari 경고
중 가능한 시나리오를 실제 UI에서 확인하고 스크린샷 증거 남긴다.

## Browser D — 코치 OFF
1. 코치 OFF
2. 빈 점 한 번 클릭
3. 기존처럼 즉시 착수
4. AI 진행 정상

## Browser E — 모바일 360×800
- 후보 preview
- popup/bottom sheet
- mini diagram
- confirm 버튼
- AI explanation
- 세로 화면에서 모두 읽을 수 있음
- 가로 스크롤 없음
- 보드 조작 가능

## Browser F — 회귀
- 새 게임
- pass 2회 종료
- 기권
- 모드 전환
- 포털 이동
- resize/orientation
에서 stale overlay/ghost popup이 남지 않음.

브라우저 console error/pageerror 0을 목표로 한다.

---

# 10. Docker/route 회귀

구현/테스트 후 현재 EDUNI deployment를 안전하게 rebuild/recreate 한다.
Nextcloud/MariaDB/volume/Tailscale 설정은 건드리지 않는다.

확인:
- `eduni-game` healthy
- restart policy `unless-stopped`
- `/portal` 200
- `/baduk` 200
- `/hanja` 200
- `/blockpuzzle` 200
- `/healthz` 200

기존 포털 카드 wrapper 회귀 금지.
특히 이전 `/portal` 500 원인이었던 Baduk portal-card wrapper 인자 전달 fix를 유지한다.

---

# 11. 완료 기준

아래가 모두 충족돼야 PASS다.

- [ ] 코치 ON에서 착수 전 preview가 실제 착수와 분리됨
- [ ] 합법/불법 이유를 실시간으로 설명
- [ ] occupied / suicide / ko 구분
- [ ] 포획 / 단수 / 구출 / 연결 / 활로 / self-atari 위험 설명
- [ ] 메인 보드 위 시각 overlay
- [ ] popup 안 mini board/그림
- [ ] AI 수 설명이 실제 AI score component에 기반
- [ ] 사람 상대 의도를 추측하지 않음
- [ ] 코치 OFF에서 기존 즉시 착수 UX 유지
- [ ] 기존 바둑 규칙/AI/점수/패스/기권 회귀 없음
- [ ] 데스크톱/모바일 실제 브라우저 확인
- [ ] Docker/route health 정상
- [ ] 전체 자동 테스트 PASS
- [ ] `git diff --check` clean

---

# 12. REPORT

새 파일:
- `.agent/REPORT_EDUNI_BADUK_BEGINNER_REALTIME_COACH_06.md`

반드시 포함:
- START HEAD
- FINAL HEAD
- 변경 파일
- 코치 UX 설명
- `analyzeMove` reason 분류표
- AI score breakdown / explanation 매핑표
- TC01~TC14 결과
- 실제 브라우저 시나리오 A~F 결과
- desktop/mobile 스크린샷 경로
- 전체 테스트 수/성공/실패
- Docker build/recreate 결과
- route smoke 결과
- console/page error 수
- 남은 한계
- 최종 `PASS`/`FAIL`

## 남은 한계에 반드시 명시
이 기능은 초보자용 규칙/국소 전술 설명이다.
- 프로 수준 최선수 판정 아님
- 사활/정석/형세판단 전체를 설명하는 엔진 아님
- 로컬 사람 상대의 심리적 의도는 추측하지 않음

## 완료 처리
- 구현 + 테스트 + 실제 브라우저 검증 + Docker 적용 후 코드와 REPORT를 commit/push한다.
- unrelated 파일은 commit하지 않는다.
- merge하지 않는다.
- 최종 답변은 `RESULT`, `COMMIT`, `TESTS`, `DOCKER`, `BROWSER`, `REPORT`만 간결하게 보고한다.
