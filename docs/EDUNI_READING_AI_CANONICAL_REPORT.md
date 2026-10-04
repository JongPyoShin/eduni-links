# Reading AI friend and canonical browser entry

Date: 2026-10-04. Branch: `feature/eduni-ai-companion`.

## Root cause and implementation

The reading HTML route omitted the shared companion asset injection. Its activity was also absent from both the app and Windows bridge allowlists. HTTP and HTTPS served identical reading content, but the companion API requires the configured HTTPS Origin.

Reuse the existing versioned widget and add `reading` to both allowlists. Reading quick questions and screen label identify generic reading help. Frontend context is immutable and ignores DOM fields and pending/explicit overrides; the API independently normalizes reading context before the provider. Saved titles, author/publisher, child comments, scenes, parent notes, searches, photos and aggregate values are not automatically sent. User-entered questions retain the existing supervised-trial notice and limits. This is not automatic AI analysis of saved reading records; the parent summaries remain local statistics.

The registered middleware redirects document-like HTML GET/HEAD navigation from exact legacy Host `100.75.214.95:8081` to the existing configured HTTPS Origin. Paths and queries are retained safely; credentials, forwarded Host/proto and user-supplied origins cannot select the destination. APIs, health, static assets, POSTs and canonical HTTPS Host remain unaffected. Unset/invalid configuration declines redirection.

## Verification and independent review

- Full Python suite with UTF-8 runtime: 237 tests, zero failures, one PostgreSQL-environment-gated skip. Default Windows CP949 first caused three unrelated subprocess decoding errors in existing Baduk Node wrappers; no product/test workaround was added.
- Final focused companion/parent suites: 27 tests PASS. One intermediate rerun encountered a transient Windows `WinError 10053` in the pre-existing wrong-key HTTP fixture; the complete focused rerun passed without changes.
- Four executable JavaScript suites PASS: companion screen context/privacy, companion UX/race, reading parent tools, Sudoku core. Screen-context suite rerun after immutable projection change passed.
- Compile checks and `git diff --check` PASS.
- Main independently ran a real isolated NiceGUI server with fresh temporary SQLite/media and a local fake bridge. Actual HTTP: exact legacy redirect with query, canonical proxy Host no loop, health/API 200, asset injection exactly once, synthetic reading chat 200 and private display-context sentinel absent from provider payload. No real provider/production data used in this check.
- Actual top-level headed Chrome on isolated reading: widget visible, panel opens, reading quick questions and generic screen label visible; CSS 360x800 verified, horizontal overflow false.
- Independent reviewer found a blank-origin self-redirect risk; it was fixed and regression-tested. Main found shared pending-context mutability; projection/choices were frozen and mutation-tested. Final independent review: no remaining blocker.

## Scope and limits

No dependency, schema, provider model, child safety prompt, TLS/Tailscale configuration or unrelated game change. Implementation agent made no runtime or Git actions. Production deployment/real inference evidence is recorded separately after rollout. Real phone microphone permission/voice remains device-dependent. Existing bridge reboot-autostart and PostgreSQL aggregate tests are unchanged and out of scope.
