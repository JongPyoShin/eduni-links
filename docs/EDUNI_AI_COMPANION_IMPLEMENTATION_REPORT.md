# EDUNI AI 친구 1차 구현·검증 보고서

## 판정
**1차 기능 구현 완료 / 합성 질문 실연결 확인 / 운영 배포 NO-GO**.
Main이 설계·계획·독립 검증, `gpt-6-luna` agent가 주요 제품 구현을 담당했다. 실제 ChatGPT 런타임은 계정에서 확인한 `gpt-5.6-luna`다. 구현 중 Luna 사용량 제한으로 중단됐다가 사용자 재개 요청 후 이어서 완료했다. merge/PR/운영 배포는 하지 않았다.

## 기존 상태와 구현
기존 AI-1은 서버 검색과 `/ai/chat`만 제공했고, ChatGPT 구독 로그인 실험은 PC의 별도 화면에 있었다. 포털 공통 UI·현재 문제 전달·음성 사용 흐름은 연결되지 않았다.

- 공통 캐릭터 버튼과 질문 패널, 휴대폰 하단 시트/태블릿 우측 패널, 힌트·쉬운 설명·텍스트 질문을 추가했다.
- 규칙 기차는 현재 수열·보기·선택을, 스도쿠는 보이는 보드·선택 좌표·후보를 명시적으로 전달한다. 숨겨진 정답/solution/부모 메모/DB 검색 도구는 제외한다.
- 다른 게임은 공통 질문창만 제공한다. 판·문제의 자동 인식 기능까지 구현했다고 주장하지 않는다. 부모 화면과 독서기록은 위젯을 넣지 않는다.
- 별도 `/ai/companion/chat`을 추가했다. 기존 `/ai/chat`, disabled 기본값, 독서검색 계약은 그대로다. 입력·Origin·동시성·속도 제한, no-tools, 늦은 응답 generation guard, 닫기/문제 전환 취소를 적용했다.
- Windows loopback bridge는 별도 인증키, DPAPI 등록 파일, token refresh 직렬화/단일 인스턴스 잠금, redirect 거부, `store:false`+`stream:true` 및 완료 이벤트 검증을 사용한다. OAuth 비밀정보를 Docker/브라우저/Git에 전달하지 않는다.
- 음성 입력은 보호자 확인·지원 기능·안전한 접속 환경을 확인한 후 시작한다. 인식된 문장을 확인 후 전송한다. 읽어주기는 수동 실행이다.

## 검증 증거
- 기존 AI 기준 테스트: 25 PASS.
- 콘텐츠 검사: `VALID: 1 enabled activities`.
- 최종 전체 Python 테스트: 218 실행, 실패 0, 1 skipped. PostgreSQL 별도 통합 테스트는 전용 환경 opt-in이 없어 건너뛰었다. 첫 실행의 3개 Node-wrapper 오류는 Windows cp949 디코딩 문제였고, 제품/테스트 변경 없이 `PYTHONUTF8=1`로 재실행해서 통과했다. 마지막 수정 후 전체 218건을 재확인했다.
- 스도쿠 Node 회귀: 3 PASS. 새 companion 집중 테스트는 입력 allowlist/기본 disabled/Origin/도구 차단/bridge 인증/redirect/응답 완료·길이/오류 매핑 등을 검증한다.
- 실제 계정 bridge 합성 `7+5` 질문: 완료된 답변 수신.
- 실제 top-level Chrome `/sudoku`: 선택한 `2행 2열`과 보드 숫자를 보고 “2행에는 이미 1, 2, 3이 있어… 빠진 숫자를 찾아보자” 힌트를 수신했다. 게임 답은 자동 입력하지 않았다.
- 실제 Chrome 규칙 기차: 화면의 빨강·파랑 반복 수열을 보고 “빨강 다음에는 어떤 색이 오는지 생각해 봐” 힌트를 수신했다.
- 요청 중 닫기/재열기에서 늦은 답변은 기존 답변을 덮지 않았다. 발견한 취소 후 대기 문구 잔류는 수정했다.
- CSS viewport를 실제 DOM 기준 360×800, 800×1280, 1280×800으로 확인했다. Chrome 90% 줌에 맞게 viewport override를 보정했다. 수평 overflow 없음, 각 패널 bounds가 화면 안이었다. 이는 실기기 검증이 아니라 Chrome 반응형 검증이다.
- 테스트 서버 HTTP: `/healthz`, `/portal`, `/portal/world/math`, 규칙 기차, `/sudoku`, `/bubble`, `/bubble-shooter`, `/blockpuzzle`, `/baduk`, `/omok`, `/space`, `/facto`, `/jungle`, `/hanja`, `/reading`, `/portal/parent`, `/ai/health`, 위젯 자산 모두 200. 자식 게임은 위젯 asset 1회, 부모/독서/API는 0회였다.
- 캐시 hash 적용 후 최신 preview를 재시작했다. Chrome에서 보호자 확인 없는 마이크 버튼은 인식을 시작하지 않고 안내만 표시했다. 최종 `/ai/companion/chat`의 실제 ChatGPT 수열 힌트 HTTP 200도 다시 확인했다.

## 독립 검토와 수정
추가 tool 접근 차단, 숫자 후보의 문자열 변환과 최대 9개 계약 일치, 실제 visible 보드 전달, async 서버의 blocking provider thread 분리, OAuth form encoding, DPAPI Win64 포인터 타입, 부모 확인 전 마이크 실행 차단, 이전 음성 객체 callback 차단, 닫기 상태 정리, static asset cache 버전 구분을 검토했다.

## 남은 위험과 미검증
- Chrome 스크린샷 명령이 `Page.captureScreenshot` 시간 초과로 실패했다. **desktop/mobile screenshot 증거는 확보하지 못했다**. AX/DOM 배치 확인을 이미지 QA PASS로 표현하지 않는다.
- 실제 휴대폰·태블릿 마이크 권한/한국어 인식/재생 품질, 가상 키보드, HTTP 사설IP에서의 음성 fallback은 미검증이다. 음성 인식은 브라우저 공급자로 전송될 수 있다.
- 네트워크 socket/read timeout과 읽기 사이 elapsed 제한은 있지만 악의적 slow-drip에 대한 엄격한 전체 wall-clock deadline을 보장하지 않는다. 취소는 표시를 무효화하며 이미 시작한 서버 추론/구독 사용량 중단을 보장하지 않는다.
- bridge는 기본 loopback이다. Docker production이 접근하는 네트워크 개방/방화벽/서비스 상주 설정은 이번 범위가 아니다.
- 보호자 체크는 안내 확인이지 부모 인증이 아니다. 프롬프트와 UI 경고는 개인정보 필터·안전 답변 보장이 아니다. under-13 개인정보 처리의 ZDR 조건이 구독 경로에서 충족됐다고 가정하지 않는다. 독립적인 어린이 사용/운영 활성화는 추가 안전 검토 전 NO-GO다.
- host8080 조회/접속/조작 없음. production8081·다른 컨테이너·volume·DB 변경 없음. 기존 dirty 작업트리는 보존했다.

## 재현 가능한 성인 전용 preview
이미 이 Windows 계정에 EDUNI ChatGPT 등록이 있을 때 앱 폴더에서:

```powershell
python scripts/run_companion_preview.py --owner-live
```

인증키는 메모리에서만 생성한다. 앱/bridge는 임의의 127.0.0.1 포트, DB는 disposable 임시 파일을 쓴다. 질문은 구독 사용량에 포함된다. 합성 학습 질문만 사용하며 종료 시 자식 프로세스와 임시 DB를 정리한다. 비밀번호나 OAuth token을 출력하지 않는다.
