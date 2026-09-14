# PROMPT — EDUNI Link 서버 Docker 상시 실행 구성

## 0. 작업 대상

- Repository: `JongPyoShin/eduni-links`
- 작업 브랜치: `feature/eduni-space-mvp`
- Family server app: `nice-gui-1-1-7/app.py`
- 기존 앱 기본값:
  - `PORT` 기본값: `8080`
  - `EDUNI_HOST` 기본값: `127.0.0.1`
- 기존 운영 관례에서 family server 컨테이너명은 `eduni-game`, 호스트 접근 포트는 `8081`을 사용해 왔다.
- Windows + Docker Desktop 환경을 우선 기준으로 한다.

## 1. 최종 목표

EDUNI Link의 family server를 Docker로 상시 실행할 수 있게 구성한다.

최종 상태는 아래를 모두 만족해야 한다.

1. `docker compose up -d` 한 번으로 EDUNI family server가 실행된다.
2. 컨테이너 내부 앱은 `0.0.0.0:8080`으로 listen한다.
3. Windows 호스트에서는 `http://127.0.0.1:8081`로 접근 가능하다.
4. 컨테이너 restart policy는 `unless-stopped`로 설정한다.
5. Docker Engine/Docker Desktop이 다시 시작된 뒤 컨테이너가 자동 복구될 수 있는 구성이어야 한다.
6. healthcheck가 존재하고 정상 상태에서 `healthy`가 되어야 한다.
7. 기존 게임/포털 route와 데이터가 깨지면 안 된다.
8. 코드/데이터/비밀정보를 이미지에 부주의하게 포함하지 않는다.
9. 기존 별도 hanja 서버/Nextcloud/다른 컨테이너를 건드리지 않는다.

---

## 2. 시작 전 필수 확인

작업 시작 직후 아래를 먼저 실행하고 REPORT에 기록한다.

```powershell
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
docker version
docker compose version
docker ps -a
```

반드시 확인할 것:

- remote가 `JongPyoShin/eduni-links`인지 확인
- 현재 branch/worktree가 작업 대상과 일치하는지 확인
- unrelated dirty file이 있으면 절대 reset/clean/delete 하지 말 것
- `eduni-game`이라는 기존 컨테이너가 있으면 현재 image, ports, env, mounts, restart policy를 먼저 inspect할 것
- Docker 관련 기존 파일(`Dockerfile`, `compose*.yml`, `docker-compose*.yml`, 배포 스크립트)이 있으면 신규 파일을 중복 생성하지 말고 기존 방식을 우선 확장할 것
- `D:\Codex\Deploy\eduni-links-main` 같은 별도 배포 worktree가 실제로 존재한다면 현재 구조/용도를 확인하되, 확인 없이 덮어쓰거나 reset하지 말 것

다음 문서를 우선 읽는다.

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`

저장소 전체를 무작정 스캔하지 말고 Docker/앱 startup/런타임 데이터 관련 파일만 타겟 조사한다.

---

## 3. 현재 앱 startup 기준

`nice-gui-1-1-7/app.py`의 현재 실행 모델을 유지한다.

현재 의미상 다음 구조다.

```python
port = int(os.environ.get('PORT', '8080'))
host = os.environ.get('EDUNI_HOST', '127.0.0.1')
ui.run(..., host=host, port=port, reload=False)
```

Docker에서는 반드시 환경변수로 다음을 주입한다.

```text
EDUNI_HOST=0.0.0.0
PORT=8080
```

호스트 포트는 기존 운영 호환성을 위해 우선 아래를 사용한다.

```text
127.0.0.1:8081 -> container:8080
```

단, 현재 실제 운영 컨테이너가 이미 다른 확정 포트 매핑을 사용 중이면 먼저 조사하고 기존 사용자를 깨지 않는 방향으로 결정한 뒤 REPORT에 근거를 남긴다.

---

## 4. 구현 요구사항

### 4.1 Dockerfile

기존 Dockerfile이 없거나 부적합한 경우 family server용 Dockerfile을 추가한다.

요구사항:

- Python 기반의 가벼운 공식 이미지 사용
- 실제 현재 앱이 사용하는 Python/NiceGUI 의존성을 조사하여 재현 가능하게 설치
- 임의로 최신 버전을 넣어 기존 환경을 깨지 말 것
- working directory 명확히 지정
- 앱이 필요로 하는 정적 파일/portal module/content/assets가 모두 들어가야 함
- 런타임 DB/사용자 데이터/출력 데이터는 이미지 bake-in 대상으로 취급하지 말 것
- PID 1이 실제 앱 프로세스가 되도록 `CMD`/`ENTRYPOINT` 구성
- 개발용 auto-reload 사용 금지
- 컨테이너 내부 포트는 `8080`

앱이 repo root의 다른 경로를 runtime에 참조한다면 build context를 무리하게 좁히지 말고 실제 의존 경로를 조사한 뒤 최소 범위로 포함한다.

### 4.2 Docker Compose

기존 compose 파일이 없으면 관리하기 쉬운 위치에 compose 구성을 추가한다.

서비스 요구사항 예시는 다음 의미를 가져야 한다.

```yaml
services:
  eduni-game:
    build: ...
    container_name: eduni-game
    restart: unless-stopped
    environment:
      EDUNI_HOST: 0.0.0.0
      PORT: 8080
    ports:
      - "127.0.0.1:8081:8080"
    healthcheck:
      ...
```

주의:

- `network_mode: host` 사용 금지. 필요한 이유가 명백하지 않으면 일반 port mapping 사용.
- `privileged: true` 사용 금지.
- Docker socket mount 금지.
- source tree 전체를 writable bind mount하여 운영하는 방식은 피한다. 필요한 runtime data만 지속성 있게 mount한다.
- secret/PIN/password/token을 compose 파일에 하드코딩하지 않는다.
- `.env`를 commit하지 않는다. 필요하면 `.env.example`만 추가한다.

### 4.3 Runtime 데이터 지속성

아래를 조사한다.

- SQLite 파일 위치
- family/parent 설정 저장 위치
- generated output/runtime cache 위치
- app이 수정하는 파일/디렉터리

실제 사용자 데이터가 컨테이너 recreate/build 때 사라지지 않게 volume 또는 적절한 bind mount를 구성한다.

단:

- 기존 로컬 DB를 자동 삭제/초기화/마이그레이션하지 말 것
- 현재 데이터가 있으면 백업 없이 destructive migration 금지
- cache처럼 재생성 가능한 것과 실제 사용자 데이터를 구분할 것

### 4.4 Healthcheck

healthcheck는 단순 프로세스 존재가 아니라 HTTP 응답을 확인해야 한다.

우선순위:

1. 기존에 안전한 health/status route가 있으면 사용
2. 없으면 `/` 같은 가벼운 기존 route를 HTTP GET하여 확인
3. 필요하고 최소 변경으로 가능하면 `/healthz`를 추가해도 됨

healthcheck는 외부 `curl` 설치에 의존하지 않아도 되도록 Python stdlib `urllib.request` 기반을 우선 고려한다.

예상 속성:

- interval: 20~30s
- timeout: 3~5s
- retries: 3~5
- start_period: 앱 초기화 시간을 고려

### 4.5 Windows 재부팅 후 자동 복구

`restart: unless-stopped`만으로는 Docker Engine 자체가 시작되지 않은 Windows 상태까지 해결하지 못한다.

따라서 Windows Docker Desktop 환경에서 다음을 확인한다.

- Docker Desktop이 로그인 시 자동 시작되도록 설정되어 있는지 확인
- 이미 다른 컨테이너가 실행 중이면 Docker Desktop/Engine을 테스트 목적으로 함부로 전체 재시작하지 말 것
- 안전하게 자동 설정할 공식/안정적 방법이 있으면 적용 가능
- Docker 내부 settings JSON을 불안정하게 직접 패치하는 방식은 피한다
- 자동 설정을 코드로 안전하게 적용할 수 없다면 REPORT에 정확히 `Settings > General > Start Docker Desktop when you sign in` 1회 설정이 필요하다고 명시한다

목표는 PC 재부팅 → Docker Desktop 시작 → `eduni-game` 자동 재시작 흐름이다.

---

## 5. 운영 편의 명령

README 또는 배포 문서에 최소한 아래 명령을 정리한다.

```powershell
# 시작/업데이트
docker compose up -d --build

# 상태
docker compose ps

# 로그
docker compose logs -f --tail 100 eduni-game

# 재시작
docker compose restart eduni-game

# 중지
docker compose stop eduni-game

# 다시 시작
docker compose start eduni-game
```

compose 파일이 repo root가 아닌 위치에 있다면 실제 경로를 포함한 명령으로 문서화한다.

가능하면 사용자가 기억할 명령을 줄이기 위한 간단한 PowerShell helper를 제공해도 된다. 단, 불필요한 추상화는 만들지 않는다.

---

## 6. 절대 금지

- `git reset --hard`
- `git clean -fd/-fdx`
- unrelated local changes 삭제
- force push
- 기존 데이터베이스 초기화
- 기존 container/volume 일괄 삭제
- `docker system prune`
- 다른 프로젝트 컨테이너 중지/삭제
- 별도 hanja 서버를 family server 컨테이너에 합치기
- Nextcloud 컨테이너/파일 수정
- public static launcher와 dynamic family server를 임의로 합치기
- 기존 `/`, `/bubble`, `/bubble-shooter`, `/portal`, `/portal/world/math`, `/portal/parent` 호환성 파괴
- 비밀정보 commit

---

## 7. 검증 — 반드시 실제 Docker에서 수행

설정 파일만 만들어 놓고 PASS 처리하지 말 것.

### TC-01 Compose 정적 검증

실행:

```powershell
docker compose config
```

기대 결과:

- exit code 0
- 유효한 compose
- 서비스 `eduni-game` 존재
- restart policy `unless-stopped`
- `EDUNI_HOST=0.0.0.0`
- `PORT=8080`
- host `8081` → container `8080`

### TC-02 Build

실행:

```powershell
docker compose build --pull
```

기대 결과:

- build 성공
- dependency/install error 0
- 앱에 필요한 module/static/content 누락 0

### TC-03 최초 기동

실행:

```powershell
docker compose up -d
docker compose ps
```

기대 결과:

- `eduni-game` running
- 초기화 후 health=`healthy`
- restart policy=`unless-stopped`

추가 확인:

```powershell
docker inspect eduni-game
```

실제 restart policy, ports, mounts, env를 REPORT에 요약한다.

### TC-04 Root HTTP smoke

```powershell
Invoke-WebRequest http://127.0.0.1:8081/ -UseBasicParsing
```

기대 결과:

- HTTP 200 또는 기존 앱이 의도한 정상 redirect 후 성공
- EDUNI 페이지 응답

### TC-05 핵심 route 호환성

아래 route를 실제 HTTP로 검사한다.

```text
/
/bubble
/bubble-shooter
/portal
/portal/world/math
/portal/parent
```

기대 결과:

- 기존 동작 기준 정상 응답
- 5xx 0
- Docker 전환으로 인한 missing asset/import/path error 0

별도 hanja 서버는 기존 분리를 유지하고 family container로 흡수하지 않는다.

### TC-06 컨테이너 재시작 복구

```powershell
docker compose restart eduni-game
```

기대 결과:

- 재시작 성공
- 일정 시간 내 `healthy`
- `http://127.0.0.1:8081/` 다시 정상
- 사용자 데이터 유지

### TC-07 재빌드/재생성 데이터 보존

기존 runtime 사용자 데이터가 있다면 먼저 위치/파일 크기/hash 등 비파괴 기준값을 기록한다.

그 후 안전 범위에서:

```powershell
docker compose up -d --build --force-recreate
```

기대 결과:

- container recreate 후에도 실제 사용자 데이터 손실 0
- SQLite/runtime persistent data 유지
- 앱 정상 기동

데이터가 없는 환경이면 '검증할 기존 데이터 없음'을 명시하고 mount persistence 구조만 확인한다.

### TC-08 실패 자동복구 설정 검증

```powershell
docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" eduni-game
```

기대 결과:

```text
unless-stopped
```

다른 컨테이너에 영향을 주지 않는 안전한 환경이면 앱 프로세스 비정상 종료 후 자동 재시작도 검증한다.

단, 이를 위해 Docker Desktop 전체를 강제 종료하거나 다른 container를 건드리면 안 된다.

### TC-09 로그 검사

```powershell
docker compose logs --tail 200 eduni-game
```

기대 결과:

- unhandled exception 0
- 반복적인 crash/restart loop 0
- bind error 0
- permission error 0
- DB path not found 0

### TC-10 기존 Python 검증

repo 규칙대로 실행한다.

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
python -m py_compile app.py
cd ..
git diff --check
```

기대 결과:

- 모두 PASS
- diff check clean

---

## 8. 재부팅 시나리오 판정

최종 REPORT에는 반드시 아래 흐름을 PASS/PARTIAL/FAIL로 판정한다.

```text
Windows 로그인
  ↓
Docker Desktop 자동 시작
  ↓
Docker Engine 준비
  ↓
restart: unless-stopped
  ↓
eduni-game 자동 실행
  ↓
health=healthy
  ↓
http://127.0.0.1:8081 정상
```

실제 Windows 재부팅을 자동 테스트하지 못했다면 PASS라고 과장하지 않는다.

- Docker Desktop 자동 시작 설정까지 확인됨 + restart policy 검증됨: `CONFIG PASS`
- 실제 재부팅까지 수행하고 HTTP smoke 성공: `FULL PASS`
- Docker Desktop 자동 시작이 사용자 1회 설정 필요: `PARTIAL — one-time user setting required`

---

## 9. 문서화

운영 문서에 다음을 남긴다.

- 서버 URL: `http://127.0.0.1:8081`
- 시작/중지/재시작/로그 명령
- compose 파일 위치
- persistent data 위치/volume 이름
- Docker Desktop 로그인 자동 시작 필요 여부
- 업데이트 후 재배포 방법
- 문제 발생 시 확인 순서:
  1. `docker compose ps`
  2. `docker compose logs --tail 200 eduni-game`
  3. health status
  4. port 8081 충돌 여부

---

## 10. 결과 REPORT

완료 후 다음 파일을 작성한다.

```text
.agent/REPORT_EDUNI_DOCKER_ALWAYS_ON_01.md
```

REPORT에 반드시 포함:

1. START HEAD
2. FINAL HEAD 또는 구현 commit
3. 변경 파일 목록
4. 기존 Docker 상태 조사 결과
5. Dockerfile/Compose 설계 요약
6. ports/env/restart/healthcheck/mounts 실제값
7. persistent data 보호 방식
8. TC-01 ~ TC-10 각각 PASS/FAIL 및 핵심 출력
9. 실제 HTTP route smoke 결과
10. Docker Desktop 자동 시작 상태
11. 재부팅 자동 복구 판정: FULL PASS / CONFIG PASS / PARTIAL / FAIL
12. 남은 위험/사용자 1회 설정

---

## 11. Commit / Push

모든 검증이 끝난 뒤 관련 파일만 commit한다.

권장 commit message:

```text
ops: keep EDUNI family server running with Docker Compose
```

그 다음 현재 작업 branch에 push한다.

절대 merge하지 않는다.

최종 응답은 짧게 다음만 보고한다.

```text
RESULT: PASS | PARTIAL | FAIL
COMMIT: <sha>
SERVER: http://127.0.0.1:8081
HEALTH: healthy | unhealthy
AUTO-START: full | docker-desktop-setting-required
REPORT: .agent/REPORT_EDUNI_DOCKER_ALWAYS_ON_01.md
```
