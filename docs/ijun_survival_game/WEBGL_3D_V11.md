# EDUNI 마주치지 마! v1.1 — 실제 WebGL 3D MVP

## 범위

v0.9 모바일 카메라 수정 및 v1.0 UI를 토대로 기존 2D Canvas와 병행 가능한 **실제 Three.js WebGL 3D 렌더러**를 추가했다. 기존 `SurvivalLogic` / `SurvivalWorlds`가 좌표·추격·충돌·은신·열쇠/보스/탈출 규칙을 독점하며, 3D는 각 프레임의 `state`만 읽어 그린다.

### 구현 완료

- `survival3d.module.js`: Three.js 0.186.1(고정) ES module, OrthographicCamera, HemisphereLight+DirectionalLight, Fog, 실제 메시/재질.
- 세계별 기본 3D 지형: 정글 나무와 야자, 북극 빙산/설벽, 피라미드 석조 벽과 사각 신전.
- 3D 주인공(탐험가/토끼), 적과 보스, 쉼터, 회전하는 열쇠, 별, 출구, 위험 표시.
- 실제 2D 충돌 장애물 크기 기준으로 3D 벽 생성, `px/48`로 모든 로직 좌표를 3D 지면 X/Z에 일치시킴.
- 게임 카메라는 기존 `state.camera` + 모바일 논리 `viewW/viewH`를 사용하므로 v0.8의 과대 확대가 재발하지 않음. WebGL은 CSS 플레이필드 크기에만 맞추고 픽셀 비율 1.5 제한.
- **2D/3D 그래픽 모드 버튼**. GPU/WebGL2 없음, JS 모듈/CDN 로딩 실패, 렌더 오류, WebGL 컨텍스트 손실 시 기존 Canvas 게임은 계속 실행 가능. Canvas 게임 규칙과 모바일 조작을 교체하지 않음.
- 3D 관련 새 자산을 강제로 다운로드하지 않음. GPU 메모리/네트워크 위험을 줄이기 위해 텍스처와 외부 GLB 모델 없는 로우폴리 메시로 시작.
- WebGL 코드가 준비되는 시점에 2D에서 3D로 자연스럽게 전환. 게임 오버레이와 미니맵은 기존 DOM/Canvas에 남김.
- Three.js는 npm 기준 MIT 라이선스. 기존 게임에서 3D 모드 사용 시 브라우저가 CDN `cdn.jsdelivr.net`에 ES 모듈을 요청함; 접속 정보는 CDN에 전달될 수 있음.

## 시각적 한계와 다음 단계

이번 v1.1은 **실제 WebGL 3D**이지만 제작한 입체 도형 중심의 스타일이다. Scenario의 텍스처링·리깅이 끝난 캐릭터 GLB를 가져다 쓴 것은 **아님**. 최종 3D 그래픽 품질 목표는 인게임 장면을 캡처하고 실제 Android FPS·메모리를 측정한 다음 결정한다.

Scenario 컬렉션: https://huggingface.co/datasets/scenario-labs/3d-collection
- 1,342개 선별 생성 예제 중 GLB 1,271개, 전체 약 39GB.
- 데이터셋 CC BY 4.0 / 출처 표기 **Scenario**. 외부 자산을 실제로 사용할 때는 라이선스·수정 여부·파일별 출처를 HUD 하단 또는 Credits에 표시한다.
- v1.2에서 월드별 2~3개 에셋을 시각·크기·폴리곤·리깅·애니메이션 품질별로 선별하고 압축 GLB를 **자체 서버에서** 제공하는 형태로 검토한다.
- 월드 성능 목표 **모바일 30fps / 초기 전송 8MB 이하**는 계획 목표이며 측정된 성능 수치가 아님.

## 아키텍처 및 복구

```
logic.js + worlds.js   (유일한 게임 상태/충돌)
           |
         game.js   -> 2D Canvas draw (fallback)
           |
           +-> SurvivalThreeD.render(state,view)
                         |
                    Three.js WebGL
                    scene/camera/meshes
```

- 게임 화면 `#gameCanvas`는 DOM에서 유지하여 실제 레이아웃/입력 계약을 보존. 3D 정상시 visibility hidden, WebGL canvas는 .canvas-wrap 내 pointer-events:none 로 겹쳐 표시.
- 모듈 import 실패 시 `window.SurvivalThreeD` 객체가 없어도 게임은 원래 2D로 작동한다.
- 렌더 예외 및 webglcontextlost 시 기본 2D로 복구하고 3D 토글을 비활성화한다.
- 상단 3D/2D 버튼은 WebGL 준비되기 전에는 `2D` disabled.
- `game.js`의 frame/tick/AI 메커니즘은 수정하지 않고 draw() 시작 부분에 렌더러 우회만 추가했다.

## 검증

- 기존 `logic/render25d/worlds` 집중 테스트 **37 PASS** (격리 JS).
- 신규 `test_survival_webgl_3d.cjs` 집중 테스트 **3 PASS** (대역 Three.js/DOM):
  1. 정글·북극·피라미드 WebGL 생성 및 상태/캐릭터/열쇠/보스 변경
  2. 2D/3D 토글 및 컨텍스트 손실 시 Canvas 복구
  3. WebGL2 미지원시 안전 2D 기본 모드
- 가족 포털/공개 페이지 HTML 동등성, v11 리소스 버전, 브랜치 게임 허브 링크, 3D 자산 노출 조건을 정적 확인.
- **미실행:** Node/Python 전체 스위트, 실제 크롬 WebGL 픽셀 및 화면 캡처, 중급 모바일 30fps, 장애 시 OS/GPU 수준 동작, 운영 배포.
- 공개 `main`과 가족 Docker 운영 환경은 변경하지 않음.

## 브랜치 관계

v0.8 main → [PR #87 v0.9 카메라] → [PR #96 v1.0 UI] → 이 v1.1 3D PR.

부모 PR 두 개가 미병합이므로 이 PR을 `main`에 직접 병합하지 말고, 모바일 실기기 통합 검증 이후 순서대로 반영한다.
