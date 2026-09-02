# PROMPT_JUNGLE_TABLET_TOUCH_PERF_QA_10

## Mission
현재 5-stage 게임을 **태블릿/터치 환경 기준으로 성능·조작성·가독성 QA**한다. 우선은 검증/REPORT 중심이며, 명백한 독립 버그만 최소 수정한다.

## Branch
`prototype/jungle-web-canvas-poc`

## 병렬 작업 규칙
- Waterfall reward finalize, Cave/GiantTree, quiz bank 파일과 충돌 회피.
- 가능한 한 QA 스크립트/REPORT만 추가.
- gameplay progression 수정 금지.

## Viewports
최소:
- 1280x800 landscape tablet
- 1024x768 landscape
- 800x1280 portrait
- 768x1024 portrait

## QA items
- D-pad/A/B touch target >=44px 체감 크기
- HUD/quiz/context hint가 controls를 가리지 않음
- portrait에서 modal overflow/choice clipping 없음
- 두 손가락/연속 pointer 입력 후 stuck input 없음
- resize/orientation 전환 후 canvas/Three renderer 정상
- player/landmark 가독성
- 첫 30초 interaction 가능
- Camp/Waterfall/Cave/GiantTree/SkyRidge 모두 load/interaction smoke

## Performance
Playwright/Chromium 또는 가능한 실제 브라우저에서:
- startup time
- frame pacing proxy/requestAnimationFrame stalls
- long task 또는 console warning 가능 시 수집
- memory 급증/renderer crash 여부
- Three.js runtime fallback 여부

정확한 FPS 측정이 어렵다면 추정값을 만들지 말고 관찰 가능한 evidence만 기록.

## Screenshots
최소 12장, portrait/landscape 혼합.
경로 `artifacts/jungle-tablet-qa/`.

## Tests
- node --test
- git diff --check

## Report
`.agent/REPORT_JUNGLE_TABLET_TOUCH_PERF_QA_10.md`
viewport별 결과, touch/control overlap, orientation, performance evidence, console/page errors, screenshots, PASS/FAIL.

QA 코드+REPORT commit/push. merge/close 금지.