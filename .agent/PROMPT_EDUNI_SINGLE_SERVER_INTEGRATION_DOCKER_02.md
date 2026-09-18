# PROMPT — EDUNI 한자 통합 + 단일 Family Server Docker 상시 실행

> 이 지시서는 `.agent/PROMPT_EDUNI_DOCKER_ALWAYS_ON_01.md`를 **대체/확장**한다. 이번 작업은 01을 따로 먼저 수행하지 말고 이 문서 하나를 기준으로 진행한다.

## 0. 작업 대상

- Repository: `JongPyoShin/eduni-links`
- Branch: `feature/eduni-space-mvp`
- START HEAD 기준: 최신 `origin/feature/eduni-space-mvp`를 fetch 후 기록
- Family server: `nice-gui-1-1-7/app.py`
- Family portal routes: `nice-gui-1-1-7/portal_app/`
- 현재 별도 quiz/hanja server: `files-mentioned-by-the-user-oracle/app.py`
- 현재 portal의 한자 링크: `nice-gui-1-1-7/portal_app/routes.py`의 `HANJA_URL`

현재 확인된 구조:

- Family server는 `PORT` 기본 8080, `EDUNI_HOST` 기본 127.0.0.1로 실행된다.
- `portal_app/routes.py`의 `HANJA_URL`은 현재 `http://100.75.214.95:8080/hanja`로 별도 서버를 가리킨다.
- 별도 `files-mentioned-by-the-user-oracle/app.py`에는 `/hanja` 및 `/api/save_hanja_answers` 구현이 존재한다.
- 별도 앱의 `/`는 Oracle DB Quiz 용도이며, 이번 통합의 필수 대상은 **EDUNI에서 사용하는 한자 기능**이다.

---

# 1. 최종 목표

EDUNI에서 사용자가 접하는 기능을 **NiceGUI family server 한 프로세스/한 컨테이너**로 통합한다.

최종 목표 URL:

```text
http://127.0.0.1:8081/
http://127.0.0.1:8081/bubble
http://127.0.0.1:8081/bubble-shooter
http://127.0.0.1:8081/portal
http://127.0.0.1:8081/portal/world/math
http://127.0.0.1:8081/portal/parent
http://127.0.0.1:8081/hanja
```

핵심 조건:

1. `/hanja`가 더 이상 별도 `100.75.214.95:8080` 서버를 필요로 하지 않는다.
2. portal에서 한자를 누르면 **동일 origin의 `/hanja`** 로 이동한다.
3. 한자 문제 로딩, 선택형/주관식 채점, 답안 저장이 모두 family server 프로세스 안에서 동작한다.
4. EDUNI application server Docker service는 **1개만** 실행한다.
5. 컨테이너는 `restart: unless-stopped` + HTTP healthcheck로 상시 실행된다.
6. Windows Docker Desktop 재시작 후 자동 복구 가능한 구성이어야 한다.
7. 기존 EDUNI route와 데이터는 유지한다.
8. Nextcloud가 존재한다면 외부 인프라 서비스로 그대로 둔다. 이번 목표의 “1개 서버”는 **EDUNI application server 1개**를 의미하며 Nextcloud를 억지로 같은 프로세스/컨테이너에 합치지 않는다.

---

# 2. 시작 전 필수 확인

먼저 아래를 실행하고 REPORT에 기록한다.

```powershell
git rev-parse --show-toplevel
git remote -v
git fetch origin feature/eduni-space-mvp
git branch --show-current
git status --short
git rev-parse HEAD
git rev-parse origin/feature/eduni-space-mvp
docker version
docker compose version
docker ps -a
```

필수 확인:

- repo가 `JongPyoShin/eduni-links`인지
- 최신 remote 반영 여부
- unrelated dirty file 존재 여부
- 기존 `eduni-game` 또는 family server container가 있는지
- 별도 hanja server/container/process가 현재 어떤 방식으로 떠 있는지
- port 8080/8081 사용 현황

절대 `git reset --hard`, `git clean`, force push, volume 전체 삭제를 사용하지 않는다.

읽을 파일은 우선 아래로 제한한다.

```text
AGENTS.md
nice-gui-1-1-7/AGENTS.md
nice-gui-1-1-7/app.py
nice-gui-1-1-7/portal_app/routes.py
files-mentioned-by-the-user-oracle/app.py
files-mentioned-by-the-user-oracle/outputs/*hanja*
기존 Dockerfile / compose / deployment helper가 있을 경우 해당 파일
```

---

# 3. 통합 설계 원칙

## 3.1 한 프로세스 안으로 흡수

금지 구조:

```text
한 컨테이너
  ├ python family_server.py
  └ python hanja_server.py
```

즉 supervisor/쉘로 Python 프로세스 2개를 한 컨테이너에 억지로 넣지 않는다.

원하는 구조:

```text
NiceGUI / FastAPI process 1개
  ├ /
  ├ /bubble
  ├ /bubble-shooter
  ├ /portal/*
  ├ /hanja
  └ /hanja 관련 API
```

## 3.2 모듈화

`nice-gui-1-1-7/app.py`를 더 크게 복붙하지 않는다.

권장 구조 예:

```text
nice-gui-1-1-7/
  portal_app/
    hanja.py
```

`hanja.py`에서 다음 책임을 가져간다.

- 한자 quiz set 탐색/로딩/검증
- 답안 normalization/채점
- 한자 페이지 HTML/UI rendering
- 저장 API
- access code가 실제로 계속 필요한 기능이면 해당 로직

Family server startup 시 기존 `register_pages()` 흐름 또는 현재 portal registration pattern에 맞게 `/hanja`가 함께 등록되어야 한다.

## 3.3 Oracle DB Quiz와 분리

`files-mentioned-by-the-user-oracle/app.py`의 `/` Oracle DB Quiz 전체를 이번에 family server로 합칠 필요는 없다.

이번 범위는 EDUNI portal이 사용하는 **한자 기능**이다.

다만 한자 모듈이 Oracle quiz의 공통 helper에 강하게 의존한다면 최소한의 공통 helper만 분리하거나 독립 구현한다. 전체 78KB app.py를 통째로 import하여 route side effect를 일으키는 방식은 금지한다.

---

# 4. 한자 데이터/답안 저장 구조

현재 `files-mentioned-by-the-user-oracle/outputs` 아래의 한자 문제 세트와 답안 저장 방식을 먼저 조사한다.

목표:

- 문제 원본(question set)은 runtime에서 안정적으로 읽을 수 있어야 함
- 답안 결과는 container rebuild/recreate 후에도 보존
- access code가 있으면 rebuild/recreate 후 임의로 바뀌어 기존 사용자가 잠기는 문제를 방지
- 비밀정보/실사용 answer 결과를 git에 새로 commit하지 않음

권장:

```text
문제 콘텐츠: repo의 명확한 read-only content 위치
런타임 답안/설정: EDUNI_DATA_DIR 또는 Docker persistent volume
```

예를 들어 필요하면:

```text
EDUNI_DATA_DIR=/data
/data/hanja/
/data/hanja/answers/
/data/hanja/quiz_access_code.txt
```

단, 기존 데이터가 이미 있으면 자동으로 삭제/초기화하지 않는다.

### 기존 데이터 migration

실제 기존 answer/access-code 파일이 존재하면:

1. 원본 경로/파일 수/크기 기록
2. backup 또는 non-destructive copy 전략 수립
3. 새 persistent data 위치로 **복사 후 검증**
4. 새 서버에서 읽히는지 확인
5. 원본은 이 작업에서 삭제하지 않음

---

# 5. URL/route 호환성

## 5.1 Portal 한자 링크

현재:

```python
HANJA_URL = "http://100.75.214.95:8080/hanja"
```

최종:

```python
HANJA_URL = "/hanja"
```

또는 동일 의미의 relative/same-origin 구현.

최종 코드에 아래 hardcoded old URL이 남아 EDUNI child-facing navigation에 사용되면 FAIL:

```text
100.75.214.95:8080/hanja
```

## 5.2 Hanja page

필수:

```text
GET /hanja
```

필요하면 trailing slash도 정상 처리:

```text
GET /hanja/
```

## 5.3 Save API

새 API는 가능하면 namespace한다.

권장:

```text
POST /hanja/api/save-answers
```

하지만 현재 JS/기존 클라이언트가 `/api/save_hanja_answers`를 사용하므로 안전한 방법은:

- 새 canonical API를 `/hanja/api/save-answers`로 두고
- `/api/save_hanja_answers`는 compatibility alias로 유지하거나
- 기존 URL을 그대로 family server가 제공

중요한 것은 기존 기능이 깨지지 않는 것이다.

## 5.4 old separate server dependency 제거

통합 후 family portal의 한자 기능은 별도 Python process 또는 `100.75.214.95:8080`에 의존하면 안 된다.

---

# 6. Docker 단일 application service

기존 Docker 설정이 있으면 재사용/수정한다.

없으면 family server를 위한 Dockerfile + Compose를 만든다.

Compose의 application service는 하나만 둔다.

의미상 예:

```yaml
services:
  eduni-game:
    build: ...
    container_name: eduni-game
    restart: unless-stopped
    environment:
      EDUNI_HOST: 0.0.0.0
      PORT: 8080
      EDUNI_DATA_DIR: /data
    ports:
      - "127.0.0.1:8081:8080"
    volumes:
      - eduni_data:/data
    healthcheck:
      ...
```

요구사항:

- app 내부 bind: `0.0.0.0:8080`
- Windows host: `127.0.0.1:8081`
- restart: `unless-stopped`
- HTTP healthcheck
- persistent data volume
- `privileged: true` 금지
- docker socket mount 금지
- 운영 목적으로 repo 전체 writable bind mount 금지
- secret 하드코딩 금지
- `.env` commit 금지

한자 기능 때문에 별도 `hanja` service를 추가하면 **이번 목표 FAIL**이다.

---

# 7. Healthcheck

기존 적합한 endpoint가 없으면 lightweight `/healthz`를 family server에 추가해도 된다.

권장 response:

```json
{"ok": true}
```

healthcheck는 Python stdlib `urllib.request` 사용을 우선한다.

기대:

- interval 20~30s
- timeout 3~5s
- retries 3~5
- 적절한 start_period

`/healthz`는 DB destructive check 등을 수행하지 않고 앱 process/route readiness만 검증한다.

---

# 8. 상세 테스트 케이스

## TC-01 기존 Family Server baseline

통합 전 또는 구현 직전 기존 테스트/route 구조를 기록한다.

확인 route:

```text
/
/bubble
/bubble-shooter
/portal
/portal/world/math
/portal/parent
```

기대:

- 현재 정상 route 목록 확보
- 이후 회귀 비교 기준 생성

## TC-02 `/hanja` same-origin 접근

통합 server 실행 후:

```powershell
Invoke-WebRequest http://127.0.0.1:8081/hanja -UseBasicParsing
```

기대:

- HTTP 200
- 한자 UI 표시
- 외부 `100.75.214.95:8080` redirect 없음
- family server 하나만으로 렌더링

## TC-03 Portal → Hanja navigation

headed browser에서 실제 클릭한다.

절차:

1. `http://127.0.0.1:8081/portal` 접속
2. 한자 진입 카드/링크 클릭
3. 최종 URL 확인

기대:

```text
http://127.0.0.1:8081/hanja
```

또는 동일 origin + `/hanja`.

FAIL:

- `100.75.214.95`
- 별도 port 8080로 이동
- connection refused

## TC-04 한자 문제 세트 로딩

최소 다음을 확인:

- quiz set 목록 로딩
- default set 선택
- 첫 문제 렌더
- 문제 수 정상
- 선택형 choices 렌더
- 주관식 문제가 있는 set이면 input 렌더

기대:

- console/page error 0
- JSON path error 0
- `No hanja quiz files found` 0

## TC-05 선택형 채점

실제 문제 1개 이상에서:

- 정답 선택 → 정답 판정
- 오답 선택 → 오답 판정
- 설명 표시가 기존 기능과 동등

기대:

- answer index mismatch 없음
- explanation 정상

## TC-06 주관식 normalization

현재 data에 text 문제 존재 시 실제 text 문제를 사용한다.

검증:

- accepted answer 정확 입력 → 정답
- 허용된 whitespace 차이 → 기존 normalization 규칙대로 정답
- 틀린 답 → 오답

기대:

- 기존 `normalize_text_answer` / accepted_answers 의미 보존

text 문제가 실제 data에 없으면 `N/A — no text question in current dataset`으로 REPORT에 기록하고 unit test로 grading helper를 검증한다.

## TC-07 답안 저장 API

UI의 저장 동작을 실제 수행한다.

기대:

- HTTP 2xx
- `{ok:true}`
- answered_questions/total_questions 정상
- configured persistent data 경로에 answer file 생성/갱신
- container filesystem ephemeral 위치에만 저장되지 않음

## TC-08 Access code 동작

현재 한자 화면이 access code를 실제로 사용한다면:

- 잘못된 code → 진입 불가
- 올바른 code → 진입 가능
- container restart 후 code 유지
- force-recreate 후 persistent volume 기준 code 유지

만약 현재 Hanja UX에서 access code가 불필요/사용되지 않는 구조라면 무리하게 새 인증을 추가하지 말고 REPORT에 현재 동작을 설명한다.

## TC-09 별도 Hanja server 미사용 증명

통합 서버 검증 중 별도 `files-mentioned-by-the-user-oracle/app.py` 프로세스를 실행하지 않는다.

가능하면 해당 별도 server가 정지된 상태에서:

```text
/portal → /hanja → 문제 풀이 → 저장
```

을 성공시킨다.

기대:

- EDUNI Hanja full flow PASS
- 별도 8080 Hanja process dependency 0

다른 사용자가 실제 별도 server를 사용 중이라 강제 종료하면 위험한 경우, 종료하지 말고 network/runtime dependency 분석으로 대체하되 PASS를 과장하지 않는다.

## TC-10 old hardcoded URL 제거 검사

검색:

```powershell
git grep -n "100.75.214.95:8080/hanja"
```

기대:

- active EDUNI portal code에서 0건
- 문서/history/legacy source에 남긴다면 active dependency가 아님을 REPORT에 설명

## TC-11 Compose config

```powershell
docker compose config
```

기대:

- valid
- EDUNI application service 1개
- `eduni-game`
- `restart: unless-stopped`
- `EDUNI_HOST=0.0.0.0`
- `PORT=8080`
- host 8081 → container 8080
- persistent `/data` 또는 결정된 runtime data mount

Nextcloud 같은 별도 infra compose가 기존에 있더라도 이번 app compose에서 한자용 두 번째 app service를 만들지 않는다.

## TC-12 Docker build/up

```powershell
docker compose build --pull
docker compose up -d
docker compose ps
```

기대:

- build 성공
- container running
- health=`healthy`
- crash loop 0

## TC-13 통합 route smoke

실제 container에서 전부 검사:

```text
/
/bubble
/bubble-shooter
/portal
/portal/world/math
/portal/parent
/hanja
/healthz   (추가했다면)
```

기대:

- 의도한 정상 200/redirect
- 5xx 0
- import/static/data path error 0

## TC-14 Hanja Docker full flow

headed Chrome 또는 Playwright headed Chrome으로 Docker URL 기준 실행:

1. `/portal`
2. Hanja click
3. `/hanja`
4. 문제 set 확인
5. 선택형 또는 실제 가능한 문제 답변
6. 저장
7. 저장 성공 UI/response 확인

기대:

- same origin 유지
- JS fetch 성공
- pageerror 0
- console.error 0 (의미 없는 browser extension noise 제외)

## TC-15 Container restart 복구

```powershell
docker compose restart eduni-game
```

health 복구 후 다시:

```text
/portal
/hanja
```

확인.

기대:

- healthy 복귀
- 한자 문제 정상
- access/runtime data 유지

## TC-16 Force recreate 데이터 보존

기존 데이터 backup/기준값 기록 후:

```powershell
docker compose up -d --build --force-recreate
```

기대:

- 답안/설정/access data 유지
- 문제 세트 정상
- `/hanja` 정상

## TC-17 Single application process 확인

container 내부 process list/command를 확인한다.

기대:

- family NiceGUI/FastAPI Python app 한 process tree
- 별도 `files-mentioned-by-the-user-oracle/app.py` server process 없음
- supervisor로 두 Python server를 동시에 띄우는 구조 아님

## TC-18 Restart policy

```powershell
docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" eduni-game
```

기대:

```text
unless-stopped
```

## TC-19 Windows auto-start 구성

Docker Desktop `Start Docker Desktop when you sign in` 상태를 확인 가능한 범위에서 검증한다.

판정:

- 실제 Windows reboot + Docker auto-start + container healthy + HTTP smoke까지 성공 → `FULL PASS`
- Docker restart policy + Docker Desktop auto-start 설정 확인, 실제 reboot 미수행 → `CONFIG PASS`
- Docker Desktop auto-start를 사용자가 1회 켜야 함 → `PARTIAL — one-time setting required`

다른 container 영향 때문에 Docker Desktop 전체 restart/reboot가 위험하면 수행하지 않는다.

## TC-20 전체 회귀 테스트

repo 정책에 따라:

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
python -m py_compile app.py
cd ..
git diff --check
```

한자 모듈용 unit test를 추가한다.

최소 검증 항목:

- quiz JSON validation
- choice grading
- text grading/normalization
- unknown set handling
- answer payload 생성
- persistent output path handling

기대:

- 전체 PASS
- diff check clean

---

# 9. 회귀 방지 요구사항

아래 기존 route/기능은 유지한다.

```text
/
/bubble
/bubble-shooter
/portal
/portal/world/math
/portal/parent
/link
/omok
/jungle
```

현재 branch에 존재하는 `/space` 등 신규 route도 건드리지 않는다.

한자 통합을 위해 unrelated game code를 대규모 refactor하지 않는다.

---

# 10. 보안/개인정보

- access code/parent PIN/plain secret를 source에 신규 hardcode하지 않는다.
- runtime answer file은 git에 추가하지 않는다.
- analytics/ads/외부 tracking 추가 금지.
- camera/mic/location/upload 기능 추가 금지.
- 한자 answer API는 파일 경로 traversal이 불가능해야 한다.
- setId를 그대로 파일 경로로 사용하지 말고 loaded set registry에서 resolve한다.

---

# 11. 운영 문서

최종 운영 방법은 사용자가 아래만 기억하면 되게 정리한다.

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f --tail 100 eduni-game
docker compose restart eduni-game
docker compose stop eduni-game
docker compose start eduni-game
```

문서에 최종 URL 명시:

```text
EDUNI: http://127.0.0.1:8081
한자:  http://127.0.0.1:8081/hanja
```

LAN/Tailscale 외부 접속이 기존에 필요하다면 localhost binding과 충돌할 수 있으므로 실제 요구를 조사한다. 외부 접속이 현재 운영 기능이라면 보안 범위를 고려하여 `ports` binding을 결정하고 REPORT에 이유를 명시한다. 임의로 public internet exposure하지 않는다.

---

# 12. REPORT

완료 후 작성:

```text
.agent/REPORT_EDUNI_SINGLE_SERVER_INTEGRATION_DOCKER_02.md
```

반드시 포함:

1. START HEAD
2. 구현 commit SHA
3. 변경 파일
4. 기존 Family/Hanja server 구조
5. 새 단일 server 구조
6. Hanja 데이터 위치 before/after
7. Hanja answer/access persistence 방식
8. portal Hanja URL before/after
9. Docker services 목록
10. application Python process 수
11. TC-01 ~ TC-20 결과
12. headed browser Hanja full-flow 증거
13. Docker health/restart/port/mount 실제값
14. Windows auto-start 판정
15. 남은 legacy `files-mentioned-by-the-user-oracle` 사용 여부
16. remaining risks

최종 판정 기준:

### PASS

- Family server 하나에서 `/hanja` 포함 EDUNI 기능 정상
- portal 한자 링크 same-origin
- 별도 Hanja server dependency 0
- answer persistence 성공
- Docker app service 1개
- healthy
- 회귀 테스트 PASS

### PARTIAL

기능 통합은 성공했지만 Windows Docker Desktop auto-start 같은 사용자 1회 설정만 남은 경우.

### FAIL

- 별도 Hanja process가 계속 필수
- `/hanja` 저장/채점 실패
- 기존 portal/game route 회귀
- 데이터 손실
- container unhealthy/crash-loop

---

# 13. Commit / Push

검증 완료 후 관련 변경만 commit/push한다.

권장 message:

```text
feat: integrate Hanja into always-on EDUNI family server
```

merge하지 않는다.

최종 응답 형식:

```text
RESULT: PASS | PARTIAL | FAIL
COMMIT: <sha>
SERVER: http://127.0.0.1:8081
HANJA: http://127.0.0.1:8081/hanja
APP_SERVICES: 1
HEALTH: healthy | unhealthy
AUTO_START: full | config-pass | docker-desktop-setting-required
REPORT: .agent/REPORT_EDUNI_SINGLE_SERVER_INTEGRATION_DOCKER_02.md
```
