# 독서 기록의 블로그 작성 메모

## 이번 변경의 목표

독서 기록 팝업의 `블로그 초안`을 `블로그 작성 메모`로 바꾼다. 사용자가 꼭 넣고 싶은 내용과 글 분위기를 기록별로 저장하고, 자동 작성기가 GPT를 호출할 때 함께 참고한다. 사용자가 초안 파일을 내려받거나 사진을 다시 선택하지 않는다.

## 조사한 자료와 적용

- https://github.com/konamgil/naver-blog-mcp : Playwright 기반 네이버 자동화 공개 사례. 로그인 세션을 로컬에서 재사용하는 방향 참고. 공개 구현의 존재가 EDUNI에서 성공했다는 증거는 아니다.
- https://github.com/choigpt-ai/naver-blog-automation : 메모/소재를 AI 글로 확장하고 로컬 Chrome으로 입력하는 공개 사례. 메모는 입력 자료로 보관하는 방향 참고.
- https://dbhyeong.github.io/blog/naver-blog-smarteditor-rabbitwrite-image-upload-automation : 개발자가 정리한 SmartEditor 이미지 업로드·발행·결과 재조회 사례. 비공식 내부 API 분석이므로 그대로 도입하지 않고 업로드 성공과 게시 결과를 각각 확인해야 한다는 검증 항목을 참고한다.
- https://n8n.io/workflows/9217-automate-blog-publishing-from-postgresql-to-wordpress-with-openai-gpt/ : DB 미처리 기록 조회 → GPT → 게시 → 처리 상태 저장 사례. WordPress와 네이버의 게시 인터페이스는 다르므로 DB 중심 작업 흐름만 참고.
- https://www.postgresql.org/docs/current/sql-notify.html : 알림은 커밋 후 전달되며 큰 자료는 테이블에 저장하고 키로 참조하는 방식 설명. 이번 변경은 기존 polling을 유지한다.
- https://playwright.dev/docs/input#upload-files : 파일 입력과 filechooser 사용의 공식 근거. 파일 지정 성공과 네이버 업로드 완료 확인은 별도 검증 대상이다.

## 개발 범위와 역할

| 담당 | 범위 | 완료 조건 |
| --- | --- | --- |
| 저가 모델 A | 포털 UI, PG/SQLite 호환 스키마, 기록별 설정 API | 메모/톤 저장 후 다시 열어 동일한 내용 확인; 초안 생성/다운로드 UI 제거 |
| 저가 모델 B | GPT 중계 입력 검증과 프롬프트 | 메모 4,000자 제한, 기존 요청 호환, 사용자 참고자료로 전달 |
| 저가 모델 C | Windows 감시기 연결, 소스 변경 감지 | 메모/톤과 사진 안정화 확인, 생성 중 변경 시 재시도, 오래된 JSON 재사용 방지 |
| 주 담당 | 범위·계약 확정, 코드 통합 검토, 검증 결과 정리 | 경로 전체 계약 일치 및 변경/미검증 범위 보고 |

조사에는 별도의 저가 모델들이 네이버 공개 소스와 PostgreSQL 작업 흐름을 나눠 확인했다.

## 데이터와 동작 계약

- `reading_record.blog_note`: 문자열, 기본값 빈 문자열, 최대 4,000자.
- `reading_record.blog_tone`: `family`, `plain`, `child`, `book`; 기본값 `family`.
- 기존 PG/SQLite 테이블에 데이터를 보존하는 반복 실행 가능한 컬럼 추가.
- `GET/PATCH /reading/api/records/{id}/blog-settings`: 해당 자녀 프로필 범위의 기록별 설정 조회/저장. PATCH는 기존 Origin/X-Requested-With 검증 방식을 따른다.
- `source_revision`: 저장된 메모/톤의 해시. GPT 호출 전후 비교하여 생성 중 변경된 자료를 결과로 채택하지 않는다.
- 메모는 보호자 메모와 독립적이다. 보호자 메모 제외 옵션으로 작성 메모까지 누락시키지 않는다.
- 사진 원본은 기존 첨부파일 저장소에서 제공하고 PG의 연결·순서·설명 정보를 이용한다. 기존 블로그 사용 선택 정책을 따른다.
- 로컬 JSON은 자동 작성기의 내부 전달·복구 파일로만 사용한다. 사용자 다운로드 동작은 제거한다. 이전 파일은 보존하고 입력 버전별 파일을 사용한다.
- 저장 버튼은 메모와 톤만 저장한다. 이미 처리된 기록을 다시 발행하는 동작은 유발하지 않는다.

## 검증과 경계

기존 DB에서의 컬럼 추가, 저장·재조회·입력 제한·프로필 범위, 보호자 메모 제외 시 작성 메모 전달, 생성 중 설정 변경, 감시기의 이전 버전 재사용 방지를 집중 검증한다.

이번 범위는 작성 메모의 저장부터 GPT 자동 입력까지다. 네이버 이미지·영상 업로드 및 최종 발행의 신뢰성 개선, 서버 작업 큐 구축, 이미 발행된 글 자동 수정은 별도 범위다. 소스 변경 검증과 운영 PG·네이버 실동작 검증을 구분해 보고한다. 푸시·배포·실행 중인 도우미 재시작은 이번 개발 결과에 포함하지 않는다.
