# 정글 대탐험 MVP 단계 계획

## 공통 원칙

- 각 Phase는 별도 브랜치와 Draft PR로 진행한다.
- 이전 Phase가 merge되고 운영 검증된 뒤 다음 Phase를 시작한다.
- CODEX는 현재 Phase 문서와 관련 파일만 읽는다.
- 기존 게임, 포털, 한자 시험, Nextcloud, 배포 설정은 건드리지 않는다.

## Phase A · 세로형 채집 화면 기반

### 목표
세로형 모바일 화면에서 트럭이 아래에서 위로 전진하는 느낌을 만들고, 좌우 나뭇가지 위 임시 새를 터치할 수 있게 한다.

### 포함
- `/portal/activity/jungle.expedition.001` 라우트
- `portal_app/jungle_expedition.py` 신규 모듈
- 세로형 정글 화면
- 하단 중앙 고정 트럭
- 가운데 좁은 길
- 좌우 울창한 나무·가지·풀
- `전진`, `정지`, `짐칸` 버튼
- 전진 시 정글 오브젝트가 위에서 아래로 이동
- 임시 새 1종 랜덤 등장
- 새 터치 시 자동 정지와 임시 발견 카드
- 모바일 터치 영역 확보
- 최소 라우트 테스트

### 제외
- 실제 문제 출제
- SQLite
- 도감 저장
- 희귀도
- 새 데이터 JSON
- 포획 기록
- 배포와 컨테이너 재시작

## Phase B · 문제 출제와 포획

### 목표
새를 터치하면 랜덤 학습 문제 1개를 풀고 정답 시 짐칸으로 수집한다.

### 포함
- 문제 JSON 구조
- 한자 7~6급, 구구단, 영어, 과학 샘플
- 영역 랜덤 선택
- 난이도 선택
- 동일 새 최근 문제 중복 회피
- 오답 재도전과 힌트
- 정답 시 포획 연출
- 세션 내 임시 짐칸 카운트

### 제외
- SQLite 영구 저장
- 완성형 도감
- 희귀 새 확률 보정

## Phase C · 새 목록과 도감

### 목표
새 종류, 희귀도, 도감, 풀이 기록을 영구 저장한다.

### 포함
- 새 JSON
- 흔한 새 5종
- 희귀 새 5종
- 전설의 새 3종
- `asset_key`
- SQLite 테이블
- 발견 여부, 포획 횟수, 최근 포획 시각
- 최근 풀이 문제 기록
- 짐칸·도감 화면
- 새 상세 화면

## Phase D · 밸런스와 운영 검증

### 목표
채집 리듬, 모바일 체감, 희귀도 밸런스와 회귀 안정성을 검증한다.

### 포함
- 등장 간격 5~10초 조정
- 동시 등장 최대 3마리
- 흔함 68%, 희귀 26%, 전설 6%
- 희귀·전설 pity counter
- 화면 체류 시간 조정
- 모바일 터치 검증
- 전체 unittest
- route smoke test
- 운영 배포 절차

## 예상 신규 파일

```text
nice-gui-1-1-7/
├─ portal_app/
│  ├─ jungle_expedition.py
│  ├─ jungle_models.py
│  ├─ jungle_repository.py
│  └─ jungle_question_selector.py
├─ content/
│  ├─ activities/mixed/jungle_expedition_001.json
│  ├─ birds/jungle_birds.json
│  └─ questions/
│     ├─ hanja_7_6.json
│     ├─ multiplication.json
│     ├─ english_basic.json
│     └─ science_basic.json
└─ tests/
   ├─ test_jungle_routes.py
   ├─ test_jungle_question_selector.py
   ├─ test_jungle_collection.py
   └─ test_jungle_spawn_policy.py
```

실제 파일 추가 시점은 각 Phase 범위에 따른다.
