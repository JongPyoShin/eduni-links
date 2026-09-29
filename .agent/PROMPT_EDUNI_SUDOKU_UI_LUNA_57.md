# EDUNI 스도쿠 탐험 — Luna 모바일 UI 마감 지시서 57

## 시작점

- 저장소: `JongPyoShin/eduni-links`
- Main이 만든 기능 브랜치: `feature/eduni-sudoku-kids`
- 핵심 기능·설계 기준 커밋: `50bdd52d5609bb06080b414566070d487810995b`
- 설계와 상태 계약: `docs/sudoku/DESIGN.md` 전체를 먼저 읽는다.
- 이 지시서가 포함된 최신 `origin/feature/eduni-sudoku-kids`를 fetch한다.
- 기존 `D:\Codex\Projects\eduni-links` 작업트리는 미추적 파일이 있으므로 손대지 않는다.
- `origin/feature/eduni-sudoku-kids`에서 별도 worktree/브랜치
  `feature/eduni-sudoku-ui-luna`를 만들고 그곳에서만 작업한다.

## 담당 작업

Main이 퍼즐 생성·유일해·힌트·추천 규칙과 기본 화면을 이미 구현했다.
Luna는 `nice-gui-1-1-7/portal_app/static_games/eduni_sudoku.html`의
**아이용 모바일 화면 마감과 간단한 조작 흐름**을 담당한다.

1. 4×4와 6×6을 실제 모바일 세로 화면에서 보기 편하게 만든다.
   360×800, 390×844, 412×915에서 보드와 숫자 버튼이 가로로 잘리지 않아야 한다.
   특히 6×6의 3열 2행 숫자 버튼과 힌트/지우기/되돌리기에 자연스럽게 닿을 수 있게
   세로 여백과 정보 밀도를 조정한다. 보드 칸과 숫자 버튼의 터치 타깃을 충분히 크게 유지한다.
2. 시작 숫자, 선택 칸, 입력 숫자, 재검토할 숫자, 힌트 칸을 색뿐 아니라 테두리·강조 방식으로
   명확히 구분한다. 4×4의 2×2, 6×6의 2×3 구역 경계와 사방 외곽선을 균일하게 렌더링한다.
3. 난이도 변경과 `새 퍼즐`의 네이티브 `window.confirm`을 페이지 내부의 작은 확인 UI
   (예: 표준 `<dialog>`)로 바꾼다. 실수로 기존 판을 잃지 않아야 하며 취소/확인,
   키보드 Escape, 포커스 복귀가 가능해야 한다.
4. 게임 규칙을 처음 보는 아이를 위해 짧은 `놀이 방법` 진입점을 추가한다.
   가로줄·세로줄·작은 네모칸 규칙을 한국어 한 문장씩, 4×4 기준으로 설명한다.
   플레이 중 언제든 다시 열 수 있어야 하며 긴 설명문은 피한다.
5. 완성 카드, 안내 문구, 버튼을 7세 아이가 읽고 이해할 수 있게 다듬는다.
   지나친 애니메이션·점수 경쟁·시간 압박은 넣지 않는다. `prefers-reduced-motion`을 지킨다.

기존 HTML의 게임 상태 처리 코드를 고칠 때는 위 UI 동작에 필요한 최소 범위만 고친다.
`eduni_sudoku_core.js`, 퍼즐 생성 목표, 난이도 추천 조건, `/sudoku` 라우트와
`localStorage` 키/데이터 구조는 변경하지 않는다. 핵심 버그를 발견하면 독단적으로
규칙을 바꾸지 말고 재현 근거를 보고서에 적는다.

## 검증

- 첫 진입 → 칸 선택 → 숫자 입력 → 틀린 수 재검토 표시 → 지우기/되돌리기
  → 힌트 3단계 → 완료 → 다음 퍼즐을 실제 브라우저 클릭으로 확인한다.
- 6×6 난이도 전환은 새 확인 UI의 취소와 확인을 각각 검증한다.
- 새로고침 후 현재 판·입력값·최근 되돌리기가 유지되는지 확인한다.
- 360×800, 390×844, 412×915의 4×4/6×6 화면에서 실제 스크린샷을 남긴다.
  360px에서 가로 overflow 0, 숫자 버튼과 기본 도구가 사용 가능한지 확인한다.
- `node --test tests/test_sudoku_core.js`
- `python scripts/validate_content.py`
- Windows라면 `PYTHONUTF8=1`과 `PYTHONIOENCODING=utf-8`로
  `python -m unittest discover -s tests`를 실행한다. 기본 `cp949`에서는
  기존 바둑 Node subprocess 출력 해석 오류 3건이 날 수 있다.
- `git diff --check`
- production `eduni-game`/8081, host 8080, 다른 Docker/DB 서비스는 건드리지 않는다.

## 결과 전달

`docs/sudoku/LUNA_UI_REPORT.md`에 변경 범위, 실제 브라우저 크기별 결과,
스크린샷 위치, 테스트 결과, 발견한 제한을 기록한다.
본인 브랜치 `feature/eduni-sudoku-ui-luna`에 **해당 HTML과 보고서만**
커밋·푸시하고 Main에게 정확한 HEAD SHA를 전달한다.
Main의 기능 브랜치와 base 브랜치로 직접 merge하거나 production 배포하지 않는다.
