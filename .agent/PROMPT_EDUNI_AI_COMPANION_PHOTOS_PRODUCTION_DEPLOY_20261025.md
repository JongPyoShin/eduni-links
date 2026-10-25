# Codex 지시서 — EDUNI AI 친구 실제 사진 기능 운영 배포

**상태:** 사용자 배포 승인, GitHub PR #94 `feature/eduni-ai-companion` 병합 완료.
**제품 코드 병합 SHA:** `c5ba23f867728c6f42bdb9c59fc851dc321ff42f`.
**목적:** 가족 Windows PC에서 실행 중인 HTTPS EDUNI AI 친구에 검증된 사진 카드 기능을 적용하고 Chrome으로 확인.

## 엄격한 경계
- 이 지시서를 실행하는 Codex만 **가족 Windows 호스트**에서 운영 Docker를 제어한다. GitHub 코드 병합만으로 배포됐다고 보고하지 않는다.
- **8080은 다른 서비스**이므로 조회·종료·변경·바인딩하지 않는다.
- 운영 Compose 프로젝트 `eduni-space-mvp`에서 **`eduni-game`만** 재빌드/재생성한다. `eduni-postgres`와 DB·볼륨·데이터, 외부 읽기 서비스, 포트 8093 등은 중단하거나 재생성하지 않는다.
- 기존 브리지 `127.0.0.1:8765`의 DPAPI 등록, 인증키/토큰, Windows 감독 프로세스는 재시작하거나 갱신하지 않는다. 이번 PR은 **Docker 앱 코드만** 변경한다.
- 기존 운영 `.env`와 `.env.companion` 원본을 변경하거나 Git에 올리지 않는다. 모든 비밀값은 마스킹한다.
- 기존 작업트리의 dirty 파일은 손대지 않는다. 별도 청결한 worktree를 만들고, 호스트 Docker 설정/볼륨 이름/실행 이미지 태그·SHA를 **실측**해 검증한다. 추측하여 경로나 태그를 적용하지 않는다.
- `feature/eduni-ai-companion`를 사용한다. `main`으로 머지하거나 공개 GitHub Pages를 재배포하지 않는다.

## 1. 배포 전 점검
1. `git fetch origin feature/eduni-ai-companion`. origin 브랜치에 병합 SHA `c5ba23f8…`가 포함되는지 확인.
2. `docker compose -p eduni-space-mvp ... ps`로 활성 구성 확인. 실제 운영 Compose와 무시되는 env 파일을 발견하고 **원래 compose 프로젝트/서비스/파일 조합만** 사용한다.
3. `eduni-game` 이미지 ID/태그, 컨테이너 상태, 8081/HTTPS 8443 상태, `/healthz`, `/portal`, `/ai/health`를 기록.
4. 운영 PostgreSQL/SQLite 기록의 기본 건수 및 무결성을 읽기 전용으로 확인. 필요시 SQLite 온라인 백업·PG custom-format dump, 컨테이너 `/data` 백업을 Git 외부에 보존. 복구 테스트가 불가능하면 상태를 명시.
5. 현행 `eduni-game` 이미지를 별도 rollback 태그로 보존하고 정확한 ID 기록. `eduni-postgres`는 계속 실행 상태 유지.

## 2. 사전 검증
- Node: `node nice-gui-1-1-7/tests/test_companion_ux.js`, `node nice-gui-1-1-7/tests/test_companion_screen_context.js`, `node nice-gui-1-1-7/tests/test_companion_dock.js`.
- Python: `cd nice-gui-1-1-7`, `PYTHONUTF8=1` 환경에서 `python -m unittest discover -s tests -p 'test_companion*.py'` 및 사용 중인 설치환경의 전체 `python -m unittest discover -s tests`. `python scripts/validate_content.py`.
- 정확한 이미지 출처 7개 `educational_photos.py`의 Wikimedia Commons 원본 링크, 실이미지 로딩을 **HTTPS Chrome**에서 확인.
- 테스트 실패 또는 소스 미일치 → **HOLD**, Docker 변경 금지.

## 3. 안전한 배포
1. 동일한 **운영 Compose 프로젝트**와 기존 비밀값 파일을 사용해 `eduni-game` **단일 서비스만** 재빌드/업데이트. 예시 형태: `docker compose -p eduni-space-mvp [기존 -f/--env-file 인자] up -d --no-deps --build eduni-game`. 실제 인자와 원래 환경파일은 현장 설정 기준으로 사용.
2. `eduni-postgres`, 볼륨, DB, 브리지 프로세스, 8080, 다른 컨테이너는 불변 확인. 전체 `docker compose down`, volume prune, recreate 전체 서비스 금지.
3. HTTPS 가족주소 `https://k12.tail8b64d5.ts.net:8443/portal`에서 기존 AI 친구 자산의 캐시 해시가 달라졌는지 확인.
4. `/ai/companion/chat`에 부모가 만든 합성 질문 `북극곰 사진 보여줘`를 **실제 브라우저에서** 전송해 답변 + 북극곰 사진 + 출처 링크 확인. 첫 이미지 요청 결과(HTTP 200/정상 표시)를 검증.
5. `고양이 사진 보여줘`는 고양이 사진, `북극곰과 펭귄 비교해 줘`는 텍스트만, `사진 필요 없어, 사자 설명만`은 텍스트만, `수학 힌트 줘`는 기존 답변 형식 확인.
6. 다른 질문으로 빠르게 전환/취소 시 이전 사진 잔류·잘못된 자료 노출이 없는지 확인. 모바일(360×800) 카드 레이아웃·내부 스크롤·닫기 확인.
7. 앱 컨테이너 health, /reading, /reading/api/health, /portal, /bubble, /bubble-shooter, /sudoku, /baduk, /omok 등의 기존 라우트 결과 및 기존 DB 건수와 SQLite integrity를 비교. Bridge는 재시작하지 않는다.

## 4. 실패 시 롤백
- 사전 보존한 **이전 `eduni-game` 이미지**만 이용해 동일 프로젝트·env/볼륨으로 단일 서비스 복구한다. DB restore나 PG 재기동은 하지 않는다.
- 롤백 후 /healthz/portal/AI, HTTPS, 읽기 DB 상태 재확인.
- 배포 결과를 `PASS / PARTIAL / HOLD`로 표시하고 서비스 ID·SHA, 사진 카드 이미지 표시, DB/8080/bridge 불변 여부, 테스트 결과만 기록. 비밀 정보 금지.

**주의:** 이 파일 작성 자체는 배포가 아니다. Windows PC에서 이 문서를 Codex에 실행 지시한 뒤에만 실제 운영 배포가 된다.
