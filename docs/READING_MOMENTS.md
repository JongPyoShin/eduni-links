# Reading moments media

Reading records may have family-server photo or video attachments stored as
files on the server. The `reading_attachment` table stores each file's record ID, kind,
opaque filename, detected content type, byte size, caption, blog opt-in flag,
display position, and creation time. PostgreSQL is used when the reading
database is configured for it; isolated local development and tests use SQLite.
The binary media is kept outside the database under
`EDUNI_READING_DATA_DIR/moments` (or the default reading journal data folder),
and is served through `/reading-attachments/{filename}`.

## API

- `GET /reading/api/records/{id}/attachments` lists that record's attachments.
- `POST /reading/api/records/{id}/attachments` accepts multipart `file`,
  optional `caption`, and optional `blog_use` (defaults to false).
- `PATCH /reading/api/attachments/{id}` updates attachment metadata such as
  caption and blog opt-in.
- `DELETE /reading/api/attachments/{id}` removes the attachment and its file.
- `GET /reading/api/records/{id}/blog-media` returns only attachments opted in
  for blog use.
- `GET /reading/api/blog-watch/records` returns only reading-record IDs and
  creation times so the local watcher can detect new records without fetching
  comments or parent notes.
- `POST /reading/api/records/{id}/blog-draft` accepts a tone and parent-note
  choice, reads that record and its approved media server-side, and requests a
  validated `{title, body}` response from the existing GPT bridge.

Uploads are limited to 20 attachments per reading record. Supported photos are
JPEG, PNG, and WebP up to 10 MiB each. Supported videos are MP4, MOV, and WebM
up to 100 MiB each. The server validates file signatures as well as file type;
the client-provided filename and MIME type are not trusted. This signature check
is a format check, not a complete media decode or safety scan. Some browsers may
not preview MOV files; the journal UI can offer the original file for download.
Captions are limited to 500 characters. Blog use is always opt-in and controls
which attachments the GPT blog writer and Naver export may use. It does not
provide account authentication or change the family server's network boundary.

The reading-history dialog offers four writing tones and an editable title and
body. GPT generation is an explicit button action through the existing
authenticated EDUNI GPT bridge; it reuses the configured model credentials and
does not require an API key. Only attachments opted in for blog use are eligible
for the request. GPT receives approved photos as image inputs and video captions
as text; video content itself is not analyzed. The parent note is excluded
unless its checkbox is selected. The helper export contains only the edited
title/body and blog-opted-in media list.

The Windows helper can run `npm run watch` from `naver-blog-codex/`. Its first
run saves the current latest ID as a baseline and skips older records; `--latest`
processes the current latest record once. It checks for new IDs every 15 seconds,
waits at least three minutes after record creation, then requires the blog-media
metadata to match across two 15-second polls before asking the existing GPT
bridge for a draft. The ignored `watch-settings.json` selects one of four tones
and defaults parent-note handling to `never`; `npm run watch:configure` changes
those settings. Local watcher state contains only record IDs. `npm run
autostart:install` registers a per-user Windows logon task with a minimized,
interactive PowerShell window. The watcher then opens the existing Naver helper;
media upload and `SAVE` or the two-step `PUBLISH` flow still require terminal
input, so the task runs in the signed-in user session rather than Docker.

The separate Windows helper in `naver-blog-codex/` uses a dedicated Playwright
Chromium profile, stores its login session locally, and does not store the
Naver password. It stages only selected media from the exported snapshot, fills
the SmartEditor ONE title and body, and can upload those photos/videos in record
order after explicit `UPLOAD` confirmation. The user reviews the complete editor
and chooses `SAVE` for a Naver draft, or `PUBLISH` to open Naver's settings. A
second `PUBLISH` confirmation is required before the final publish button is
clicked. Review selected media for faces and personal information before
publishing. The helper accepts only the exported media snapshot, avoiding reads
from the records API after export.
