from __future__ import annotations

import base64
import binascii
from datetime import date
from pathlib import Path
import os
import re
import uuid
from typing import Any

from fastapi import Body, Query
from fastapi.responses import HTMLResponse, JSONResponse
from nicegui import app

from .database import DATA_DIR, default_child_profile_id, utc_now
from .reading_storage import (
    check_reading_storage,
    ensure_reading_journal_schema,
    reading_database_connection,
    reading_uses_postgres,
)


READING_STATIC_DIR = Path(__file__).resolve().parent / "static_games"
READING_HTML = READING_STATIC_DIR / "eduni_reading_journal.html"
READING_DATA_DIR = Path(os.environ.get("EDUNI_READING_DATA_DIR") or (DATA_DIR / "reading_journal"))
READING_MEDIA_DIR = READING_DATA_DIR / "covers"
READING_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# NiceGUI/FastAPI can safely serve the local, generated cover images from the same
# family server. Only generated filenames are persisted in the database.
app.add_static_files("/reading-media", READING_MEDIA_DIR)

READING_MODES = {"alone", "together", "read_aloud"}
IMAGE_LIMIT_BYTES = 4 * 1024 * 1024
TEXT_LIMITS = {
    "title": 160,
    "author": 120,
    "child_comment": 1500,
    "favorite_part": 1500,
    "parent_note": 2500,
}

def _clean_text(value: object, field: str) -> str:
    text = str(value or "").strip()
    limit = TEXT_LIMITS[field]
    if len(text) > limit:
        raise ValueError(f"{field} is too long")
    return text


def _validate_read_date(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return date.today().isoformat()
    try:
        parsed = date.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("read_date must be YYYY-MM-DD") from exc
    return parsed.isoformat()


def _validate_rating(value: object) -> int:
    try:
        rating = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("rating must be an integer") from exc
    if rating < 1 or rating > 5:
        raise ValueError("rating must be between 1 and 5")
    return rating


def _validate_reading_mode(value: object) -> str:
    mode = str(value or "together").strip()
    if mode not in READING_MODES:
        raise ValueError("invalid reading_mode")
    return mode


def _decode_cover_data_url(data_url: str) -> tuple[bytes, str]:
    match = re.fullmatch(
        r"data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)",
        data_url,
    )
    if match is None:
        raise ValueError("cover image must be jpeg, png, or webp")
    subtype = match.group(1)
    try:
        raw = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("cover image is not valid base64") from exc
    if not raw:
        raise ValueError("cover image is empty")
    if len(raw) > IMAGE_LIMIT_BYTES:
        raise ValueError("cover image is too large")

    if subtype in {"jpeg", "jpg"}:
        if not raw.startswith(b"\xff\xd8\xff"):
            raise ValueError("invalid jpeg image")
        extension = "jpg"
    elif subtype == "png":
        if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("invalid png image")
        extension = "png"
    else:
        if len(raw) < 12 or raw[:4] != b"RIFF" or raw[8:12] != b"WEBP":
            raise ValueError("invalid webp image")
        extension = "webp"

    return raw, extension


def save_cover_data_url(data_url: str | None, media_dir: Path = READING_MEDIA_DIR) -> str | None:
    if not data_url:
        return None
    raw, extension = _decode_cover_data_url(data_url)
    media_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    final_path = media_dir / filename
    temp_path = media_dir / f".{filename}.tmp"
    temp_path.write_bytes(raw)
    temp_path.replace(final_path)
    return filename


def create_reading_record(
    payload: dict[str, Any],
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
    media_dir: Path = READING_MEDIA_DIR,
) -> dict[str, Any]:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)

    title = _clean_text(payload.get("title"), "title")
    if not title:
        raise ValueError("title is required")

    author = _clean_text(payload.get("author"), "author")
    read_date = _validate_read_date(payload.get("read_date"))
    reading_mode = _validate_reading_mode(payload.get("reading_mode"))
    rating = _validate_rating(payload.get("rating", 4))
    child_comment = _clean_text(payload.get("child_comment"), "child_comment")
    favorite_part = _clean_text(payload.get("favorite_part"), "favorite_part")
    parent_note = _clean_text(payload.get("parent_note"), "parent_note")

    cover_filename = save_cover_data_url(payload.get("cover_data_url"), media_dir)
    created_at = utc_now()

    try:
        with reading_database_connection(path) as conn:
            insert_sql = """
                INSERT INTO reading_record (
                    child_profile_id, title, author, read_date, reading_mode, rating,
                    child_comment, favorite_part, parent_note, cover_filename, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            if reading_uses_postgres(path):
                insert_sql += " RETURNING id"
            cursor = conn.execute(
                insert_sql,
                (
                    profile_id,
                    title,
                    author,
                    read_date,
                    reading_mode,
                    rating,
                    child_comment,
                    favorite_part,
                    parent_note,
                    cover_filename,
                    created_at,
                ),
            )
            if reading_uses_postgres(path):
                row = cursor.fetchone()
                if row is None:
                    raise RuntimeError("PostgreSQL did not return reading_record id")
                record_id = int(row[0])
            else:
                record_id = int(cursor.lastrowid)
    except Exception:
        if cover_filename:
            (media_dir / cover_filename).unlink(missing_ok=True)
        raise

    return get_reading_record(record_id, path, child_profile_id=profile_id)


def reading_record_from_row(row: tuple[Any, ...]) -> dict[str, Any]:
    cover_filename = str(row[10]) if row[10] else None
    return {
        "id": int(row[0]),
        "child_profile_id": int(row[1]),
        "title": str(row[2]),
        "author": str(row[3]),
        "read_date": str(row[4]),
        "reading_mode": str(row[5]),
        "rating": int(row[6]),
        "child_comment": str(row[7]),
        "favorite_part": str(row[8]),
        "parent_note": str(row[9]),
        "cover_filename": cover_filename,
        "cover_url": f"/reading-media/{cover_filename}" if cover_filename else None,
        "created_at": str(row[11]),
    }


def get_reading_record(
    record_id: int,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
) -> dict[str, Any]:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        row = conn.execute(
            """
            SELECT id, child_profile_id, title, author, read_date, reading_mode, rating,
                   child_comment, favorite_part, parent_note, cover_filename, created_at
              FROM reading_record
             WHERE id = ? AND child_profile_id = ?
            """,
            (record_id, profile_id),
        ).fetchone()
    if row is None:
        raise KeyError(record_id)
    return reading_record_from_row(row)


def _validate_optional_read_date(value: object | None, field: str) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError as exc:
        raise ValueError(f"{field} must be YYYY-MM-DD") from exc


def _validate_summary_month(value: object | None) -> str:
    text = str(value or "").strip()
    if not text:
        return date.today().strftime("%Y-%m")
    if not re.fullmatch(r"\d{4}-\d{2}", text):
        raise ValueError("month must be YYYY-MM")
    try:
        date.fromisoformat(text + "-01")
    except ValueError as exc:
        raise ValueError("month must be YYYY-MM") from exc
    return text


def _reading_search_where(
    *,
    profile_id: int,
    query: str = "",
    date_from: str | None = None,
    date_to: str | None = None,
    reading_mode: str | None = None,
    rating: int | None = None,
) -> tuple[str, list[Any]]:
    clauses = ["child_profile_id = ?"]
    parameters: list[Any] = [profile_id]

    normalized_query = query.strip()
    if normalized_query:
        if len(normalized_query) > 200:
            raise ValueError("q is too long")
        like_value = f"%{normalized_query.lower()}%"
        clauses.append(
            """(
                LOWER(title) LIKE ? OR
                LOWER(author) LIKE ? OR
                LOWER(child_comment) LIKE ? OR
                LOWER(favorite_part) LIKE ? OR
                LOWER(parent_note) LIKE ?
            )"""
        )
        parameters.extend([like_value] * 5)

    normalized_from = _validate_optional_read_date(date_from, "date_from")
    normalized_to = _validate_optional_read_date(date_to, "date_to")
    if normalized_from and normalized_to and normalized_from > normalized_to:
        raise ValueError("date_from must be on or before date_to")
    if normalized_from:
        clauses.append("read_date >= ?")
        parameters.append(normalized_from)
    if normalized_to:
        clauses.append("read_date <= ?")
        parameters.append(normalized_to)

    if reading_mode:
        mode = _validate_reading_mode(reading_mode)
        clauses.append("reading_mode = ?")
        parameters.append(mode)

    if rating is not None:
        normalized_rating = _validate_rating(rating)
        clauses.append("rating = ?")
        parameters.append(normalized_rating)

    return " AND ".join(clauses), parameters


def search_reading_records(
    limit: int = 24,
    offset: int = 0,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
    query: str = "",
    date_from: str | None = None,
    date_to: str | None = None,
    reading_mode: str | None = None,
    rating: int | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if limit < 1 or limit > 500:
        raise ValueError("limit must be between 1 and 500")
    if offset < 0:
        raise ValueError("offset must be non-negative")
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    where_sql, parameters = _reading_search_where(
        profile_id=profile_id,
        query=query,
        date_from=date_from,
        date_to=date_to,
        reading_mode=reading_mode,
        rating=rating,
    )
    with reading_database_connection(path) as conn:
        total_row = conn.execute(
            f"SELECT COUNT(*) FROM reading_record WHERE {where_sql}",
            parameters,
        ).fetchone()
        rows = conn.execute(
            f"""
            SELECT id, child_profile_id, title, author, read_date, reading_mode, rating,
                   child_comment, favorite_part, parent_note, cover_filename, created_at
              FROM reading_record
             WHERE {where_sql}
             ORDER BY read_date DESC, id DESC
             LIMIT ? OFFSET ?
            """,
            [*parameters, limit, offset],
        ).fetchall()
    total = int(total_row[0]) if total_row is not None else 0
    return [reading_record_from_row(row) for row in rows], total


def reading_record_summary(
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
    month: str | None = None,
) -> dict[str, int]:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    summary_month = _validate_summary_month(month)
    with reading_database_connection(path) as conn:
        row = conn.execute(
            """
            SELECT COUNT(*),
                   SUM(CASE WHEN SUBSTR(read_date, 1, 7) = ? THEN 1 ELSE 0 END),
                   SUM(CASE WHEN rating >= 5 THEN 1 ELSE 0 END)
              FROM reading_record
             WHERE child_profile_id = ?
            """,
            (summary_month, profile_id),
        ).fetchone()
    if row is None:
        return {"total": 0, "month": 0, "favorite": 0}
    return {
        "total": int(row[0] or 0),
        "month": int(row[1] or 0),
        "favorite": int(row[2] or 0),
    }


def list_reading_records(
    limit: int = 100,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
) -> list[dict[str, Any]]:
    records, _ = search_reading_records(
        limit=limit,
        path=path,
        child_profile_id=child_profile_id,
    )
    return records



def update_reading_record(
    record_id: int,
    payload: dict[str, Any],
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
    media_dir: Path = READING_MEDIA_DIR,
) -> dict[str, Any]:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)

    title = _clean_text(payload.get("title"), "title")
    if not title:
        raise ValueError("title is required")

    author = _clean_text(payload.get("author"), "author")
    read_date = _validate_read_date(payload.get("read_date"))
    reading_mode = _validate_reading_mode(payload.get("reading_mode"))
    rating = _validate_rating(payload.get("rating", 4))
    child_comment = _clean_text(payload.get("child_comment"), "child_comment")
    favorite_part = _clean_text(payload.get("favorite_part"), "favorite_part")
    parent_note = _clean_text(payload.get("parent_note"), "parent_note")

    cover_action = str(payload.get("cover_action") or "keep").strip()
    if cover_action not in {"keep", "replace", "remove"}:
        raise ValueError("invalid cover_action")
    if cover_action == "replace" and not payload.get("cover_data_url"):
        raise ValueError("cover_data_url is required when replacing cover")

    with reading_database_connection(path) as conn:
        row = conn.execute(
            "SELECT cover_filename FROM reading_record WHERE id = ? AND child_profile_id = ?",
            (record_id, profile_id),
        ).fetchone()
    if row is None:
        raise KeyError(record_id)

    old_cover = str(row[0]) if row[0] else None
    new_cover: str | None = None
    next_cover = old_cover

    if cover_action == "replace":
        new_cover = save_cover_data_url(payload.get("cover_data_url"), media_dir)
        next_cover = new_cover
    elif cover_action == "remove":
        next_cover = None

    try:
        with reading_database_connection(path) as conn:
            cursor = conn.execute(
                """
                UPDATE reading_record
                   SET title = ?, author = ?, read_date = ?, reading_mode = ?, rating = ?,
                       child_comment = ?, favorite_part = ?, parent_note = ?, cover_filename = ?
                 WHERE id = ? AND child_profile_id = ?
                """,
                (
                    title,
                    author,
                    read_date,
                    reading_mode,
                    rating,
                    child_comment,
                    favorite_part,
                    parent_note,
                    next_cover,
                    record_id,
                    profile_id,
                ),
            )
            if cursor.rowcount != 1:
                raise KeyError(record_id)
    except Exception:
        if new_cover:
            (media_dir / new_cover).unlink(missing_ok=True)
        raise

    if old_cover and old_cover != next_cover:
        (media_dir / old_cover).unlink(missing_ok=True)

    return get_reading_record(record_id, path, child_profile_id=profile_id)


def delete_reading_record(
    record_id: int,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
    media_dir: Path = READING_MEDIA_DIR,
) -> bool:
    ensure_reading_journal_schema(path)
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with reading_database_connection(path) as conn:
        row = conn.execute(
            "SELECT cover_filename FROM reading_record WHERE id = ? AND child_profile_id = ?",
            (record_id, profile_id),
        ).fetchone()
        if row is None:
            return False
        conn.execute(
            "DELETE FROM reading_record WHERE id = ? AND child_profile_id = ?",
            (record_id, profile_id),
        )
    if row[0]:
        (media_dir / str(row[0])).unlink(missing_ok=True)
    return True


@app.get("/reading", response_class=HTMLResponse)
@app.get("/reading/", response_class=HTMLResponse)
def reading_journal_page() -> HTMLResponse:
    if not READING_HTML.exists():
        return HTMLResponse("<h1>독서기록 페이지를 찾을 수 없습니다.</h1>", status_code=404)
    return HTMLResponse(READING_HTML.read_text(encoding="utf-8"))


@app.get("/reading/api/health")
def reading_storage_health_api() -> JSONResponse:
    try:
        backend = check_reading_storage()
    except Exception:
        return JSONResponse({"ok": False, "storage": "unavailable"}, status_code=503)
    return JSONResponse({"ok": True, "storage": backend})


@app.get("/reading/api/records")
def reading_records_api(
    limit: int = Query(default=24, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    q: str = Query(default="", max_length=200),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    reading_mode: str | None = Query(default=None),
    rating: int | None = Query(default=None, ge=1, le=5),
    month: str | None = Query(default=None),
) -> JSONResponse:
    try:
        records, total = search_reading_records(
            limit=limit,
            offset=offset,
            query=q,
            date_from=date_from,
            date_to=date_to,
            reading_mode=reading_mode,
            rating=rating,
        )
        summary = reading_record_summary(month=month)
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    return JSONResponse(
        {
            "records": records,
            "total": total,
            "limit": limit,
            "offset": offset,
            "summary": summary,
        }
    )


@app.post("/reading/api/records")
def create_reading_record_api(payload: dict[str, Any] | None = Body(default=None)) -> JSONResponse:
    try:
        record = create_reading_record(payload or {})
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    return JSONResponse({"ok": True, "record": record}, status_code=201)


@app.put("/reading/api/records/{record_id}")
def update_reading_record_api(
    record_id: int,
    payload: dict[str, Any] | None = Body(default=None),
) -> JSONResponse:
    try:
        record = update_reading_record(record_id, payload or {})
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    except KeyError:
        return JSONResponse({"ok": False, "error": "record not found"}, status_code=404)
    return JSONResponse({"ok": True, "record": record})


@app.delete("/reading/api/records/{record_id}")
def delete_reading_record_api(record_id: int) -> JSONResponse:
    deleted = delete_reading_record(record_id)
    if not deleted:
        return JSONResponse({"ok": False, "error": "record not found"}, status_code=404)
    return JSONResponse({"ok": True})
