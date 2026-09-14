# PROMPT — EDUNI 루트/블록퍼즐 라우트 정리 03

## 목표
현재 `eduni-game` 단일 서버 구조는 유지하면서 URL 역할을 명확히 분리한다.

최종 URL 정책:

- `/` → `/portal`로 redirect
- `/portal` → EDUNI 포털 홈
- `/hanja` → 한자
- `/blockpuzzle` → 기존 블록 퍼즐(현재 `/`에서 서비스 중인 게임)

기존 블록 퍼즐 기능 자체는 변경하지 말고 **경로만 `/blockpuzzle`로 이동**한다.

## 작업 대상
- Repository: `JongPyoShin/eduni-links`
- Branch: `feature/eduni-space-mvp`
- START HEAD 기준: 최신 원격 branch를 fetch해서 확인하고 기록
- 현재 확인된 최신 HEAD 참고: `870b2e5d7bc6b4d7a05415b1ad0427a496ca228a` 이상
- Main app: `nice-gui-1-1-7/app.py`
- Portal routes: `nice-gui-1-1-7/portal_app/routes.py`
- Docker app: `eduni-game`, host `127.0.0.1:8081`

## 사전 확인
반드시 먼저:

```powershell
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
git fetch origin feature/eduni-space-mvp
git log -1 --oneline origin/feature/eduni-space-mvp
docker ps --filter name=eduni-game
```

- unrelated dirty file 건드리지 말 것
- reset/clean/force push 금지
- 최신 remote 변경이 있으면 안전하게 반영 후 작업
- 기존 Docker single-server 통합을 되돌리지 말 것

## 구현 요구사항

### 1. 기존 블록 퍼즐 route 이동
현재 `/`에 등록된 블록 퍼즐 page/render 로직을 찾는다.

- 블록 퍼즐 구현 본문/JS/CSS/게임 상태 로직은 최대한 그대로 유지
- route decorator 또는 등록 경로만 `/blockpuzzle`로 이동
- 필요하면 `/blockpuzzle/`도 동일하게 지원
- 게임 내부에서 root 절대경로를 가정하는 asset/API가 있으면 새 경로에서도 깨지지 않게 확인

### 2. `/`는 포털로 redirect
`/` 요청은 블록 퍼즐을 렌더링하지 않는다.

기대 동작:

```text
GET /  -> redirect -> /portal
```

권장:
- 서버측 HTTP redirect 또는 NiceGUI의 명확한 navigation/redirect 사용
- 브라우저 history/새로고침 시 무한 redirect 금지
- 최종 주소가 `/portal`임을 확인

### 3. 포털의 블록 퍼즐 링크 수정
현재 포털 빠른 시작 카드에서 블록 퍼즐 href가 `/`로 되어 있으면 반드시 `/blockpuzzle`로 변경한다.

포털의 다른 링크는 유지:
- `/hanja`
- `/bubble`
- `/bubble-shooter`
- `/link`
- `/omok`
- `/jungle`
- `/space`
- `/portal/world/math`
- `/portal/parent`

### 4. 내부 참조 전수 확인
저장소 전체 스캔 대신 타겟 검색으로 `/`가 블록 퍼즐 URL이라는 가정이 남아 있는지 확인한다.

확인 대상:
- portal card/link
- tests
- README/운영 문서
- Docker healthcheck (root `/` 응답을 체크 중이어도 redirect-follow가 안전한지 확인)
- smoke scripts

기존 root를 healthcheck로 쓰고 있고 redirect 때문에 불안정해질 수 있으면 `/healthz`를 사용하도록 정리한다.

## 회귀 금지
아래는 유지되어야 한다.

- `/portal` = 포털
- `/hanja` = 한자
- `/bubble`
- `/bubble-shooter`
- `/portal/world/math`
- `/portal/parent`
- `/link`
- `/omok`
- `/jungle`
- `/space`
- `/healthz`
- Docker single app service/process `eduni-game`
- `restart: unless-stopped`
- persistent data
- Nextcloud containers에는 변경하지 말 것

## 테스트 케이스

### TC-01 `/` redirect
실제 Docker 재빌드 후 브라우저/HTTP로 확인.

```powershell
Invoke-WebRequest http://127.0.0.1:8081/ -MaximumRedirection 0 -ErrorAction SilentlyContinue
```

기대:
- 301/302/303/307/308 중 적절한 redirect
- Location이 `/portal`

그 다음 redirect follow:

```powershell
Invoke-WebRequest http://127.0.0.1:8081/ -UseBasicParsing
```

기대:
- 최종 200
- 포털 콘텐츠
- 블록 퍼즐 화면이 아님

### TC-02 `/portal`

```powershell
Invoke-WebRequest http://127.0.0.1:8081/portal -UseBasicParsing
```

기대:
- HTTP 200
- EDUNI PORTAL
- 블록 퍼즐 카드 링크가 `/blockpuzzle`

headed Chrome에서도 직접 열어 포털 화면임을 시각 확인.

### TC-03 `/blockpuzzle`

```powershell
Invoke-WebRequest http://127.0.0.1:8081/blockpuzzle -UseBasicParsing
```

기대:
- HTTP 200
- 기존 `/`에서 보이던 블록 퍼즐이 동일하게 정상 표시
- 회전/새 게임 등 기존 UI/게임 기능 유지
- JS console error 0

headed Chrome에서 실제 조작 1회 이상:
- 새 게임 또는 게임 시작
- 블록 이동/회전 등 가능한 기존 핵심 조작
- 화면 blank/404 없음

### TC-04 Portal → Block Puzzle navigation
headed Chrome에서:

1. `/portal` 접속
2. "블록 퍼즐" 카드 클릭
3. 최종 URL 확인

기대:

```text
http://127.0.0.1:8081/blockpuzzle
```

- 게임 정상 렌더링
- `/`로 이동하지 않음

### TC-05 기존 주요 route smoke
아래 모두 확인:

```text
/portal
/hanja
/blockpuzzle
/bubble
/bubble-shooter
/portal/world/math
/portal/parent
/link
/omok
/jungle
/space
/healthz
```

기대:
- 정상 route는 200 또는 의도된 정상 응답
- 5xx 0
- route collision 0

### TC-06 Docker 상태

```powershell
docker compose ps
docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" eduni-game
```

기대:
- `eduni-game` 1개 app container
- healthy
- `unless-stopped`
- `127.0.0.1:8081` 유지

### TC-07 재시작 후 route 유지

```powershell
docker compose restart eduni-game
```

health 복구 후 다시:

- `/` → `/portal`
- `/portal` 200
- `/blockpuzzle` 200
- `/hanja` 200

모두 확인.

### TC-08 기존 tests

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
python -m py_compile app.py portal_app/routes.py
cd ..
git diff --check
```

관련 route test를 추가/수정한다.

최소 assertion:
- root redirects portal
- portal block puzzle href is `/blockpuzzle`
- `/blockpuzzle` registration exists
- 기존 portal route registration 유지

## Docker 배포 검증
코드만 바꾸고 끝내지 말 것.

실제 실행 컨테이너가 최신 코드인지 확인 후:

```powershell
docker compose up -d --build --force-recreate eduni-game
```

단, compose 환경상 정확한 명령/서비스명이 다르면 실제 구성을 확인해 안전한 명령을 사용한다.

다른 Nextcloud 컨테이너는 중지/재생성하지 말 것.

## REPORT
완료 후:

```text
.agent/REPORT_EDUNI_ROOT_PORTAL_BLOCKPUZZLE_ROUTE_03.md
```

포함:
1. START HEAD
2. Implementation HEAD
3. 변경 파일
4. root route before/after
5. portal block puzzle link before/after
6. TC-01~TC-08 결과
7. headed Chrome 시각 검증 결과
8. Docker image/recreate/health 결과
9. 주요 route HTTP 결과
10. console/page error
11. 남은 위험

## Commit / Push
관련 변경만 commit/push.

권장 commit:

```text
fix: move block puzzle to /blockpuzzle and route root to portal
```

merge 금지.

최종 응답은 짧게:

```text
RESULT: PASS | PARTIAL | FAIL
COMMIT: <sha>
ROOT: / -> /portal
BLOCKPUZZLE: /blockpuzzle
PORTAL: /portal
HEALTH: healthy | unhealthy
REPORT: .agent/REPORT_EDUNI_ROOT_PORTAL_BLOCKPUZZLE_ROUTE_03.md
```
