# REPORT_JUNGLE_QUIZ_BANK_PLUS200_09

## 요약
- **변경 파일**: `jungle-web-canvas-poc/src/content/bird_quiz_bank.js`, `jungle-web-canvas-poc/tests/bird_quiz_bank.test.js`, `jungle-web-canvas-poc/scripts/gen_quiz.py`
- **총 문항 수**: 265 (기존 65 + 신규 200)
- **테스트 결과**: 9/9 통과

## 카테고리 분포

| 카테고리 | 문항 수 |
|----------|---------|
| animals | 27 |
| basic_science | 27 |
| space | 25 |
| plants | 24 |
| weather | 21 |
| senses | 21 |
| safety | 21 |
| water_nature | 18 |
| environment | 16 |
| nature | 14 |
| math | 12 |
| dailyLife | 11 |
| science | 11 |
| korean | 10 |
| observation | 7 |
| **합계** | **265** |

## 테스트 결과

```
✔ exports an array with exactly 265 questions
✔ has sequential IDs q001 through q265 with no gaps
✔ each question has required fields
✔ each question has exactly 4 choices
✔ each question has unique choice IDs within that question
✔ each answer matches one of its choice IDs
✔ no duplicate question stems
✔ all categories are from the expected set
✔ all questions are frozen objects
```

## 중복 검사
- 정규화된 문제 문장 기준 중복 0건 확인

## 랜덤 정책
- 기존 q001~q065 고정 매핑 테스트 호환성 유지
- 신규 q066~q265는 pool 기반 랜덤 선택 가능
- 동일 플레이 세션 내 중복 문제 방지 검증 완료

## 호환성
- 기존 `BIRD_QUIZ_BANK` export 유지
- 기존 game.js/clue/stage mapping 변경 없음
- 새 문제는 기존 카테고리 체계 사용
