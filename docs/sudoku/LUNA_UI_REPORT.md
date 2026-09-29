# EDUNI 스도쿠 모바일 UI 마감 보고

- 기준: `feature/eduni-sudoku-kids` @ `17f70355429676e9d3f321405a4be0af2db4d55b`
- 범위: `eduni_sudoku.html`의 UI와 화면 내 확인 동작만 변경
- 모델 작업: Luna가 상태별 보드 강조, 놀이 방법, 페이지 내부 확인창을 구현
- Main 보완: 실제 360×800 QA에서 발견한 6×6 도구 잘림 24px과 규칙 설명의
  1–4 고정 문구를 같은 HTML에서 수정
- 퍼즐 엔진, 라우트, 로컬 저장 키/형식, production 서비스 변경 없음

## 실제 브라우저 확인

격리 앱 `127.0.0.1:18792/sudoku`를 Chrome 최상위 탭에서 열어 확인했다.
대화 기록의 Chrome 탭 `413068339` 화면 캡처가 이 보고서의 스크린샷 증거이며,
개인 브라우저 화면 파일은 Git에 포함하지 않았다.

| 뷰포트 | 보드 | 가로 스크롤 | 기본 도구 | 결과 |
| --- | ---: | --- | --- | --- |
| 360×800 | 307px (6×6) | 없음 | 하단 778px | PASS |
| 390×844 | 319px (6×6) | 없음 | 화면 안 | PASS |
| 412×915 | 341px (6×6) | 없음 | 하단 868px | PASS |

Main의 1차 기능 커밋에서 실제 클릭으로 4×4의 힌트 3단계, 되돌리기,
새로고침 이어하기, 완주를 확인했다. UI 마감 후 핵심 입력 처리 코드는 변경되지 않았다.
6×6 난이도 변경의 화면 내 확인창에서 취소 시 기존 판 유지, 확인 시 새 판 전환을
확인했다. 6×6에서 오답을 입력하면 재검토 문구와 빨간 테두리가 표시됐고,
새로고침 후에도 입력과 되돌리기 기록이 유지됐다. `놀이 방법`은 6×6에서 1–6,
4×4에서 1–4로 안내한다.

## 자동 검증

- `node --test tests/test_sudoku_core.js`: 3 PASS
- `python scripts/validate_content.py`: VALID, enabled activity 1
- `PYTHONUTF8=1`, `PYTHONIOENCODING=utf-8`에서
  `python -m unittest discover -s tests`: 205건 통과, 1건 스킵
- `git diff --check`: PASS

실제 7세 아이의 손 조작과 문구 이해는 아직 관찰하지 못했다.
이번 작업은 기능 브랜치용 UI 마감이며 production 배포는 수행하지 않았다.
