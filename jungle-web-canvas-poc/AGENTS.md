# Waterfall vendor-asset workflow

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
