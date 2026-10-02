# Luna: EDUNI 공통 AI 친구 1차 구현

`docs/EDUNI_AI_COMPANION_PLAN.md`, root와 앱 AGENTS.md를 먼저 읽고 그대로 구현한다.

작업 공간: `D:\Codex\Worktrees\eduni-ai-companion`, 브랜치 `feature/eduni-ai-companion`.
Main은 설계/문서/독립 검증, Luna는 유일한 제품 코드 구현자다. 제품 코드를 다른 agent와 동시에 수정하지 않는다.

필수: 공통 캐릭터 위젯, 모바일 하단 시트/태블릿 패널, 짧은 질문/힌트, 음성 입력 기능 탐지와 확인 후 보내기, 수동 읽어주기, context 변경 stale-response 차단, 규칙 기차·스도쿠 실제 context adapters. 부모/독서 메모를 추출하지 않는다.

기존 `/ai/chat` 계약과 tests를 보존한다. `/ai/companion/chat` 별도 route, default disabled, allowlisted context, same-origin 및 bounded requests, 모델 결과 textContent 렌더링, 민감 로그 금지. 안전한 HTML 삽입 helper를 사용한다. 임의 게임 로직 변경 금지.

ChatGPT bridge는 `D:\Codex\Tools\eduni-chatgpt-connect\connect.py`와 `chat.py`의 검증된 DPAPI/refresh/Responses 흐름을 참고한다. 실제 등록파일/secret은 읽거나 복사/출력하지 않는다. repo에 재현 가능한 서버 코드 및 집중 tests를 추가한다. 서버 인증키, default loopback, 외부 endpoint 금지, fixed model, 최대 응답/시간·completed 이벤트 검증. 기존 등록 경로만 참조하며 원본 OAuth token은 Windows에 남긴다. 포털에서 bridge에 접근할 수 없는 경우에도 fake-provider 검증이 가능해야 한다.

금지: host8080 조회/접속/조작, production8081/컨테이너/volume 변경, start/watch 스크립트, merge/deploy/PR, 새 dependencies, 무관한 refactor. Git commit/push는 Main이 담당한다.

작업 결과는 변경파일, tests, known gaps, 실제 브라우저 검증 방법을 Main에 보고한다. 전체 tests는 Main이 마지막 1회 수행하고 Luna는 focused tests만 실행한다.
