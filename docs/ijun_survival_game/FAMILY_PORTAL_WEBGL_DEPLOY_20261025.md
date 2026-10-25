# EDUNI 가족 포털 — 서바이벌 WebGL 3D 운영 서버 배포

## 목표와 상태
- **요청:** GitHub Pages가 아니라 가족 PC의 NiceGUI 서버 `/portal`에서 **3D 마주치지 마! 서바이벌**을 실행
- **소스 브랜치:** `feature/eduni-ai-companion` (별도 기능 PR 병합 후)
- **브라우저 내부 경로:** `/portal` → `/portal/games` → `/survival` 또는 `/portal` → 빠른 시작의 서바이벌 카드 → `/survival`
- **정적 자산:** `/survival-static/{logic,render25d,worlds,worldart25d,game}.js` + `survival3d.module.js`
- **호스팅:** HTML·게임 로직·3D 월드 생성 소스는 가족 서버가 제공. **다만 Three.js 엔진 모듈은 아직 고정 버전 `cdn.jsdelivr.net`에서 불러옴**. 외부 CDN 차단 시 2D Canvas 복구.
- 이 지시서는 Windows 가족 PC에서 실제 Codex가 실행해야 하는 배포 절차이며, GitHub에 문서를 올렸다고 운영 배포가 끝난 것은 아님.

## 안전 범위 — 중요
1. `eduni-space-mvp` Compose 프로젝트의 `eduni-game` **한 컨테이너만** 재빌드·재생성. 기존 `eduni-postgres`, 볼륨, 데이터, 별도 8080 서비스, 8765 GPT 브리지, 인증/DPAPI/환경파일은 변경·재시작 금지.
2. 운영 .env, .env.companion, 인증키를 Git에 올리거나 로그에 출력하지 않는다.
3. 기존 운영 worktree와 dirty 파일은 보존한다. 별도 깨끗한 worktree를 만들고 배포 전후의 실제 프로젝트/이미지/볼륨을 실측한다.
4. GitHub Pages는 이번 가족 서버 배포 대상으로 보지 않는다. `main` 브랜치나 public `survival/` 페이지를 덮어쓰지 않는다.
5. 사전 테스트·브리지·DB 점검에 문제가 있으면 **HOLD**, 운영 서버 변경 금지.

## 1. 사전 점검
- `git fetch origin feature/eduni-ai-companion` 후 원격 HEAD와 가족 서버 작업트리의 기준 SHA 확인
- `docker compose -p eduni-space-mvp -f docker-compose.yml ps`는 예시; 실제 운영에서 쓰는 compose 파일·프로젝트명·env 인자를 먼저 식별한 뒤 사용
- 현행 `eduni-game` 이미지 ID / rollback tag 기록. Compose 서비스 목록과 `eduni-postgres`, 환경변수 **설정 유무만** 확인
- `/healthz`, `/portal`, `/ai/companion/chat`의 기존 접근 경로, `/reading` 및 DB 건수·무결성 읽기 전용 기록
- HTTPS 가족 접속 주소/Tailscale 연결 상태 확인
- 기존 이미지 보존, 비파괴적인 백업 경로 확인

## 2. 배포 전 테스트
개발 작업트리 `nice-gui-1-1-7` 디렉터리 기준:

```powershell
node tests/test_survival_logic.cjs
node tests/test_survival_render25d.cjs
node tests/test_survival_worlds.cjs
node tests/test_survival_webgl_3d.cjs
$env:PYTHONUTF8="1"
python -m unittest discover -s tests -p "test_survival_family_portal_routes.py"
python scripts/validate_content.py
python -m unittest discover -s tests
```

- 가족 서버에서 위 Python 테스트가 검증하는 것은 `/survival`, `/portal/games`, `/survival-static/*`, 기존 /jungle·/link·/omok·/reading·AI 친구 POST 경로, 그리고 동일 origin 내부 링크다.
- 사용자 요청 범위 외 테스트 실패가 나타나면 원인을 확인하고 **HOLD**.
- `SurvivalThreeD` 전환/2D 폴백, WebGL2 지원 여부는 테스트 통과하더라도 모바일 브라우저에서 별도로 검증.

## 3. 배포
- 기존 운영 Compose 설정과 환경파일을 동일하게 재사용해 `eduni-game`만 빌드/갱신:
```powershell
# 예시 형태. 운영에서 실제 쓰는 프로젝트명·env 인자 확인 후 실행.
docker compose -p eduni-space-mvp -f docker-compose.yml up -d --no-deps --build eduni-game
```
- 절대 `docker compose down`, 볼륨 삭제/정리, Postgres 재기동, 8080 서비스 변경 실행 금지.
- 컨테이너 활성/헬스 체크, 새 파일이 컨테이너 내부 `/app/portal_app/survival_static/`에 포함되었는지 확인

## 4. 휴대폰에서 직접 확인
1. Tailscale 켜기 → 기존 가족 포털 주소 `/portal` 접속. 새 카드 `마주치지 마! 3D 서바이벌` 클릭
2. URL이 **GitHub Pages가 아니라 동일 호스트의 `/survival`**인지 확인
3. 정글, 북극, 피라미드 각각 시작·이동·열쇠 수집·은신·일시정지·탈출 확인
4. 개발자 도구나 브라우저 네트워크에서 `/survival-static/survival3d.module.js?v=11` HTTP 200 확인. `three@0.186.1` CDN 요청도 확인
5. 화면에 `3D ✓` 표시, 3D 캐릭터/입체 장애물/조명, 2D 전환 시 정상 표시, 3D 재전환 확인
6. 360×800 / 390×844와 PC에서 HUD·하단 컨트롤·미니맵 충돌 없이 게임 플레이 확인
7. AI 친구, 기존 게임, 독서기록, 포털 페이지와 DB 건수 재확인

## 5. 장애 및 롤백
- WebGL만 실패하는 경우 우선 `2D`로 정상 게임 가능한지 확인하고 3D 출처/네트워크 원인을 기록
- 가족 게임 전체 장애나 회귀 발생 시 보존한 **이전 `eduni-game` 이미지만** 동일 Compose/볼륨으로 복구; DB/PG/8080/브리지 변경 금지
- 배포 결과는 **PASS / PARTIAL / HOLD**, 커밋 SHA, 테스트 수, 3D/2D 실기기 결과, 이전 서비스 불변 여부로만 보고

## 주의
현재 `main`(GitHub Pages용)과 `feature/eduni-ai-companion`(가족 서버 운영용)은 서로 다른 기능·이력을 갖고 있으므로 전체 브랜치 병합 대신 **서바이벌 파일과 라우트만** 추가함. 운영 Docker가 실제 사용하는 소스 브랜치가 이와 다른 경우 반드시 현재 컨테이너/이미지 기준 소스를 확인해야 함.
