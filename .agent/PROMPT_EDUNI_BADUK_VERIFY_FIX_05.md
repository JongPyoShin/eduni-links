# EDUNI PROMPT 05 — 바둑 Phase 1 실행 검증 및 보정

## 작업 기준
- 대상 브랜치: `feature/eduni-space-mvp`
- 시작 시 반드시 `git fetch` 후 remote/branch/HEAD 확인.
- 이 문서 작성 시 원격 HEAD: `d1fca2ca7dccba6004fcfd64ad5d825ca7a3608e`.
- 더 최신 HEAD가 있으면 최신 원격 HEAD를 기준으로 하되, 다른 작업을 덮어쓰지 말 것.
- `git reset --hard`, `git clean`, `docker compose down -v` 금지.
- merge/PR close 금지.

## 먼저 읽기
1. `/AGENTS.md`
2. `/nice-gui-1-1-7/AGENTS.md`
3. `.agent/PROMPT_EDUNI_BADUK_GAME_04.md`
4. `.agent/REPORT_EDUNI_BADUK_GAME_04_PHASE1.md`
5. 현재 바둑 구현 파일만 targeted review
   - `nice-gui-1-1-7/portal_app/baduk.py`
   - `nice-gui-1-1-7/portal_app/static_games/eduni_baduk.html`
   - `nice-gui-1-1-7/tests/test_baduk_game.py`
   - 필요한 경우에만 `portal_app/__init__.py`, `portal_app/routes.py`

## 목표
ChatGPT가 만든 바둑 Phase 1 구현을 새로 갈아엎지 말고 **실행 검증 → 문제 재현 → 최소 보정 → 최종 PASS 판정**한다.

최종적으로 다음이 실제 실행 환경에서 성립해야 한다.
- `/portal`에 바둑 카드가 보인다.
- 카드 클릭 시 같은 `eduni-game` 서버의 `/baduk`로 이동한다.
- `/baduk` 9×9 보드가 모바일/데스크톱에서 정상 렌더링된다.
- AI 대국과 로컬 2인 모드가 실제로 동작한다.
- 포획, 자충 금지, simple ko, 패스 2회 종료, 기권, 점수 표시가 동작한다.
- 기존 EDUNI single-server 구조와 기존 route가 깨지지 않는다.

## 1. 코드 리뷰
Phase 1 구현을 먼저 읽고 아래를 확인한다.

### 라우팅/포털
- `/baduk`, `/baduk/`가 `eduni_baduk.html`을 반환하는지.
- `/games/eduni-baduk`, `/games/eduni-baduk/` compatibility 진입이 `/baduk`로 연결되는지.
- 포털의 빠른 시작에 바둑 카드가 정확히 한 번만 나타나는지.
- 기존 AI 오목 및 다른 카드 렌더링에 부작용이 없는지.
- Phase 1의 helper wrapping 방식이 NiceGUI 페이지 등록 시 실제로 안정적인지 확인한다.
- 문제가 없다면 불필요한 구조 변경 금지. 문제가 있으면 `routes.py` 직접 카드 추가 등 더 단순한 구조로 최소 수정 가능.

### 게임 엔진
아래 로직을 소스 기준으로 검토하고, 실행 테스트에서 실제 결과도 확인한다.
- 9×9, 흑 선착
- group/liberty 계산
- 단일 돌/연결 그룹 포획
- 자충 금지
- 상대 포획으로 활로가 생기는 착수 허용
- 직전 판 상태 반복 금지(simple ko)
- 패스
- 2회 연속 패스 종료
- 기권
- 중국식 area scoring 근사 + 백 덤 6.5
- AI 불법수 배제
- AI 동작 중 중복 사용자 착수 방지

버그가 발견되면 그 버그만 최소 수정한다. 강한 AI 엔진으로 재작성하지 않는다.

## 2. 자동 검증
기존 테스트를 먼저 실행한다.

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
python -m py_compile app.py portal_app/baduk.py
cd ..
git diff --check
```

기존 `test_baduk_game.py`가 문자열 존재만 검사하고 실제 rule behavior를 검증하지 못한다면, 새 dependency 없이 가능한 범위에서 rule regression test를 보강한다.

최소 증거가 필요한 케이스:
1. 단일 돌 포획
2. 연결 그룹 포획
3. 자충 금지
4. 포획을 동반한 자충 예외 허용
5. simple ko 즉시 재착수 금지
6. 2회 연속 패스 종료
7. 기본 area score 계산

JS를 별도 testable module로 대규모 분리하지 말 것. 현재 HTML 구조를 유지하면서 간단한 Node 실행/브라우저 test hook/기존 테스트 방식 중 가장 작은 변경을 택한다. Node가 없으면 브라우저 자동화 증거로 대체하고 REPORT에 명시한다.

## 3. Docker 실제 적용
현재 EDUNI deployment를 먼저 확인한다.
- 기존 `eduni-game` 단일 app container 구조 유지.
- Nextcloud와 MariaDB 컨테이너는 건드리지 않는다.
- Tailscale bind/host networking 설정은 변경하지 않는다.
- 기존 volume 삭제 금지.

현재 compose 파일과 실행 위치를 확인한 후 안전하게 build/recreate 한다.
예:

```powershell
docker compose up -d --build --force-recreate eduni-game
```

실제 환경의 service 이름/compose 위치가 다르면 발견된 값을 사용한다.

확인:
- `docker compose ps`
- `eduni-game` running + healthy
- restart policy `unless-stopped`
- crash loop 없음
- `/healthz` 정상

## 4. HTTP route smoke
최소 다음을 실제 실행 컨테이너에 확인한다.
- `/` → `/portal` redirect 유지
- `/portal` 200
- `/baduk` 200
- `/baduk/` 200
- `/games/eduni-baduk`가 최종적으로 `/baduk` 진입
- `/hanja` 200
- `/blockpuzzle` 200
- `/omok` 200
- `/bubble` 200
- `/bubble-shooter` 200
- `/link` 200
- `/jungle` 200
- `/space` 200
- `/portal/world/math` 200
- `/portal/parent` 기존 동작 유지

## 5. Headed Chrome 실제 플레이 검증
가능한 headed Chrome/브라우저 자동화로 반드시 화면을 확인한다. 단순 HTTP 200만으로 PASS 금지.

### 포털 → 바둑
1. `/portal` 진입
2. `바둑` 카드 시각적으로 존재 확인
3. 카드 클릭
4. URL `/baduk` 확인
5. 9×9 바둑판 및 버튼 정상 렌더링 확인

### AI 대국
1. 기본 모드가 AI 대국인지 확인
2. 빈 교차점에 흑 착수
3. 잠시 후 AI 백 착수 확인
4. 흑 차례 복귀 확인
5. AI 생각 중 사용자가 중복 착수할 수 없는지 확인

### 2인 대국
1. `둘이 두기` 전환
2. 새 판이 명확하게 초기화되는지 확인
3. 흑/백 번갈아 착수 확인
4. AI가 개입하지 않는지 확인

### 조작
- 패스 버튼
- 새 게임
- 기권
- 포털 돌아가기

### 규칙
브라우저 자동화 또는 deterministic test hook으로 최소:
- 포획 1회
- 불법 자충 1회 거부
- ko 1회 거부
- 연속 패스 종료
을 실제 결과로 남긴다.

### 모바일
최소 360×800 또는 유사 viewport에서:
- 가로 스크롤 없음
- 보드가 화면 폭 안에 들어옴
- 버튼 터치 가능
- 모달/결과 UI가 잘리지 않음

브라우저 console/page error가 없어야 한다.

## 6. 수정 원칙
- 문제 없으면 검증만 하고 코드 변경 최소화.
- 실제 문제 발견 시 해당 문제만 수정.
- 포털 전체 redesign 금지.
- 바둑 AI를 고급 엔진으로 교체 금지.
- 새 외부 dependency/CDN/API 금지.
- 개인정보/analytics/광고 추가 금지.
- Nextcloud/Tailscale 설정 변경 금지.

## 7. 최종 REPORT
새 파일:
- `.agent/REPORT_EDUNI_BADUK_VERIFY_FIX_05.md`

반드시 포함:
- START HEAD
- FINAL HEAD
- 검토한 Phase 1 파일
- 실제 수정 파일(없으면 없음)
- 자동 테스트 결과와 총 테스트 수
- rule behavior 검증 결과
- Docker build/recreate 결과
- container/health/restart-policy 결과
- route smoke 결과
- headed browser 결과
- 모바일 viewport 결과
- 기존 route 회귀 결과
- 발견/수정한 버그
- 남은 한계(area score 사석/세키 미판정, 입문 AI 등)
- 최종 판정: `PASS` 또는 `FAIL`

`PASS`는 Docker + 실제 브라우저 + 핵심 rule behavior까지 확인됐을 때만 사용한다.

## 완료 처리
- 필요한 코드 수정 + REPORT를 하나의 최종 상태로 commit/push한다.
- unrelated 파일은 commit하지 않는다.
- merge하지 않는다.
- 최종 답변은 `RESULT`, `COMMIT`, `TESTS`, `DOCKER`, `BROWSER`, `REPORT`만 간결하게 보고한다.
