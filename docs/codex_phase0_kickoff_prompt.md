# CODEX Phase 0 실행 프롬프트

아래 내용을 CODEX에 그대로 전달한다.

```text
Repository: JongPyoShin/eduni-links
Target directory: nice-gui-1-1-7
Planning document: docs/eduni_learning_portal_prd_v1_0.md

First inspect the repository and read the planning document.
Implement Phase 0 only. Do not attempt Phase 1 activities yet.

Required deliverables:
1. Inspect and reuse the existing public static launcher at portal/index.html.
2. Remove hard-coded internal IP addresses from portal/index.html.
3. Add portal/config/links.json, or an equivalent generated link config, and update
   update_links.ps1 so it generates or refreshes that config together with redirects.
4. Add a child-facing family-server /portal home page with a world registry.
5. Add /portal/world/{world} route.
6. Preserve backward-compatible access to the existing hanja entry and tetris game.
7. Add a Pydantic Activity schema and JSON activity loader.
8. Add scripts/validate_content.py for recursive content validation.
9. Add SQLite tables for child profile, activity session, process badge event,
   and parent settings.
10. Add a parent PIN entry page and placeholder dashboard route.
11. Add privacy-default tests confirming no voice, photo, geolocation, analytics,
   advertising, or social-sharing integrations are added.
12. Add run instructions and test results to docs/implementation_notes_phase0.md.

Architecture rules:
- Keep the public static launcher separate from the family-server dynamic app.
- Keep UI code, content data, database access, and recommendation rules separated.
- Use JSON or YAML content files under content/activities/.
- Avoid a new large embedded HTML string in app.py where practical.
- Make the smallest backward-compatible refactor needed.
- Use mobile-first touch targets and responsive layout.
- Do not add external analytics, ad SDKs, social login, child data upload,
  child voice storage, child photo storage, location access, or public sharing.

Before editing:
- Summarize the current structure.
- List files you will add or modify.
- Explain how the static launcher, generated link config, existing /hanja, and tetris
  behavior will remain intact.

After editing:
- Run the application smoke test.
- Run automated tests.
- Run the content validator.
- Report changed files, executed commands, results, and any remaining risks.
```

## 사용자용 짧은 전달 문장

```text
docs/eduni_learning_portal_prd_v1_0.md와 docs/codex_phase0_kickoff_prompt.md를 먼저 읽어줘. 전체 기획을 한 번에 구현하지 말고 Phase 0만 구현해줘. 기존 한자 시험과 게임은 깨지지 않게 유지해줘. 구현 전에는 구조 분석, 변경 파일 목록, 호환성 유지 방안을 먼저 보고하고, 구현 후에는 실행 방법과 테스트 결과를 보고해줘.
```
