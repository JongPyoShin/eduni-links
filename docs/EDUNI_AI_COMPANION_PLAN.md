# EDUNI 공통 AI 친구: 개발·기술·로직 계획

## 목표와 기준
7세 아이가 포털 어디에서든 작은 캐릭터를 눌러 질문하고, 현재 문제에 대한 짧은 힌트를 받는다. 부모가 연결한 ChatGPT 계정은 서버에서만 사용한다. 기준은 스도쿠 운영 보고서까지 포함한 `a00829fb87b9b3d18418f91e68ea0f4157e8d4d3`, 작업 브랜치는 `feature/eduni-ai-companion`이다. 기존 게임 동작과 AI-1 `/ai/chat` 계약을 유지한다. 운영 배포·merge는 이번 범위가 아니다.

## 사용자 흐름
1. 화면 모서리의 AI 친구를 누른다. 휴대폰은 하단 시트, 태블릿/PC는 우측 패널을 연다.
2. `힌트 줘`, `쉽게 설명해 줘`, 직접 입력 중 하나를 선택한다.
3. 현재 화면에서 명시적으로 제공한 문제·보기·선택만 요청에 첨부한다. 공개하지 않은 정답, 부모 메모, 프로필, 전체 DOM, 사진은 보내지 않는다.
4. 2~4개의 짧은 한국어 문장으로 답한다. 먼저 생각할 단서를 주며 게임 상태를 바꾸거나 답을 자동 입력하지 않는다.
5. `읽어 줘`로 기기의 음성 합성을 실행한다. 마이크는 지원되는 안전한 접속 환경에서 버튼을 눌렀을 때만 시작하고, 인식된 문장을 확인 후 전송한다.

## 기술 구조
`공통 위젯 → same-origin /ai/companion/chat → 검증된 context → 기존 AI 서비스 또는 인증된 Windows ChatGPT bridge → Responses API`

- 공통 CSS/JS를 등록된 EDUNI HTML 응답에 제한적으로 삽입한다. 부모 화면·API·자산·다른 서비스·iframe에는 삽입하지 않는다. 스트리밍 응답 전체를 무제한 버퍼링하는 middleware는 금지한다.
- 전역 `window.EDUNICompanion.setContext(context)`를 제공한다. 1차 실제 연동은 규칙 기차와 스도쿠. 나머지 게임은 화면별 일반 질문을 제공하며 실제 판독을 주장하지 않는다.
- context는 `activity`, `question`, `choices`, `selected`만 허용하고 길이·개수·타입을 서버에서 검증한다. 전체 요청 크기도 제한한다. 모델 명령이 아니라 참고 데이터로 직렬화한다.
- 기존 `/ai/chat`, reading_search privacy gate와 disabled 기본값은 보존한다. 새로운 endpoint는 별도로 둔다.
- ChatGPT bridge는 Windows DPAPI에 저장된 기존 등록 정보를 사용하는 서버 전용 프로세스다. 원본 OAuth access/refresh token을 Docker나 브라우저에 전달하지 않는다. 로컬 비공개 endpoint + 별도 bridge 인증키를 사용하고 기본 bind는 loopback이다. Docker 연결/네트워크 개방은 별도 운영 승인 단계다.
- 새 의존성 없이 표준 라이브러리와 기존 NiceGUI/FastAPI를 사용한다. OAuth 보조 도구를 repo로 가져올 때 비밀정보·실제 등록 파일·호스트 식별자는 제외한다.
- 구독 Responses 호출은 `store:false`, `stream:true`, developer instructions, 명시적 input을 사용한다. `response.completed`를 받아야 성공이다. 지원되지 않는 max_output_tokens/audio API는 사용하지 않는다. 기본 런타임 모델은 실제 연결 검증된 `gpt-5.6-luna`, 자동 상위 모델 전환은 없다.

## 상태·동시성·안전 로직
- 닫힘 → 준비 → 요청 중 → 답변/오류. 한 위젯에서 요청 하나만 허용한다.
- context 변경·닫기·페이지 이동 시 generation을 증가시키고 요청을 취소한다. 늦은 응답은 기존 문제를 덮지 못한다. 음성 인식·재생도 종료한다.
- 부모가 명시적으로 활성화하기 전에는 disabled 상태다. 최초 사용 안내에 질문/문제의 OpenAI 전송과 구독 사용량 공유를 표시한다.
- 서버는 동시 요청·속도·길이를 제한한다. 임의 URL, 모델, shell, SQL, 도구 호출은 companion에서 받지 않는다. 내부 예외·token·질문 전문은 로그에 남기지 않는다.
- 마이크 지원 여부는 실제 기능 탐지로 판단한다. HTTP 사설IP에서는 secure context 제약으로 불가할 수 있다. 음성 인식은 브라우저 공급자 서버를 사용할 수 있으며 완전한 로컬 처리라고 주장하지 않는다. 미지원이면 텍스트 입력을 유지한다. 실기기 권한/한국어 음성 품질은 별도 acceptance다.

## 단계와 역할
1. Main: 이 설계 및 Luna 지시서 작성, 파일 경계·기존 계약 확정.
2. Luna: 위젯/route/bridge/context adapters/집중 테스트 구현. 제품 코드 수정자는 Luna 한 명.
3. Main: 독립 보안·race·개인정보 검토, 실제 HTTP 및 headed Chrome 검증. 수정 사항은 Luna에 전달.
4. 승인 후 운영 HTTPS·bridge 접근 구성과 모바일 실제 마이크 acceptance. 이번 단계에서 production 재기동하지 않는다.

## 완료 기준
- 기존 AI 테스트 회귀 없음, disabled/local fake provider와 인증 bridge 계약 테스트.
- malformed context, secret/parent_note 차단, origin/request bounds, timeout/unavailable, stale response 및 닫기 취소 검증.
- `/portal`, 규칙 기차, `/sudoku`, 기존 게임 route와 정적 자산 정상. 360×800, 800×1280, 1280×800 실제 브라우저 UI 검증.
- 합성 문제로 실제 ChatGPT E2E 확인; 개인정보/production DB를 사용하지 않는다.
- 개발·검증 보고서에 자동/실제 브라우저/실기기 미검증을 구분한다.

## 아동 안전 운영 gate
공식 Under-18 지침은 13세 미만 개인정보 처리 전 API zero data retention을 요구한다. 구독 요청의 `store:false`가 이 요건을 충족한다고 가정하지 않는다. 이번 개발·E2E는 합성 학습 문제와 성인 감독 테스트만 사용한다. 이름·학교·주소·연락처·아이의 사적인 독서기록을 보내지 않는다. 기본 disabled를 유지하고, 독립적인 아동 자유대화 서비스 운영은 구독 연동의 적용 조건·개인정보 처리 요건·연령 적합 안전 장치 검토가 끝나기 전 NO-GO다. UI 경고와 프롬프트는 유용하지만 개인정보 차단·답변 안전성을 보장하는 필터가 아니다.

## 참고
- [공식 ChatGPT subscription inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [구독 연동 지원 범위](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Under-18 안전 안내](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
- [브라우저 음성 인식 지원과 서버 처리 가능성](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
