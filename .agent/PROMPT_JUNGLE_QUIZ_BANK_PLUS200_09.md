# PROMPT_JUNGLE_QUIZ_BANK_PLUS200_09

## Mission
현재 65문항 bird quiz bank를 기반으로 **초등 저학년용 200문항을 추가**해 총 265문항 이상으로 확장한다. 게임 진행 로직은 변경하지 않고 콘텐츠 품질/중복 방지/랜덤성을 강화한다.

## Branch
`prototype/jungle-web-canvas-poc`

## 병렬 작업 규칙
- Waterfall reward finalize 및 Cave/GiantTree 작업과 충돌 최소화.
- 주 수정 대상은 `src/content/bird_quiz_bank.js`와 전용 테스트.
- stage progression/game.js 수정 금지 unless absolutely necessary.

## Content contract
- 한국어, 7세 전후가 이해 가능한 짧은 문장.
- 객관식 4지선다, 정답 1개.
- 문제/선택지/설명 모두 자연스러운 한국어.
- 지나친 암기/전문용어/논쟁적 내용 제외.
- 카테고리 균형: 동물, 식물, 날씨, 물/자연, 우주, 감각/관찰, 기초과학, 생활안전/환경.
- 기존 65문항과 실질 중복 금지.
- 신규 ID 연속 부여.

## Randomization
- 플레이마다 같은 3문제가 고정 노출되지 않도록 현재 clue/stage mapping을 깨지 않는 범위에서 pool 기반 랜덤 선택 구조를 검토.
- 동일 플레이 세션 내 중복 문제 금지.
- 최근 출제 문제 반복 억제 가능하면 구현.
- 단, 기존 q001/q004 등 고정 매핑 테스트가 설계 의도라면 호환성을 유지하고 새로운 pool API를 추가하는 방식 우선.

## Tests
- 총 문항 수 >=265
- ID unique
- choice 4개 unique
- answer가 choice에 정확히 1개 존재
- question/label/explanation 빈 문자열 없음
- duplicate stem 정규화 검사
- 카테고리 분포 검사
- 랜덤 picker session 중복 없음
- node --test / git diff --check

## Report
`.agent/REPORT_JUNGLE_QUIZ_BANK_PLUS200_09.md`
문항 수, 카테고리 분포, 중복 검사, 랜덤 정책, 테스트 결과 포함.

코드+테스트+REPORT commit/push. merge/close 금지.