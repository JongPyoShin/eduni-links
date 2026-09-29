# EDUNI 스도쿠 Production Deploy Report

## 판정

`EDUNI SUDOKU DEPLOY PASS — LIVE ON 8081`

## 배포 출처

- 저장소: `JongPyoShin/eduni-links`
- 브랜치: `feature/eduni-sudoku-kids`
- 배포 제품 SHA: `e319e8f2cd6d2a1b803c865e868409882bca7b85`
- 기준 브랜치: `origin/feature/eduni-space-mvp` @ `6024366fdc0199b239269bb11609eaa7861bdc3b`
- 기준 이후 변경 경로는 스도쿠 설계, UI, 퍼즐 엔진, 라우트, 테스트, 보고서뿐이다.
- 제품·회귀 테스트: Python 205 passed, 1 skipped; 스도쿠 Node 3 passed; 콘텐츠 검사 유효.

## 기존 운영 상태와 보존

- Compose project: `eduni-space-mvp`
- 직전 `eduni-game`: healthy; image `sha256:b37ee2c2a6c4d487ddfc8e704dddeef651dbcddb7704a8ea224f27c0833ed082`.
- 직전 컨테이너: `51e4f9b5912f`; 8081은 `com.docker.backend`가 소유한 EDUNI Compose 공개 포트였다.
- 기존 앱 볼륨 `eduni-space-mvp_eduni_data`를 `/data`에 그대로 재사용했다.
- PostgreSQL 컨테이너 `c52cbca3028ef900ecedc132b6f2e35bcf73518b6b3f79bfb7a056a9ea176ebc` 및
  `eduni-space-mvp_eduni_postgres_data` 볼륨은 변경하거나 재생성하지 않았다.
- 기존 PostgreSQL production password는 무시된 기존 `.env`에서 읽었다. 값은 출력·변경·커밋하지 않았다.
- Compose 사전 검사에서 앱 포트 `100.75.214.95:8081 → 18081`, 앱 볼륨 `/data`,
  PostgreSQL 호스트 포트 미공개를 확인했다.
- 배포 전 백업 경로: `D:\Codex\Backups\eduni-sudoku-deploy-20260929T112847Z`
  - `/data` 전체 복사 포함 26개 파일, 512,189 bytes
  - SQLite 온라인 백업 20,480 bytes, `integrity_check=ok`,
    `child_profile=1`, `activity_session=0`
  - PostgreSQL custom dump 3,675 bytes

## 배포와 런타임

실행한 명령은 EDUNI 앱 서비스만 대상으로 했다.

```powershell
docker compose --env-file <existing-production-env> -p eduni-space-mvp up -d --no-deps --build eduni-game
```

- 새 이미지: `sha256:4369b7927500c9367cef7482a235100f7aada9522fbae64a733524ae945ca0f4`
- 새 `eduni-game`: `de8e35ad3293fcfa445eea7c5cc59ed584c6d3beafe2dd0195419057035b020d`, healthy
- 기존 `eduni-postgres`: 같은 컨테이너 ID, healthy
- SQLite post-deploy: `integrity_check=ok`, `child_profile=1`, `activity_session=0`
- PostgreSQL `reading_record=0`; 기존 데이터 변경/가짜 기록 생성 없음.
- 앱의 `/data` mount는 기존 볼륨과 동일하며 PostgreSQL `5432`는 계속 host 미공개.
- 직전 이미지 보존 태그: `eduni-game:rollback-sudoku-20260929`
- 앱 로그 마지막 100줄에서 traceback, CRITICAL, FATAL, import failure 0건.

## Production HTTP 확인

요청은 production host port 8081에만 보냈다.

| 경로 | 결과 |
| --- | --- |
| `/healthz` | HTTP 200 |
| `/portal` | HTTP 200 |
| `/reading` | HTTP 200 |
| `/reading/api/health` | HTTP 200, `ok=true`, PostgreSQL storage |
| `/ai/health` | HTTP 200 |
| `/bubble` | HTTP 200 |
| `/bubble-shooter` | HTTP 200 |
| `/sudoku` | HTTP 200; 스도쿠 제목과 core script 참조 존재 |
| `/sudoku-assets/eduni_sudoku_core.js` | HTTP 200; 퍼즐 생성 함수 존재 |

## 안전과 남은 확인

- Host 8080은 조회·접속·bind·stop·kill하지 않았다.
- `start_eduni_services.ps1`, `watch_eduni_services.ps1`, Docker prune,
  `down -v`를 실행하지 않았다.
- Nextcloud 및 비EDUNI Docker/PostgreSQL 리소스는 건드리지 않았다.
- Physical phone/browser acceptance는 사용자가 진행할 수 있다.
- 바로 확인할 주소: `http://100.75.214.95:8081/sudoku`
