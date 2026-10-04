# Canonical family URL and missing Reading AI friend

Date: 2026-10-04. Starting HEAD: 879844da2ca164965300403f9462066ec484d857.
User requests one entry address and a visible AI feature on Reading.

## Confirmed causes

`reading_journal_page()` returns raw HTML without `inject_companion_assets()`. Other games use that existing helper. The API requires the configured HTTPS Origin, but the legacy HTTP page has no canonical navigation redirect. Parent reading statistics are local SQL summaries, not LLM analysis; do not claim otherwise.

## Minimal change

- Reuse the existing linked worktree and companion assets. Luna owns product edits; Main owns design, independent verification, deployment and reporting. No dependency/schema/secret changes or branch merge.
- Add `reading` activity with fixed page-feature explanation and reading-specific quick questions. Do not scrape titles, publisher, author, saved cards, profile/aggregate counts, search queries, private notes, child comments, memories or image URLs. Typed questions remain explicit user input with the existing supervised-trial disclosure. This is a visible AI question helper, not automated AI analysis of the child's records.
- Inject the existing versioned assets in the reading page once. Preserve current form/photo/search and parent-panel behavior. Keep early privacy-safe reading projection before any general DOM fallback; guard explicit pending-context overrides so reading never turns private record text into automatic context.
- Use the already configured valid HTTPS `EDUNI_AI_COMPANION_ORIGIN` as fixed navigation destination. Exact legacy Host `100.75.214.95:8081`, GET/HEAD document navigation only. No redirect for health, APIs, POST, assets or websockets. Canonical HTTPS Host must not redirect even if its proxy transport is HTTP. Do not trust query/Host/forwarded headers as destination; safely preserve relative path/query, reject scheme-relative/backslash/control-character targets. Unconfigured/invalid local config must not create an open redirect.
- New HTTPS entry remains `https://k12.tail8b64d5.ts.net:8443`. No TLS/Tailscale/listener/credential changes; host8080 untouched. App remains host8081→container18081; PostgreSQL remains internal5432.

## Checks and rollout

Focused baseline and regression tests first; independently review redirect loops/open redirects and private-field sentinel exclusion. Test actual isolated HTTP navigation with legacy Host, canonical proxy Host and direct API/health. Execute the actual widget script in Node including reading fallback/overrides. Then repository full checks once and actual headed Chrome on HTTPS.

After PASS, back up current SQLite/app data/PG and retain current image. Rebuild/recreate only existing Compose `eduni-game` (`--no-deps`), preserve project/env/volumes/bridge and PG process. Verify legacy browser navigation redirects exactly once, canonical HTTPS routes healthy, Reading widget visible, no production synthetic records, data preserved and runtime logs clean. No independent child-use or real-device voice acceptance claim. Commit/push scoped code/docs; deployment results in a docs-only follow-up.
