# CODEX 작업 지시문 · 정글 대탐험 Phase A

아래 본문만 CODEX에 전달한다.

---

`AGENTS.md`를 읽고 따라줘.

정글 대탐험 Phase A만 구현해줘. 전체 저장소를 스캔하지 마.

먼저 아래 파일만 읽어:
- `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `docs/jungle_expedition/README.md`
- `docs/jungle_expedition/phase_plan.md`
- `nice-gui-1-1-7/portal_app/routes.py`
- `nice-gui-1-1-7/tests/test_routes.py`

필요할 때만 아래 파일을 추가로 읽어:
- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/registry.py`

목표:
- 세로형 모바일 우선 `정글 대탐험` 임시 플레이 화면
- 경로: `/portal/activity/jungle.expedition.001`
- 새 모듈: `nice-gui-1-1-7/portal_app/jungle_expedition.py`
- 트럭은 화면 하단 중앙에 거의 고정
- 가운데 좁은 길, 좌우 울창한 나무·가지·풀
- 세계관상 트럭이 아래에서 위로 이동
- 구현상 숲과 길 오브젝트가 위에서 아래로 흐름
- 버튼: `전진`, `정지`, `짐칸`
- 임시 새 1종이 좌우 가지에 랜덤 등장
- 새 터치 시 자동 정지 후 임시 발견 카드 표시
- 모바일에서 새 터치 영역 최소 52px

Phase A에서 절대 하지 마:
- 실제 문제 출제
- 한자·구구단·영어·과학 문제 데이터
- SQLite
- 도감 저장
- 희귀도
- 배포
- 컨테이너 재시작
- Nextcloud 수정
- 기존 게임 리팩터링
- merge

기존 경로 유지:
- `/`
- `/bubble`
- `/bubble-shooter`
- `/portal`
- `/portal/world/math`
- `/portal/parent`
- 기존 한자 진입 경로

작업 방식:
1. 현재 branch와 dirty 상태 확인
2. 기존 dirty 파일은 수정·reset·stash하지 마
3. 필요한 파일만 좁게 수정
4. focused test 먼저 실행
5. 마지막에 전체 validator, unittest, `git diff --check`
6. 변경 파일 목록과 diff 범위를 확인
7. 커밋 1개 생성
8. Draft PR 생성
9. merge하지 말고 멈춰

최종 보고는 아래만 짧게:
- changed files
- validation results
- smoke test results
- commit SHA
- Draft PR 번호와 링크
- remaining risks

---
