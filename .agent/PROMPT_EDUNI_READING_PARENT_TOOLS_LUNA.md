# Luna implementation instructions

Read `docs/EDUNI_READING_PARENT_TOOLS_PLAN.md` fully and relevant AGENTS.md before implementation. Work only in `D:/Codex/Worktrees/eduni-ai-companion`, branch `feature/eduni-ai-companion`.

You are the sole product-code implementer. Implement the plan's first release: Open Library explicit candidate cover lookup/import and local descriptive parent insights with dated source cards. NAVER credentials/integration and live LLM/web-research automation are deferred. No DB migration, new dependencies or production changes.

Allowed scope: `nice-gui-1-1-7/portal_app/reading_journal.py`, new narrowly scoped helper(s), `static_games/eduni_reading_journal.html`, focused reading tests (new test module preferred). Main owns plan/report and independent verification. Do not edit companion/bridge or unrelated games. Do not commit/push; report exact files and focused test results to Main.

Preserve existing photo compression/preview/save/replace/remove and search pagination. Publisher input is lookup-only and labelled. Bibliographic title/publisher only may leave server; no child names, profile IDs, free-text records/photos to external search/AI. Fixed-host HTTPS, bounded download, no redirects, safe image bytes; rate/cache bounded. Share image generation guards. Parent candidates require confirmation.

All insights SQL is server-default-profile scoped and covers complete dataset, never list-page limits. Exclude future dates. Do not diagnose deficiencies or infer genre/ability; insufficient records and absent data explicit. Curated source cards have checked date and links; do not describe as realtime research.

Focused tests must cover privacy, invalid provider data, missing images, async replacement protection, >200 record/two-profile aggregates and unchanged existing photo/search behavior. Do not run full suite (Main will do once). Do not touch host 8080, production 8081, existing containers/volumes, secrets or runtime data. No PR, merge, deploy.
