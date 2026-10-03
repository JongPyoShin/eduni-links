# Luna 후속 구현: 모든 질문은 현재 화면 기반이 기본

기준: `feature/eduni-ai-companion` / `6c95e895407a15375c0eb2ddff72f7ff57a1e2b5`.
사용자 요구: 질문에서 “이 문제”라고 명시하지 않아도 현재 화면 내용을 기본으로 답한다.

기존 규칙 기차/스도쿠 adapter를 보존한다. 고정된 child route에만 제한된 rendered prompt/보기 selector를 추가한다. 바둑 getState는 확정된 board/size/turn/terminal만 투영하며 오목은 렌더링된 돌만 읽는다. source 문제 객체, 정답, 접속코드, localStorage, 부모/독서 기록, 전체 DOM, 임의 입력 수집 금지.

질문 직전 최신 snapshot을 읽는다. 문제/보드 변경 시 늦은 답변은 폐기하되 시계·애니메이션·AI 패널 변화는 요청을 취소하지 않는다. UI는 함께 보는 화면과 현재 문제/글만 참고/일반 안내를 구분한다. 그림을 전달하지 않은 화면에서는 모델이 그림을 본 것처럼 답하면 안 된다. 두 provider prompt를 화면 우선으로 맞추되 명시적 다른 주제 질문은 허용한다. 서버/bridge bounds를 함께 조정한다.

Main은 계획·독립 검증·Git·preview launcher를 담당하고 Luna가 제품 수정 단일 소유자다. focused tests와 구체적 연결 범위를 `docs/EDUNI_AI_COMPANION_SCREEN_CONTEXT_REPORT.md`에 남긴다. 운영/8080/8081/다른 서비스·DB·volume 변경, merge/deploy/PR 금지. 기본 disabled 및 아동 안전 운영 gate 유지.
