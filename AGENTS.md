# EDUNI Codex Guide

Keep repository exploration and output minimal. Follow only the rules relevant to the assigned task.

## Codex model routing
- Before starting a Codex task, read `docs/CODEX_MODEL_STRATEGY.md` and choose the lowest-cost model that is comfortably capable of the work.
- Every new Codex task prompt should declare `Recommended`, `Reason`, and an escalation condition.
- Default routing: Luna for bounded inspection/mechanical work, Terra for normal production implementation, Sol for architecture, ambiguous/high-risk diagnosis, migrations, and critical review.
- Escalate when the task becomes materially more ambiguous, cross-cutting, destructive, or compatibility-sensitive. Do not keep a weaker model guessing.
- A stronger model should hand already-defined mechanical implementation down when practical instead of remaining on routine work.
- Task-specific model instructions override the default routing policy.

## Repository map
- `portal/`: public static launcher and generated link config.
- `nice-gui-1-1-7/`: family-server game app and learning portal.
- `nice-gui-1-1-7/portal_app/`: dynamic learning portal modules.
- `nice-gui-1-1-7/content/activities/`: activity JSON content.
- `files-mentioned-by-the-user-oracle/`: separate DB and hanja quiz server.

## Preserve compatibility
- Keep existing game routes: `/`, `/bubble`, `/bubble-shooter`.
- Keep the existing hanja entry path and static redirects.
- Keep the public static launcher separate from the dynamic family-server app.
- Avoid broad refactors unless the task explicitly requires them.

## Token-efficient workflow
1. Read this file and the assigned task. Do not scan the entire repository by default.
2. Use targeted search first, then open only files needed for the requested change.
3. Reuse existing helpers and patterns. Do not redesign unrelated code.
4. During editing, run focused tests only. Run the full validation set once before committing.
5. Batch related fixes into one commit and one concise final report.
6. Stop when the requested scope is complete. Do not start the next phase automatically.
7. Ask a question only when blocked by missing information that cannot be inferred safely.

## Privacy and safety defaults
- Do not add analytics, ads, social sharing, public profiles, camera, microphone, geolocation, or child-data uploads.
- Do not store plaintext parent PINs. Reuse the existing PBKDF2 helpers.
- Keep runtime SQLite files and caches out of git.

## Git rules
- Work in the assigned feature branch or worktree only.
- Do not modify, reset, delete, or commit unrelated dirty files.
- Do not merge unless explicitly instructed.
- Use `update_links.ps1 -NoGitPublish` unless publishing generated links is explicitly requested.

## Validation before commit
Run from the repository root:

```powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

Run route smoke tests only when application routes, startup, or deployment settings change.

## Final report format
Report only:
- changed files
- validation results
- compatibility result for affected existing routes
- commit SHA
- remaining risks
- model routing decision and whether escalation was needed
