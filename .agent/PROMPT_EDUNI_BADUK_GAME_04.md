# EDUNI PROMPT 04 — 포털 바둑 게임 추가

## 작업 브랜치
- 반드시 `feature/eduni-space-mvp` 최신 HEAD에서 작업한다.
- 시작 전에 `git fetch` 후 현재 브랜치/HEAD/remote를 확인한다.
- 현재 원격 기준 시작 HEAD는 `34acd935da9fa23b587dda1c814842ea00cf7db8` 이후일 수 있으므로, 실제 최신 원격 HEAD를 기준으로 한다.
- 기존 dirty 파일/다른 작업을 건드리지 않는다.
- `git reset --hard`, `git clean` 금지.
- merge/PR close 금지.

## 반드시 먼저 읽을 것
1. `/AGENTS.md`
2. `/nice-gui-1-1-7/AGENTS.md`
3. 이 문서

주의: 현재 브랜치는 이미 EDUNI family server + 한자(`/hanja`)가 단일 `eduni-game` 앱 프로세스로 통합된 상태다. 과거 문서의 “separate hanja server” 문구를 근거로 한자 서버를 다시 분리하거나 기존 단일 서버 구조를 되돌리지 말 것.

---

## 목표
EDUNI 포털에 어린이가 바로 즐길 수 있는 **바둑 게임**을 추가한다.

최종 경로:
- 포털: `/portal`
- 바둑: `/baduk`
- 기존 AI 오목: `/omok`
- 블록 퍼즐: `/blockpuzzle`
- 한자: `/hanja`

포털의 “빠른 시작” 영역에 바둑 카드를 추가하고, 클릭하면 같은 `eduni-game` 서버의 `/baduk`로 이동해야 한다.

---

## 제품 방향
이번 단계는 **9×9 입문용 바둑 MVP**다.

대상:
- 어린이/초보자
- 태블릿/모바일 터치 우선
- PC 마우스도 정상 지원

기본 모드:
- `AI와 두기`를 기본값으로 한다.
- 사람은 흑, 입문 AI는 백.
- `둘이 두기` 로컬 2인 모드도 선택 가능하게 한다.

AI는 강한 엔진을 목표로 하지 않는다. 외부 라이브러리/네트워크/CDN 없이 브라우저 내부에서 동작하는 가벼운 입문 AI로 구현한다.

---

## 구현 위치 / 구조
기존 static game 패턴을 최대한 재사용한다.

권장:
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk.html`
- `nice-gui-1-1-7/portal_app/routes.py`

필요하면 테스트 파일을 추가/수정한다.

새 Python dependency는 추가하지 않는다.
외부 CDN, 광고, analytics, 외부 API 호출 금지.

---

## 라우팅 요구사항
`portal_app/routes.py`의 기존 `_game_html_response()` 패턴을 사용한다.

추가:
- `EDUNI_BADUK_URL = "/baduk"`
- `/baduk`
- `/baduk/`

둘 다 `eduni_baduk.html`을 반환하도록 한다.

기존 패턴과 일관성을 위해 필요하면:
- `/games/eduni-baduk` → `/baduk`
- `/games/eduni-baduk/` → `/baduk`

리다이렉트 compatibility route도 추가한다.

기존 `/`, `/portal`, `/hanja`, `/blockpuzzle`, `/bubble`, `/bubble-shooter`, `/space`, `/link`, `/omok`, `/jungle` 동작을 변경하지 않는다.

---

## 포털 UI 요구사항
`/portal`의 “빠른 시작” 카드에 바둑을 추가한다.

권장 카드 문구:
- 제목: `바둑`
- 설명: `9×9 바둑판에서 AI와 한 수씩 두는 입문 바둑`
- 배지: `AI 대국`

기존 `AI 오목` 카드와 자연스럽게 인접 배치한다.
필요하면 `portal-game-baduk` 스타일을 추가하되, 기존 포털 디자인 톤을 유지한다.

---

## 바둑 UI 요구사항
### 화면 구성
- 상단: `EDUNI 바둑` 제목
- 현재 모드 표시: `AI와 두기` / `둘이 두기`
- 현재 차례 표시: `흑 차례`, `백 차례`, `AI 생각 중`
- 9×9 바둑판
- 잡은 돌 수 표시: 흑/백
- 버튼:
  - `새 게임`
  - `한 수 쉬기(패스)`
  - `기권`
  - 모드 선택
- 게임 종료 후 결과/점수 표시
- `/portal`로 돌아가는 버튼 또는 링크

### 반응형
- 360px급 모바일에서도 가로 스크롤 없이 플레이 가능해야 한다.
- 터치 목표 크기를 충분히 확보한다.
- 바둑판은 정사각형 비율 유지.
- iPad/태블릿에서 중앙 정렬과 여백이 자연스러워야 한다.

### 시각 요소
- 나무색 바둑판
- 검은 돌 / 흰 돌 구분 명확
- 마지막 착수 위치 표시
- 놓을 수 없는 위치 터치 시 화면이 깨지지 않고 짧은 안내 표시
- 화점 표시

과도한 애니메이션은 피하고 터치 반응은 즉각적이어야 한다.

---

## 필수 바둑 규칙
브라우저 JS 내부에서 아래 규칙을 구현한다.

1. 9×9 교차점 착수
2. 흑 선착
3. 연결된 같은 색 돌 그룹 판정
4. 활로(liberty) 계산
5. 상대 그룹 활로가 0이면 포획하여 제거
6. 자충수 금지
   - 단, 상대 돌을 잡은 뒤 자기 그룹에 활로가 생기는 경우는 합법
7. 단순 패(simple ko) 금지
   - 직전 판 상태로 즉시 되돌리는 착수 금지
8. 패스 가능
9. 양쪽이 연속 2회 패스하면 게임 종료
10. 기권 가능

룰 처리와 화면 렌더링을 분리 가능한 함수로 작성해, 최소 단위 테스트 또는 브라우저 테스트가 가능하게 한다.

---

## 종료/점수
입문용으로 **중국식 영역 점수(area scoring) 근사**를 사용한다.

- 흑 점수 = 흑 돌 수 + 흑만 둘러싼 빈 영역
- 백 점수 = 백 돌 수 + 백만 둘러싼 빈 영역 + 덤 6.5
- 양쪽 색이 모두 경계에 닿는 빈 영역은 중립으로 처리
- 결과 예: `흑 42 : 백 39.5 — 흑 승!`

이번 MVP에서 복잡한 사석 지정/세키 판정 UI는 만들지 않는다.
REPORT에 이 점수 방식의 한계를 명시한다.

---

## 입문 AI 요구사항
외부 엔진 없이 가볍게 구현한다.

AI는 모든 합법 수 후보를 평가하고 그중 하나를 선택한다.
최소 우선순위:
1. 즉시 상대 돌을 잡는 수 강하게 선호
2. 자기 그룹을 즉시 잡히는 위험에서 살리는 수 선호
3. 자충/불법 수는 후보에서 제외
4. 가장자리만 무작정 두지 않도록 중앙/기존 돌 주변에 약한 가중치
5. 동일 점수 후보에서는 약간의 랜덤성

목표는 “초보 아이와 실제로 한 판 가능한 입문 AI”이지 강한 바둑 AI가 아니다.

AI가 생각하는 동안 중복 착수 방지.
AI 응답 지연은 약 200~500ms 정도로 자연스럽게 보이되 테스트를 방해하지 않게 구성한다.

---

## 로컬 2인 모드
`둘이 두기` 선택 시:
- 흑/백을 같은 기기에서 번갈아 둔다.
- AI는 작동하지 않는다.
- 동일한 포획/자충/패/패스/종료 규칙을 사용한다.

모드 변경 시 새 게임 확인 또는 즉시 초기화 중 한 방식으로 UX를 명확히 한다.

---

## 상태/데이터
- 서버 DB 추가 금지.
- 사용자/아동 개인정보 저장 금지.
- 게임 진행상태 서버 저장 불필요.
- 새로고침 시 초기화되어도 이번 MVP에서는 허용.
- 원하면 `localStorage`에 UI 설정(예: 마지막 모드) 정도만 저장 가능하지만 필수 아님.

---

## 테스트 요구사항
### 정적/단위 테스트
최소 아래를 검증한다.
- `/baduk` route 선언
- 포털 카드가 `/baduk`를 가리킴
- static game 파일 존재
- 기존 route regression 없음

가능하면 바둑 JS 로직에 대해 아래 케이스를 자동 검증한다.
- 단일 돌 포획
- 연결 그룹 포획
- 자충 금지
- 포획을 동반한 자충 예외 허용
- simple ko 즉시 재착수 금지
- 2회 연속 패스 종료
- 영역 점수 기본 케이스

테스트 전략은 기존 repo 구조를 따르고, 새 dependency는 추가하지 않는다.

### 전체 검증
repo root 기준 기존 가이드대로:

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

Python compile도 수행한다.

---

## 실제 Docker 검증
현재 `eduni-game` 단일 앱 컨테이너 구조를 유지한다.
Nextcloud 컨테이너/DB는 건드리지 않는다.

현재 Compose 설정을 확인한 뒤 안전하게 rebuild/recreate 한다.
볼륨 삭제 금지. `docker compose down -v` 금지.

최소 확인:
- `docker compose ps`
- `eduni-game` healthy
- restart policy `unless-stopped` 유지
- `/healthz` 정상
- `/portal` 정상
- `/baduk` HTTP 200
- 기존 `/hanja`, `/blockpuzzle`, `/omok`, `/bubble`, `/bubble-shooter`, `/space` 정상

---

## 브라우저 수동/자동 실제 검증
headed Chrome 또는 사용 가능한 실제 브라우저 자동화로 반드시 확인한다.

1. `/portal` 렌더링
2. 바둑 카드가 보임
3. 카드 클릭 → `/baduk`
4. 9×9 바둑판 정상 렌더링
5. 흑 한 수 착수
6. AI가 백 한 수 착수
7. 최소한의 포획 시나리오를 재현하거나 개발자 테스트 훅/단위 테스트로 포획 로직 검증
8. 패스 버튼 동작
9. 새 게임 초기화 동작
10. 모바일 viewport에서도 바둑판/버튼이 화면 밖으로 넘치지 않음
11. console/page error 없음

AI 전체 한 판 완주는 필수 아님.

---

## 회귀 방지
절대 깨뜨리지 말 것:
- `/` → `/portal` redirect
- `/portal`
- `/blockpuzzle`
- `/hanja`
- `/omok`
- `/bubble`
- `/bubble-shooter`
- `/link`
- `/jungle`
- `/space`
- `/portal/world/math`
- `/portal/parent`

현재 single-server Hanja 통합을 유지한다.
Nextcloud 파일/컨테이너/DB 설정을 수정하지 않는다.
Tailscale/호스트 바인딩 설정도 이번 작업에서 변경하지 않는다.

---

## 완료 산출물
1. 코드
2. 테스트
3. 실제 Docker rebuild/recreate + route 검증
4. headed browser 검증
5. REPORT:
   - `.agent/REPORT_EDUNI_BADUK_GAME_04.md`

REPORT에는 반드시:
- START HEAD
- 최종 commit SHA
- 변경 파일
- `/baduk` 구현 구조
- 바둑 규칙 구현 범위
- AI 방식/한계
- 테스트 결과
- Docker 상태
- browser 검증 결과
- 기존 route regression 결과
- 남은 리스크

작업 완료 후 코드 + REPORT를 같은 브랜치에 commit/push 한다.
merge는 하지 않는다.
