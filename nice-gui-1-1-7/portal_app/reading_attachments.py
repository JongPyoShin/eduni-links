from __future__ import annotations

import os
from pathlib import Path
import re
import uuid
from typing import Any

from fastapi import Body, File, Form, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from nicegui import app

from .database import DATA_DIR, default_child_profile_id, utc_now
from .reading_storage import ensure_reading_journal_schema, reading_database_connection, reading_uses_postgres


READING_ATTACHMENT_DIR = Path(os.environ.get("EDUNI_READING_DATA_DIR") or (DATA_DIR / "reading_journal")) / "moments"
IMAGE_MAX_BYTES = 10 * 1024 * 1024
VIDEO_MAX_BYTES = 100 * 1024 * 1024
MAX_ATTACHMENTS = 12
CAPTION_MAX_LENGTH = 500
_FILENAME_RE = re.compile(r"^[0-9a-f]{32}\.(?:jpg|png|webp|mp4|mov|webm)$")


def _identify_media(header: bytes) -> tuple[str, str, str, int]:
    if header.startswith(b"\xff\xd8\xff"):
        return "image", "image/jpeg", "jpg", IMAGE_MAX_BYTES
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "image/png", "png", IMAGE_MAX_BYTES
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image", "image/webp", "webp", IMAGE_MAX_BYTES
    if len(header) >= 16 and header[4:8] == b"ftyp":
        brand = header[8:12]
        if brand == b"qt  ":
            return "video", "video/quicktime", "mov", VIDEO_MAX_BYTES
        mp4_brands = {b"isom", b"iso2", b"iso3", b"iso4", b"iso5", b"iso6", b"mp41", b"mp42", b"avc1", b"M4V "}
        compatible_brands = {header[index:index + 4] for index in range(16, len(header) - 3, 4)}
        if brand in mp4_brands or compatible_brands & mp4_brands:
            return "video", "video/mp4", "mp4", VIDEO_MAX_BYTES
    if header.startswith(b"\x1aE\xdf\xa3") and b"webm" in header.lower():
        return "video", "video/webm", "webm", VIDEO_MAX_BYTES
    raise ValueError("unsupported or invalid media file")


def _public_attachment(row: Any) -> dict[str, Any]:
    filename = str(row[2])
    return {
        "id": int(row[0]), "kind": str(row[1]), "filename": filename,
        "content_type": str(row[3]), "size": int(row[4]), "caption": str(row[5]),
        "blog_use": bool(row[6]), "position": int(row[7]), "created_at": str(row[8]),
        "url": f"/reading-attachments/{filename}",
    }


def list_reading_attachments(
    record_id: int, path: Path | None = None, *, child_profile_id: int | None = None,
    blog_only: bool = False,
) -> list[dict[str, Any]]:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        owned = conn.execute(
            "SELECT 1 FROM reading_record WHERE id = ? AND child_profile_id = ?", (record_id, profile_id)
        ).fetchone()
        if not owned:
            raise KeyError(record_id)
        where = " AND blog_use = 1" if blog_only else ""
        rows = conn.execute(
            """SELECT id, kind, filename, content_type, size, caption, blog_use, position, created_at
                 FROM reading_attachment WHERE reading_record_id = ?""" + where + " ORDER BY position, id",
            (record_id,),
        ).fetchall()
    return [_public_attachment(row) for row in rows]


def add_reading_attachment(
    record_id: int, upload: UploadFile, caption: str = "", blog_use: bool = False,
    position: int | None = None, path: Path | None = None, *, child_profile_id: int | None = None,
    media_dir: Path = READING_ATTACHMENT_DIR,
) -> dict[str, Any]:
    ensure_reading_journal_schema(path)
    if not isinstance(caption, str) or len(caption) > CAPTION_MAX_LENGTH:
        raise ValueError("caption must be at most 500 characters")
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        owned = conn.execute(
            "SELECT 1 FROM reading_record WHERE id = ? AND child_profile_id = ?", (record_id, profile_id)
        ).fetchone()
    if not owned:
        raise KeyError(record_id)
    media_dir.mkdir(parents=True, exist_ok=True)
    temp_path = media_dir / f".{uuid.uuid4().hex}.upload"
    final_path: Path | None = None
    try:
        with temp_path.open("xb") as target:
            first = upload.file.read(4096)
            kind, content_type, extension, max_bytes = _identify_media(first)
            if not first:
                raise ValueError("media file is empty")
            size = len(first)
            if size > max_bytes:
                raise ValueError("media file is too large")
            target.write(first)
            while True:
                chunk = upload.file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise ValueError("media file is too large")
                target.write(chunk)
        original_ext = Path(upload.filename or "").suffix.lower().lstrip(".")
        compatible_exts = {"jpg", "jpeg"} if extension == "jpg" else {extension}
        if original_ext not in compatible_exts:
            raise ValueError("file extension does not match its media type")
        declared = (upload.content_type or "").lower().split(";", 1)[0]
        allowed_declared = {content_type}
        if extension == "jpg":
            allowed_declared.add("image/jpg")
        if declared not in allowed_declared and declared != "application/octet-stream":
            raise ValueError("content type does not match media type")

        filename = f"{uuid.uuid4().hex}.{extension}"
        final_path = media_dir / filename
        temp_path.replace(final_path)
        with reading_database_connection(path) as conn:
            if reading_uses_postgres(path):
                record = conn.execute(
                    "SELECT id FROM reading_record WHERE id = ? AND child_profile_id = ? FOR UPDATE",
                    (record_id, profile_id),
                ).fetchone()
            else:
                conn.execute("BEGIN IMMEDIATE")
                record = conn.execute(
                    "SELECT id FROM reading_record WHERE id = ? AND child_profile_id = ?",
                    (record_id, profile_id),
                ).fetchone()
            if not record:
                raise KeyError(record_id)
            count = conn.execute(
                "SELECT COUNT(*) FROM reading_attachment WHERE reading_record_id = ?", (record_id,)
            ).fetchone()[0]
            if int(count) >= MAX_ATTACHMENTS:
                raise ValueError("a reading record can have at most 12 attachments")
            selected_position = int(count) if position is None else position
            if isinstance(selected_position, bool) or not isinstance(selected_position, int) or not 0 <= selected_position <= 11:
                raise ValueError("position must be between 0 and 11")
            insert_sql = """INSERT INTO reading_attachment
                   (reading_record_id, kind, filename, content_type, size, caption, blog_use, position, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"""
            if reading_uses_postgres(path):
                insert_sql += " RETURNING id"
            cursor = conn.execute(
                insert_sql,
                (record_id, kind, filename, content_type, size, caption.strip(), int(bool(blog_use)), selected_position, utc_now()),
            )
            if reading_uses_postgres(path):
                attachment_id = int(cursor.fetchone()[0])
            else:
                attachment_id = int(cursor.lastrowid)
            row = conn.execute(
                "SELECT id, kind, filename, content_type, size, caption, blog_use, position, created_at FROM reading_attachment WHERE id = ?",
                (attachment_id,),
            ).fetchone()
    except Exception:
        temp_path.unlink(missing_ok=True)
        if final_path is not None:
            final_path.unlink(missing_ok=True)
        raise
    return _public_attachment(row)


def update_reading_attachment(
    attachment_id: int, payload: dict[str, Any], path: Path | None = None,
    *, child_profile_id: int | None = None,
) -> dict[str, Any]:
    ensure_reading_journal_schema(path)
    if set(payload) - {"caption", "blog_use", "position"}:
        raise ValueError("invalid attachment fields")
    updates: dict[str, Any] = {}
    if "caption" in payload:
        caption = payload["caption"]
        if not isinstance(caption, str) or len(caption) > CAPTION_MAX_LENGTH:
            raise ValueError("caption must be at most 500 characters")
        updates["caption"] = caption.strip()
    if "blog_use" in payload:
        if not isinstance(payload["blog_use"], bool):
            raise ValueError("blog_use must be a boolean")
        updates["blog_use"] = int(payload["blog_use"])
    if "position" in payload:
        position = payload["position"]
        if isinstance(position, bool) or not isinstance(position, int) or not 0 <= position <= 11:
            raise ValueError("position must be between 0 and 11")
        updates["position"] = position
    if not updates:
        raise ValueError("no attachment fields provided")
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        if reading_uses_postgres(path):
            lookup_sql = """SELECT a.id FROM reading_attachment a JOIN reading_record r ON r.id = a.reading_record_id
                WHERE a.id = ? AND r.child_profile_id = ? FOR UPDATE OF a"""
        else:
            conn.execute("BEGIN IMMEDIATE")
            lookup_sql = """SELECT a.id FROM reading_attachment a JOIN reading_record r ON r.id = a.reading_record_id
                WHERE a.id = ? AND r.child_profile_id = ?"""
        owned = conn.execute(
            lookup_sql, (attachment_id, profile_id)
        ).fetchone()
        if not owned:
            raise KeyError(attachment_id)
        set_sql = ", ".join(f"{key} = ?" for key in updates)
        cursor = conn.execute(f"UPDATE reading_attachment SET {set_sql} WHERE id = ?", (*updates.values(), attachment_id))
        if cursor.rowcount != 1:
            raise KeyError(attachment_id)
        row = conn.execute(
            "SELECT id, kind, filename, content_type, size, caption, blog_use, position, created_at FROM reading_attachment WHERE id = ?",
            (attachment_id,),
        ).fetchone()
    return _public_attachment(row)


def delete_reading_attachment(
    attachment_id: int, path: Path | None = None, *, child_profile_id: int | None = None,
    media_dir: Path = READING_ATTACHMENT_DIR,
) -> bool:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        if reading_uses_postgres(path):
            lookup_sql = """SELECT a.filename FROM reading_attachment a JOIN reading_record r ON r.id = a.reading_record_id
                WHERE a.id = ? AND r.child_profile_id = ? FOR UPDATE OF a"""
        else:
            conn.execute("BEGIN IMMEDIATE")
            lookup_sql = """SELECT a.filename FROM reading_attachment a JOIN reading_record r ON r.id = a.reading_record_id
                WHERE a.id = ? AND r.child_profile_id = ?"""
        row = conn.execute(
            lookup_sql, (attachment_id, profile_id)
        ).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM reading_attachment WHERE id = ?", (attachment_id,))
    (media_dir / str(row[0])).unlink(missing_ok=True)
    return True


def resolve_reading_attachment(
    filename: str, path: Path | None = None, *, child_profile_id: int | None = None,
    media_dir: Path = READING_ATTACHMENT_DIR,
) -> tuple[Path, str] | None:
    ensure_reading_journal_schema(path)
    if not _FILENAME_RE.fullmatch(filename):
        return None
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        row = conn.execute(
            """SELECT a.content_type FROM reading_attachment a JOIN reading_record r ON r.id = a.reading_record_id
                WHERE a.filename = ? AND r.child_profile_id = ?""", (filename, profile_id)
        ).fetchone()
    target = media_dir / filename
    if not row or not target.is_file():
        return None
    return target, str(row[0])


@app.get("/reading/api/records/{record_id}/attachments")
def reading_attachments_api(record_id: int) -> JSONResponse:
    try:
        return JSONResponse({"attachments": list_reading_attachments(record_id)})
    except KeyError:
        return JSONResponse({"ok": False, "error": "record not found"}, status_code=404)


@app.get("/reading/api/records/{record_id}/blog-media")
def reading_blog_media_api(record_id: int) -> JSONResponse:
    try:
        return JSONResponse({"attachments": list_reading_attachments(record_id, blog_only=True)})
    except KeyError:
        return JSONResponse({"ok": False, "error": "record not found"}, status_code=404)


@app.post("/reading/api/records/{record_id}/attachments")
def create_reading_attachment_api(
    record_id: int, file: UploadFile = File(...), caption: str = Form(default=""),
    blog_use: bool = Form(default=False), position: int | None = Form(default=None),
) -> JSONResponse:
    try:
        attachment = add_reading_attachment(record_id, file, caption, blog_use, position)
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    except KeyError:
        return JSONResponse({"ok": False, "error": "record not found"}, status_code=404)
    return JSONResponse({"attachment": attachment}, status_code=201)


@app.patch("/reading/api/attachments/{attachment_id}")
def update_reading_attachment_api(attachment_id: int, payload: dict[str, Any] = Body(...)) -> JSONResponse:
    try:
        return JSONResponse({"attachment": update_reading_attachment(attachment_id, payload)})
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    except KeyError:
        return JSONResponse({"ok": False, "error": "attachment not found"}, status_code=404)


@app.delete("/reading/api/attachments/{attachment_id}")
def remove_reading_attachment_api(attachment_id: int) -> JSONResponse:
    if not delete_reading_attachment(attachment_id):
        return JSONResponse({"ok": False, "error": "attachment not found"}, status_code=404)
    return JSONResponse({"ok": True})


@app.get("/reading-attachments/{filename}")
def reading_attachment_file_api(filename: str) -> Response:
    resolved = resolve_reading_attachment(filename)
    if resolved is None:
        return JSONResponse({"ok": False, "error": "attachment not found"}, status_code=404)
    path, content_type = resolved
    return FileResponse(path, media_type=content_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600"})
