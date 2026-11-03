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

Uploads are limited to 12 attachments per reading record. Supported photos are
JPEG, PNG, and WebP up to 10 MiB each. Supported videos are MP4, MOV, and WebM
up to 100 MiB each. The server validates file signatures as well as file type;
the client-provided filename and MIME type are not trusted. This signature check
is a format check, not a complete media decode or safety scan. Some browsers may
not preview MOV files; the journal UI can offer the original file for download.
Captions are limited to 500 characters. Blog use is always opt-in and controls
which attachments a future blog export may use. It does not provide account
authentication or change the family server's existing network access boundary.

The opt-in API is groundwork for a future family reading blog workflow. The
blog poster itself, public publishing, and blog page are not implemented here.
When that workflow is built, it must wait for all selected attachment uploads to
finish before enqueueing a post, or use a versioned snapshot/readiness gate; the
reading record is created before its attachments are uploaded.
