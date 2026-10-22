# 정글 대탐험 개발 진입 문서

> **Jungle 2.0 전환 중**
>
> 현재 저장소에는 초기 트럭형 MVP와 캐릭터 직접 이동형 Adventure 구현이 함께 존재한다.
> 신규 개발은 먼저 `JUNGLE_2_COLLAB.md`와 GitHub Issue `JNG-000`을 읽고 진행한다.
> 아래 Phase A~D 내용은 JNG-000에서 canonical runtime이 확정될 때까지 **legacy planning reference**로만 사용한다.

## Jungle 2.0 작업 진입 순서

1. 루트 `AGENTS.md`
2. `nice-gui-1-1-7/AGENTS.md`
3. `docs/jungle_expedition/JUNGLE_2_COLLAB.md`
4. 현재 `JNG-xxx` GitHub Issue
5. 해당 Issue에서 지정한 target files만 읽기

---

이 폴더는 `정글 대탐험`을 CODEX가 짧은 컨텍스트로 단계별 구현하기 위한 단일 진입점이다.

## 기존 CODEX 진입 순서 · Legacy

정글 대탐험 작업을 시작할 때 전체 저장소를 스캔하지 말고 아래 순서만 읽는다.

1. 루트 `AGENTS.md`
2. `nice-gui-1-1-7/AGENTS.md`
3. 이 파일
4. `docs/jungle_expedition/phase_plan.md`
5. 현재 Phase 문서 하나만 읽기

Phase A를 수행할 때는 `docs/jungle_expedition/phase_a_kickoff_prompt.md`만 추가로 읽는다.

## 초기 확정 게임 방향 · Legacy

- 게임명: `정글 대탐험`
- 우선 기기: 세로형 모바일 화면
- 성격: 운전 게임이 아니라 새 채집·도감 완성 게임
- 트럭: 화면 하단 중앙에 거의 고정
- 주행 연출: 트럭이 아래에서 위로 전진하는 느낌. 구현은 좌우 나무·가지·풀·길 무늬가 위에서 아래로 흐르게 한다.
- 정글 배치: 가운데 좁은 길, 좌우에 울창한 나무와 가지
- 새 배치: 좌우 나뭇가지에 랜덤 등장
- 조작: `전진`, `정지`, `짐칸` 버튼
- 새 터치: 자동 정지 후 문제 카드 표시
- 문제 영역: 한자 7~6급, 구구단, 영어, 과학에서 랜덤
- 포획 조건: 문제 1개 정답
- 동일 새 재등장: 허용
- 동일 새 재등장 문제: 동일 난이도의 최근 문제를 피하고 다른 문제 우선
- 오답 패널티: 없음. 재도전과 힌트 제공
- 초기 이미지: 이모지 또는 단순 일러스트. 이미지 교체가 쉬운 `asset_key` 구조 사용

## 초기 핵심 사용자 흐름 · Legacy

```text
전진
→ 좌우 숲이 아래로 흐름
→ 나뭇가지 위 새 발견
→ 새 터치
→ 자동 정지
→ 랜덤 학습 문제 1개
→ 정답
→ 새가 짐칸으로 이동
→ 도감 기록
→ 탐험 재개
```

## 공통 개발 원칙

- 각 기능은 별도 브랜치와 Draft PR로 진행한다.
- 현재 Issue 범위를 넘는 코드는 만들지 않는다.
- 기존 게임 `/`, `/bubble`, `/bubble-shooter`, 기존 포털, 한자 시험 경로를 유지한다.
- Nextcloud 컨테이너와 배포 설정은 건드리지 않는다.
- 분석, 광고, 위치, 카메라, 음성, 외부 업로드를 추가하지 않는다.

## 문서 목록

- `JUNGLE_2_COLLAB.md`: Jungle 2.0 3-Agent 협업 규약 및 현재 진입점
- `phase_plan.md`: 초기 트럭형 MVP Phase 경계 · legacy
- `phase_a_kickoff_prompt.md`: 초기 Phase A CODEX 지시문 · legacy
- `acceptance_checklist.md`: 초기 Phase별 완료 조건 · legacy
