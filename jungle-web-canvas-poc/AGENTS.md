# Game vendor-asset workflow

## Use this process for every new asset source

1. Define the gameplay need first: e.g. tree canopy, trail marker, rock, reeds,
   water surface, character, UI icon, or sound cue. Prefer a small named set over
   a large unreviewed pack.
2. Verify the source page and license before downloading. Record provider URL,
   license, pack/version, file formats, and whether redistribution of raw files
   is allowed. "Free" is not enough.
3. Use the provider's visible download control in a browser. Do not use curl,
   scrape browser storage, cookies, credentials, or signed download URLs.
4. Wait for the browser download event, then verify the real local file exists,
   has a non-zero size, and has the expected filename/format. Retries must be
   explicit and logged; a clicked button is not proof of a downloaded asset.
5. Inspect the archive/model locally before use: expected file count, a license
   notice, supported format, and no executable installer. Never run downloaded
   software as part of asset acquisition.
6. Place assets under `assets/vendor/<provider>/`; add or update a small source
   manifest that lists only the models actually used by a runtime scene.
7. Keep the visible walkable route, collision, interactions, progression, and
   performance budget independent from artwork. Test model loading and its
   procedural fallback separately.
8. Before publishing, re-check both the license and the repository policy. Raw
   files may be committed only when their license explicitly permits public
   redistribution and the user has asked to include them. Otherwise ignore them
   and commit only source/manifest/docs.

## Candidate sources for this project

- **Kenney Nature Kit** — 330 CC0 3D nature models: trees, rocks, and foliage;
  strong fit for Camp/Waterfall terrain. <https://kenney.nl/assets/nature-kit>
- **Kenney Survival Kit** — 80 CC0 3D survival/nature models for camps, props,
  and interactive landmarks. <https://kenney.nl/assets/survival-kit>
- **Quaternius Ultimate Stylized Nature Pack** — 63 CC0 stylized models with
  glTF support: useful for a cohesive child-friendly foliage pass.
  <https://quaternius.com/packs/ultimatestylizednature.html>

Use the current locally acquired threejsassets library first for the immediate
Waterfall preview: cypress, mangrove, mossy boulder, cattail reeds, swamp mist,
and bayou water are already present. Do not acquire an additional pack merely
to duplicate those roles.

## Free threejsassets.com GLB downloads

- Use only assets explicitly marked **Free** on `https://threejsassets.com/assets/free`.
- Do not use `curl`, scrape cookies, expose a logged-in session, or copy any credential/token into the repository.
- The reliable browser path is the user's existing logged-in Chrome tab. Claim that tab through the Chrome browser control surface; do not create a separate anonymous/in-app session for downloads.
- On an individual asset page, locate its actual `a[href="/download/free/<slug>"]` link. Start `waitForEvent("download")`, click the link, and wait for the event before continuing. Directly opening the download URL can return `ERR_ABORTED` while silently failing in batch mode.
- Process the free collection in batches (50 worked reliably). Record timeout slugs and retry them individually. Do not treat a click as success: verify that the expected `<slug>.glb` exists in `C:\Users\GMK\Downloads`.
- The current collection has 443 slugs. Before handoff, compare all 443 expected `<slug>.glb` filenames with the Downloads directory.

## Repository placement and Git hygiene

- Copy verified files to `assets/vendor/threejsassets/` and keep `src/three_vendor_manifest.js` synchronized with the actual filenames.
- Preserve gameplay/source boundaries: vendor models must not alter Waterfall geometry, interactions, progression, or collision just to fit art.
- Vendor GLBs are ignored in `.gitignore`. The provider terms documented in `THREEJSASSETS.md` prohibit redistributing the raw model files as an asset library, so do not force-add, commit, or publish them—even when an implementation request asks to “upload assets.” Commit only source, manifest, and instructions; each developer acquires models locally.
- Stage only source files and docs. Do not include stale local duplicates such as `ballast-tile (1).glb`.
- Run `node --test`, `git diff --check`, and `git status --short` before a commit. Never merge without explicit instruction.
