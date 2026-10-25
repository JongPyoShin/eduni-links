# EDUNI AI 친구 — 출처 검증 교육용 사진 카드

## 변경 목적
어린이 AI 친구가 "북극곰 사진 보여줘" 또는 "고양이는 어떻게 생겼어?"라고 질문받으면 글 답변 아래 **실제 교육용 사진**을 표시한다. 기존 GPT 응답은 텍스트 형식을 그대로 유지한다.

## 아키텍처
1. 기존 응답 흐름: `eduni_companion.js` → `/ai/companion/chat` → 기존 제공자/브리지의 텍스트 답변.
2. 성공 응답에만 `portal_app/ai/educational_photos.py`의 허용 목록에서 질문 텍스트를 매칭한다. 답변 내용, 화면의 보호된 독서기록·이미지, 모델이 생성한 URL에는 의존하지 않는다.
3. **오직 한 주제**가 정확하게 매칭되면 `photo` 객체를 추가한다. 아무것도 매칭되지 않거나 두 주제 이상/사진 거절 요청이면 텍스트 응답만 표시한다.
4. `eduni_companion.js`는 `data.answer`에 기존처럼 `textContent`를 사용한다. `data.photo`를 별도 `figure > img + figcaption + a`로 안전하게 렌더링한다.
5. 클라이언트도 이미지 URL은 HTTPS `commons.wikimedia.org/wiki/Special:FilePath/`, 원본 페이지는 HTTPS `commons.wikimedia.org/wiki/File:`으로 엄격히 제한한다. 이용자 질문이나 모델 답변에 포함된 임의 링크를 HTML로 렌더링하지 않는다.
6. CSS는 좁은 모바일 답변 카드에서 최대 145px 높이의 이미지 썸네일 및 출처가 보이게 한다. 답변 취소/화면 전환/다음 질문에서 이전 사진 즉시 제거. 이미지 로드 실패 시 카드 숨김.
7. 기존 음성 읽기 기능은 답변 텍스트만 읽는다(저작권·URL 정보를 음성으로 읽지 않음).

## 초기 검증된 주제 7개
| 주제 | 실제 Wikimedia Commons 파일 | 촬영자/제공 및 라이선스 |
|---|---|---|
| 북극곰 | [Polar Bear.jpg](https://commons.wikimedia.org/wiki/File:Polar_Bear.jpg) | U.S. Fish and Wildlife Service — 공개 도메인 |
| 펭귄 | [Emperor penguin.jpg](https://commons.wikimedia.org/wiki/File:Emperor_penguin.jpg) | Michael Van Woert / NOAA — 공개 도메인 |
| 고양이 | [Cat November 2010-1a.jpg](https://commons.wikimedia.org/wiki/File:Cat_November_2010-1a.jpg) | Alvesgaspar — CC BY-SA 3.0 |
| 강아지 | [YellowLabradorLooking new.jpg](https://commons.wikimedia.org/wiki/File:YellowLabradorLooking_new.jpg) | Elf / Djmirko / FT2 — CC BY-SA 3.0 |
| 사자 | [Lion waiting in Namibia.jpg](https://commons.wikimedia.org/wiki/File:Lion_waiting_in_Namibia.jpg) | Kevin Pluck — CC BY 2.0 |
| 지구 | [The Earth seen from Apollo 17.jpg](https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg) | NASA / Apollo 17 crew — 공개 도메인 |
| 달 | [FullMoon2010.jpg](https://commons.wikimedia.org/wiki/File:FullMoon2010.jpg) | Gregory H. Revera — CC BY-SA 3.0 |

이미지는 원본 파일이 아닌 MediaWiki `Special:FilePath/?width=640` URL로 축소된 썸네일을 요청한다. 출처 원본 페이지에 저작자·라이선스 정보가 있다. Wikimedia Commons가 사진을 교체하거나 로드에 실패하면 사진 대신 텍스트만 보인다.

## 안전·개인정보
- AI가 검색한 임의 사진, 외부 HTML/마크다운의 이미지, 이미지 생성 모델 출력 **미지원**.
- 사용자 위치, 자녀 이름, 이미지 첨부·독서기록 사진 등은 이미지 주제 매칭에 사용하지 않는다.
- 사진 표시 시 아이의 브라우저가 Wikimedia Commons 및 그 이미지 전송 서버에 HTTP 요청을 보내므로 **IP 등 접속 정보는 전달될 수 있다**. 기존 개인정보 안내에 이 사실을 추가했다.
- 이미지 확대·다운로드·공유/추적 로직 없음. 레퍼러 전송 방지 `referrerpolicy=no-referrer` 적용.
- 일반 질문과 두 주제 이상 질문은 모두 텍스트 답변 유지. 사진을 보여주지 말라는 요청도 존중.
- 출처 검증·라이선스 검토 후에만 허용 목록 추가. 사용자 입력이나 모델의 주소를 URL 조합에 사용할 수 없다.

## 개발 경계 및 배포
본 AI 친구 코드는 EDUNI 공개 `main` 브랜치에는 아직 없고 **`feature/eduni-ai-companion` 브랜치**에 있어, 그 분기에서 출발한 별도 기능 PR로 유지한다. 운영 Docker 이미지와 branch 관계는 별도 확인 필요. 사용자 명시적 승인 없이는 main 병합·운영 컨테이너 배포·재시작하지 않는다.

## 검증
- V8 모의 DOM/UI: 사진 출력, 원본 출처, 텍스트 음성 유지, 악성 URL 무시, 이전 답 사진 정리 PASS.
- Python `tests/test_companion_educational_photos.py`: 7개 주제·출처·거절·모호한 질문·JSON 응답 검증 추가. 실제 Python 전체 suite와 운영 도커/브라우저 픽셀은 **아직 미실행**.
