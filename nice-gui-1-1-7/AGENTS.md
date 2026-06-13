# EDUNI family-server app guide

This file applies to work under `nice-gui-1-1-7/`.

## Token-efficient workflow
- Read root `AGENTS.md` first.
- Do not scan the whole repository.
- For a named feature, read only its task document and targeted files.
- Use existing NiceGUI patterns before creating new helpers.
- Run focused tests while editing; run the full validation set once before commit.
- Stop after the assigned Phase. Do not start the next Phase automatically.

## Jungle expedition tasks
- Read `../docs/jungle_expedition/README.md` and the assigned Phase document only.
- Phase A must not add SQLite, question banks, collection storage, or deployment changes.
- Preserve `/`, `/bubble`, `/bubble-shooter`, `/portal`, `/portal/world/math`, `/portal/parent`, and the separate hanja server.
- Do not touch Nextcloud files, containers, public-link generation, or deployment worktrees unless explicitly assigned.

## Implementation boundaries
- Prefer a new `portal_app/jungle_expedition.py` module over enlarging `app.py`.
- Keep static content in JSON when the assigned Phase requires content.
- Keep child privacy defaults: no analytics, ads, public profiles, location, camera, microphone, or uploads.
- No new dependencies unless required and explicitly approved.

## Validation
From `nice-gui-1-1-7/` run focused tests first. Before commit run:

```powershell
python scripts/validate_content.py
python -m unittest discover -s tests
cd ..
git diff --check
```

Run route smoke tests only if routes or startup changed.
