# Naver Blog draft helper

Windows helper that uses a dedicated Playwright Chromium profile. It does not use the regular Chrome profile or ask for your Naver password.

## Setup and account connection

Install Node.js LTS. In this directory, run:

```powershell
npm install
npx playwright install chromium
npm run login
```

The last command opens a separate Chromium window at Naver login. Sign in and complete any verification yourself, then close the browser. The login session stays in the local `naver-profile/` directory. Do not share or commit it.

## Send a draft from EDUNI

Open a saved reading record's history, choose a writing tone, and click `GPT 초안 생성`. The portal uses its existing authenticated GPT bridge; no separate API key is needed. Only attachments marked for blog use are included. Approved photos are sent as GPT image inputs when you request generation, and video captions are text context because the selected model does not accept video input. The parent note is excluded unless its checkbox is selected. Review and edit the title/body, then click `로컬 도우미용 파일 저장`. Move the downloaded `reading-blog-<record-id>.json` file into this helper's `drafts/` directory.

Preview the file without network access or opening Naver:

```powershell
npm run save-draft -- --dry-run drafts\reading-blog-1.json
```

To prepare it in Naver:

```powershell
npm run save-draft -- drafts\reading-blog-1.json
```

The helper resolves your blog through Naver's `GoBlogWrite.naver` entry and opens the SmartEditor ONE writer for that blog. It downloads only media included in the exported file, from the exact EDUNI origin, into an ignored `input/photos/<job-id>` folder. Before the first download from an origin, type that exact origin in the terminal; the helper stores only the confirmed origin in ignored `eduni-origin.json`. A different origin requires a new confirmation. It allows up to 20 items (including at most 10 videos), 10 MiB per image, and 100 MiB per video; redirects and other hosts are rejected. Public EDUNI origins must use HTTPS. Every HTTP DNS result must be local/private/Tailscale. Resolved addresses are pinned for each HTTP(S) request so the connection cannot perform a second DNS lookup after validation.

## Watch for new reading records

Configure the watcher once. It asks for the writing tone and the parent-note
policy; the default policy is `never` so parent notes stay out of automatic
drafts. The settings are stored in ignored `watch-settings.json`.

```powershell
npm run watch:configure
```

To start it manually, run:

```powershell
npm run watch
```

On first use, the watcher asks for the exact EDUNI origin and stores it in `eduni-origin.json`. By default, it saves the current latest record ID as a baseline and skips existing history; later records are checked every 15 seconds. For each new record, it waits at least three minutes after creation and for the blog-media list to remain unchanged across two polls. It then calls the Portal's existing GPT bridge, writes a private local JSON draft, and opens the Naver helper. The title/body and media are still visible for review in the editor before the explicit `SAVE` or `PUBLISH` confirmations below. `npm run watch:configure` lets you select another writing tone or choose parent-note policy `ask` or `always`.

To start the watcher automatically when you sign in to Windows, run:

```powershell
npm run autostart:install
```

This registers a per-user Task Scheduler task. A minimized PowerShell window stays open in your Windows session so Naver's review prompts can still be answered. Windows must reach the sign-in screen and your user must log in; the watcher does not run as a Docker service or while you are signed out. Remove the startup task and its watcher process with `npm run autostart:remove`.

To process only the current latest record once, run `npm run watch -- --latest`. The ignored `watch-state.json` stores only the baseline and last generated record IDs. `eduni-origin.json`, `watch-settings.json`, `watch-state.json`, `drafts/`, `input/`, `naver-profile/`, and `node_modules/` are local private data and must not be shared or committed.

The helper fills the title and body only when it finds one visible title section and one visible body section. If selected media is present, type `UPLOAD` to attach those files in record order. Review the complete editor, then type `SAVE` to temporary-save, or type `PUBLISH` to open Naver's publish settings. After reviewing visibility, schedule, category, and tags in that screen, type `PUBLISH` again before the helper clicks the final publish button. If a control or completed upload cannot be confirmed, it does not proceed and leaves the browser open for manual review.

The Naver session, downloaded draft files, and media are local private data. `naver-profile/`, `drafts/`, `input/`, `eduni-origin.json`, and `node_modules/` are ignored by Git. The `--dry-run` path validates the JSON locally and does not resolve hosts, connect to EDUNI, or open Naver.
