# EDUNI 사고력 콘텐츠 벤치마킹·분류 및 초기 등록 보고서

- 작성일: 2026-11-23
- 대상: 7~9세 아동 + 보호자 동행, 기존 가족 포털 생각탐험 연구소
- 연계: `docs/eduni_integrated_thinking_curriculum_20261123.md`
- 데이터: `nice-gui-1-1-7/content/thinking_catalog.json` (출처/분류/후보), `thinking_missions.json` (실행 미션)
- 검토 상태: 출처 링크/이용 조건 조사, 자체 작성 콘텐츠 1차 등록; 전문가 감수·실제 아동 사용성 미검증

## 1. 조사 목적 및 선택 기준
**문제집 복제**가 아니라 실제 생활에서 아이가 문제를 **발견→정의→대안→검증→성찰**하도록 만드는 교육 과제를 찾는다.
- 단순 정답형보다 원인을 추론하고 여러 해결책을 비교할 수 있는 문제를 우선한다.
- 현재 아동 발달 수준에 맞게 7~9세, 한 화면에서 이해할 수 있는 간결한 상황과 2~3개 선택지, 화면 밖 재료/역할놀이를 기본으로 삼는다.
- 아이가 다르게 생각해도 '오답'으로 처벌하지 않는다. 부모는 근거를 묻고 안전을 지원한다.
- 기존 독서·수학·과학을 대체하지 않고 사고 과제와 연결한다.
- 보호자 없는 위험한 실험, 화학약품·화염·고온, 작은 구슬/날카로운 도구 등은 콘텐츠에 넣지 않는다.

## 2. 조사한 참고 소스 및 적용 방침

| 참고 출처 | 참고할 교육 방식 | 이용 조건 및 EDUNI 적용 |
|---|---|---|
| [Harvard Project Zero: See Think Wonder](https://www.pz.harvard.edu/resources/see-think-wonder) | 관찰 사실·해석·질문 분리 | **CC BY-NC-ND**: 원본 개작·번역·재게시 금지로 판단하여 개념 참고, 자체 질문 작성 |
| [Harvard Project Zero: Circle of Viewpoints](https://pz.harvard.edu/resources/circle-of-viewpoints) | 여러 사람의 관점 비교 | 동일한 조건으로 직접 복제 없이 설계 참고 |
| [PBS Kids for Parents: Creative Problem-Solving](https://www.pbs.org/parents/creative-problem-solving) | 집의 물건을 이용한 설계·재도전 | 링크/교육 아이디어 참고만, 자료·사진 재게시 없음 |
| [PBS Kids: Play Ball Obstacle Course](https://www.pbs.org/parents/crafts-and-experiments/play-ball-obstacle-course) | 실제 이동 경로 제작·테스트 | 직접 복제 없이 새 상황과 문항 설계 |
| [PBS Kids: Computer Science Skills Anytime](https://www.pbs.org/parents/thrive/practicing-computer-science-skills-anytime) | 패턴·순서·디버깅 | 개념 참고, 자체 스토리 제작 |
| [PBS Kids: Doing Science Every Day at Age 7](https://www.pbs.org/parents/learn-grow/age-7/science/doing-science-every-day) | 일상 과학·설계 연결 | 부모 지도 관점만 참고 |
| [NASA: K-4 Resources](https://www.nasa.gov/learning-resources/for-students-grades-k-4/) / [JPL Family Activities](https://www.jpl.nasa.gov/edu/resources/lesson-plan/stem-activities-for-families/) | 자연/우주 현상 관찰·가족 프로젝트 | **이미지·미디어 개별 조건 확인 필요**, NASA 상표·로고 사용 금지; 현 단계 외부 파일 미사용 |
| [CS Unplugged: Sorting Networks](https://www.csunplugged.org/en/topics/sorting-networks/) / [Error Detection](https://www.csunplugged.org/en/topics/error-detection-and-correction/) | 단계적 명령·오류 검출·분류 | 공식 사이트 **CC BY-SA 4.0**: 재사용하면 저작자 표시·동일조건변경허락. 현 단계는 **독립 문항**만 작성 |
| [Science Buddies: Paper Bridge](https://www.sciencebuddies.org/stem-activities/build-best-bridge) | 모형 제작·조건 통제·예측 검증 | **소프트웨어에 콘텐츠 사용 시 사전 서면 허가 필요**, 링크는 허용. 지문/도안/이미지/절차 복제하지 않음 |
| [TeachEngineering: Elementary Engineering Design](https://www.teachengineering.org/curricular-units/ucd_fieldday_unit) | 문제 정의→설계→반복 | 내부 학술용 외 배포 시 사전 승인 필요; **전재·스크래핑 금지** |
| [Royal Society of Chemistry: Primary Investigations](https://edu.rsc.org/primary-science/find-resources/experiments-and-investigations) | 관찰·변인 통제·증거 비교 | 포털 재게시 권리 확인되지 않아 링크/아이디어만 참고 |
| [Smithsonian Learning Lab: Object-Based Learning](https://learninglab.si.edu/help/object-based-learning) | 실물 관찰·해석·대화 | [Open Access](https://www.si.edu/openaccess/faq)에서 **CC0 표시 개별 자료만** 자유 재사용 가능. 사진/자산 미수집 |
| [EBS 초등: 창의체험 탐구생활](https://primary.ebs.co.kr/course/view?courseId=100001122) | 국내 초등 눈높이, 안전·인성·탐구 연결 | [EBS 약관](https://sso.ebs.co.kr/policy/termsInfo)상 사전 승낙 없는 복제·번역·배포 금지; 직접 전재하지 않음 |
| [한국과학창의재단: 사이언스올](https://www.scienceall.com/cmn/mcs/page/adventure/menu/288) | 국내 과학 실험·탐구 주제 | 개별 자료의 공공누리/저작권 이용 허가를 확인하지 못함; 링크/주제 참고만 |

**저작권 결론:** '무료로 볼 수 있다'와 '우리 GitHub/포털에 복사하여 올려도 된다'는 다르다. 링크 자체와 일반적 원리/교육방법을 참고하여 **새롭게 만든 대화·상황·선택지만** 업로드한다. 본 조사에서 외부 지문, PDF, 문제 이미지, 영상, 코드, 원본 음성 자료는 다운로드·전재하지 않았다. 추후 외부 사진을 사용한다면 개별 객체/이미지별 권리를 먼저 기록한다.

## 3. 8개 카테고리 체계

| 카테고리 | 목표 역량 | 실행 가능 콘텐츠 (각 2개) |
|---|---|---|
| 문제 탐정단 | 사실 관찰, 문제 찾기/정의 | 놀이터 문제 탐정 · 표지판이 사라진 길 |
| 과학 탐구실 | 가설 세우기, 하나의 조건 바꿔 비교하기 | 어느 낙엽이 먼저 마를까? · 물을 가장 잘 흡수하는 재료 |
| 발명 연구실 | 설계, 시험, 재설계 | 종이 다리 발명가 · 공이 지나가는 종이 길 |
| 이야기 법정 | 관점·공감·근거·협력 | 사라진 장난감의 주인은? · 토끼와 고슴도치의 비 오는 날 |
| 우리집 프로젝트 | 생활문제와 자기주도·협상 | 장난감을 쉽게 찾는 방 · 우리 가족 차례 회의 |
| 규칙·논리 실험실 | 알고리즘·분류·디버깅 | 카드를 정리하는 로봇 · 로봇에게 길을 알려줘 |
| 수학·자료 탐험 | 수 감각·데이터·판단 기준 | 가족 간식 투표 · 블록 아홉 개를 나누는 방법 |
| 자연과 지구 | 환경 문제 정의, 관찰·장기 검증 | 소풍 쓰레기를 줄이는 가방 · 식물은 어디에서 더 잘 자랄까? |

**총 후보 32개:** 현 버전 실행 미션 16개(기존 2개 + 새 14개) / 후속 제작을 위한 아이디어 16개. 모든 후보는 `thinking_catalog.json`에 ID·카테고리·연령·난이도·출처 ID·상태를 기록한다.

## 4. 문제 템플릿 품질 기준
1. 아이가 겪을 법한 구체적인 상황이 있고 **관찰 가능한 문제**를 말할 수 있다.
2. 아이가 **성공 기준**을 선택/표현할 수 있어야 하며, 정해진 유일한 정답으로 몰아가지 않는다.
3. 위험하지 않은 **대안 2개 이상**을 낼 여지가 있다.
4. 화면 밖에서 가족과 **재료 실험, 관찰, 역할놀이 또는 토론**으로 실행할 수 있다.
5. 최소한 하나의 예상과 결과 차이를 말하거나 다음 실험을 제안할 수 있다.
6. 5단계 중 과학/수학적으로 사실이 중요한 부분은 실제 관찰, 기준 유지, 장기 관찰 등에 관한 보호자 안내를 제공한다.

## 5. 난이도 및 운영
- `beginner`: 친숙한 단일 문제, 2~3개 대안, 짧은 역할놀이/조작.
- `intermediate`: 여러 원인 후보·공정한 비교·관점 전환·기간을 둔 관찰.
- 카테고리를 강제 순서로 소비시키지 말고 아이가 **오늘 할 탐험을 선택**한다. 같은 미션의 재도전은 별도 후속 UX에서 지원(현재 완료 상태는 유지).
- 결과는 **맞고 틀림의 점수**가 아닌 문제 정의·재검토·다른 시각 시도 등의 행동 근거로 평가한다. 행동·사고의 임상 진단은 금지.
- 기존 아동 프로필과 부모 PIN, 중간 저장/재개, 개인 정보 최소화를 유지한다.

## 6. 실제 개발/검증 범위
- 데이터: `thinking_missions.json`에 미션 추가. 모든 미션은 5단계이고 `offline_task`, `parent_tip`을 포함한다.
- 조사 메타데이터: `thinking_catalog.json`에 실행/대기 후보와 참조 URL·라이선스 표기.
- 표시: 생각탐험 홈에서 **카테고리별로 묶어** 탐험할 수 있도록 한다.
- 자동 검증: 16개 유효 JSON, 8개 카테고리, 32개 카탈로그 항목, 실제 미션과 카탈로그 일치, 참고 출처 연결, 기존 저장/프로필/포털 라우트 회귀.
- 종료 조건: 검사 PASS & Draft PR 유지. **운영 배포·PR 병합·외부 미디어 수집 금지**.
- 남은 위험: 연령별 교육 적합성은 보호자·아동 실제 사용 후 조정 필요. 이미지·시뮬레이션 조작형 UX는 추후 설계. 외부 참조 사이트 이용약관은 바뀔 수 있으므로 외부 콘텐츠 재사용 전에 다시 확인.

## 7. 향후 확장 제안
우선 16개를 4주 이상 가족이 실제로 사용하며, 아이가 선택지를 단순 클릭하는지 진짜 이유를 말하는지 관찰한다. 적응이 확인된 이후 16개 후보 중 유형의 다양성과 흥미도가 높은 과제를 순차적으로 실미션으로 만든다. 이후 수학/독서/공간추론 기존 게임에서 생각탐험으로 이동하는 연결 활동을 구현한다. AI 코치는 보호자가 운영하는 보조 기능으로 남긴다.
