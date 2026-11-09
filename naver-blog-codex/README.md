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

## Draft source

The watcher reads the record's saved blog note, saved tone, and blog-use media directly from EDUNI, then writes a private local recovery JSON and opens the Naver helper. The JSON is not a Naver blog draft: a record counts as processed only after the helper confirms Naver's temporary-save result. No per-record JSON download or manual file move is required. Notes and tone are managed on the reading record in EDUNI. The browser helper attaches selected media and temporary-saves the post after verifying the editor state. It never publishes.

## Watch for new reading records

Configure the watcher once. It asks for the writing tone and the parent-note
policy; the default policy is `never` so parent notes stay out of automatic
drafts. It runs daily at 17:00 local time by default. The schedule and other
settings are stored in ignored `watch-settings.json`.

```powershell
npm run watch:configure
```

To start it manually, run:

```powershell
npm run watch
```

On first use, the watcher asks for the exact EDUNI origin and stores it in `eduni-origin.json`. By default, it saves the current latest record ID as a baseline and skips existing history. At the configured time (`dailyAt`, `HH:MM`, local time; default `17:00`), it takes one snapshot of all new records and processes them in record order. Records added after that snapshot wait for the next day's run. If the watcher starts after the scheduled time, it waits until the next day. For each record, it waits at least three minutes after creation and until both the blog-media list and saved blog settings remain unchanged across two checks. It reads that record's saved editorial note and tone directly from EDUNI; the server's saved tone takes precedence over the legacy local watcher tone. The settings revision covers the saved note and tone; the stable media list is fingerprinted separately. Together they determine a versioned local recovery JSON filename, so changed inputs cannot silently reuse an old file. After GPT returns, the watcher rechecks both revisions and retries if either changed during generation. It stores the source revision in the local JSON and opens the Naver helper. The title/body and attached media are visible in the editor before the helper temporary-saves; failures remain pending instead of advancing the saved-record cursor. Progress, errors, and Naver save confirmations are timestamped in ignored `watcher.log` next to this README. `npm run watch:configure` remains available for legacy local settings and parent-note policy.

Editing a saved note or tone does not reprocess an already generated record or change an existing Naver post. Those settings are used the next time a record is generated; request a new generation explicitly if an existing record needs a revised draft.

Run the watcher's offline snapshot checks with `npm run test:watch`.

To start the watcher automatically when you sign in to Windows, run:

```powershell
npm run autostart:install
```

This registers a per-user Task Scheduler task. A minimized PowerShell window stays open in your Windows session so Naver's review prompts can still be answered. Windows must reach the sign-in screen and your user must log in; the watcher does not run as a Docker service or while you are signed out. Remove the startup task and its watcher process with `npm run autostart:remove`.

To process only the current latest record once, run `npm run watch -- --latest`. The ignored `watch-state.json` stores the baseline and last Naver-confirmed record ID. `eduni-origin.json`, `watch-settings.json`, `watch-state.json`, `watcher.log`, `drafts/`, `input/`, `naver-profile/`, and `node_modules/` are local private data and must not be shared or committed.

The helper fills the title and body only when it finds one visible title section and one visible body section. It automatically attaches selected media in record order (consecutive images use one chooser and the `개별사진` layout when shown), waits for image resources to load, and clicks Naver's temporary-save button only after the editor contents are verified. It confirms the saved indicator before reporting success. It has no publish action. If a control, attachment, or saved state cannot be confirmed, it does not continue and leaves the browser open for manual review.

The Naver session, downloaded draft files, logs, and media are local private data. `naver-profile/`, `drafts/`, `input/`, `eduni-origin.json`, `watch-state.json`, `watch-settings.json`, `watcher.log`, and `node_modules/` are ignored by Git. The `--dry-run` path validates the JSON locally and does not resolve hosts, connect to EDUNI, or open Naver.
