from __future__ import annotations

import hashlib
import hmac
import json
import os
import threading
import time
from pathlib import Path

from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse
from nicegui import app

from .database import verify_parent_pin
from .reading_storage import _connect_postgres

SESSION_COOKIE = "eduni_market_session"
SESSION_SECONDS = 8 * 60 * 60
MAX_QUERY = 160
MAX_PAGE_SIZE = 30
MAX_EXCERPT = 350
MAX_RAG_ARTICLES = 4
_LOGIN_LOCK = threading.Lock()
_LOGIN_FAILURES: dict[str, list[float]] = {}


def _session_digest(token: str) -> str:
    return hmac.new(_session_secret(), token.encode(), hashlib.sha256).hexdigest()


def _session_secret() -> bytes:
    value = os.environ.get("EDUNI_MARKET_SESSION_SECRET", "").encode()
    if len(value) < 32:
        raise RuntimeError("EDUNI_MARKET_SESSION_SECRET must be at least 32 bytes")
    return value


def _authorized(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE, "")
    try:
        if not isinstance(token, str) or len(token) > 512 or token.count(".") != 1:
            return False
        encoded_payload, signature = token.split(".", 1)
        if len(encoded_payload) > 400 or len(signature) != 64:
            return False
        payload = json.loads(bytes.fromhex(encoded_payload))
        if not isinstance(payload, dict):
            return False
        expiry = payload.get("exp")
        return (isinstance(expiry, (int, float)) and not isinstance(expiry, bool)
                and expiry > time.time() and hmac.compare_digest(signature, _session_digest(encoded_payload)))
    except (ValueError, TypeError, json.JSONDecodeError, RuntimeError):
        return False


def _session_value() -> str:
    payload = json.dumps({"exp": int(__import__("time").time()) + SESSION_SECONDS}, separators=(",", ":")).encode().hex()
    return payload + "." + _session_digest(payload)


def _db():
    return _connect_postgres()


def _html() -> HTMLResponse:
    page = Path(__file__).with_name("static_games").joinpath("eduni_market_archive.html").read_text(encoding="utf-8")
    return HTMLResponse(page, headers={"Cache-Control": "no-store"})


@app.get("/portal/market", response_class=HTMLResponse)
async def market_archive_page(request: Request) -> HTMLResponse:
    return _html()


@app.post("/portal/market/api/session")
async def market_session(request: Request) -> JSONResponse:
    if not _same_origin(request):
        return JSONResponse({"ok": False}, status_code=403, headers={"Cache-Control": "no-store"})
    if request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        return JSONResponse({"ok": False}, status_code=400, headers={"Cache-Control": "no-store"})
    raw = await _read_bounded_body(request, 256)
    if raw is None:
        return JSONResponse({"ok": False}, status_code=400, headers={"Cache-Control": "no-store"})
    try:
        data = json.loads(raw)
    except Exception:
        return JSONResponse({"ok": False}, status_code=400, headers={"Cache-Control": "no-store"})
    pin = data.get("pin") if isinstance(data, dict) else None
    caller = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _LOGIN_LOCK:
        failures = [stamp for stamp in _LOGIN_FAILURES.get(caller, []) if now - stamp < 300]
        _LOGIN_FAILURES[caller] = failures
        blocked = len(failures) >= 5
    if blocked:
        return JSONResponse({"ok": False}, status_code=401, headers={"Cache-Control": "no-store"})
    configured = os.environ.get("EDUNI_MARKET_PIN_HASH")
    valid = isinstance(pin, str) and configured is not None and verify_parent_pin(pin, configured)
    if not valid:
        with _LOGIN_LOCK:
            _LOGIN_FAILURES.setdefault(caller, []).append(now)
        return JSONResponse({"ok": False}, status_code=401, headers={"Cache-Control": "no-store"})
    with _LOGIN_LOCK:
        _LOGIN_FAILURES.pop(caller, None)
    response = JSONResponse({"ok": True}, headers={"Cache-Control": "no-store"})
    response.set_cookie(SESSION_COOKIE, _session_value(), max_age=SESSION_SECONDS, httponly=True,
                        secure=request.url.scheme == "https", samesite="strict", path="/portal/market")
    return response


@app.post("/portal/market/api/logout")
async def market_logout(request: Request) -> JSONResponse:
    if not _same_origin(request) or request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        return JSONResponse({"ok": False}, status_code=403, headers={"Cache-Control": "no-store"})
    response = JSONResponse({"ok": True}, headers={"Cache-Control": "no-store"})
    response.delete_cookie(SESSION_COOKIE, path="/portal/market", httponly=True, samesite="strict")
    return response


def _same_origin(request: Request) -> bool:
    origin = request.headers.get("origin", "").rstrip("/")
    return bool(origin and origin == str(request.base_url).rstrip("/"))


async def _read_bounded_body(request: Request, limit: int) -> bytes | None:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            size = int(content_length)
        except ValueError:
            return None
        if size < 0 or size > limit:
            return None
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > limit:
            return None
    return bytes(body)


@app.get("/portal/market/api/articles")
async def market_articles(request: Request, q: str = "", page: int = 1) -> JSONResponse:
    if not _authorized(request):
        return JSONResponse({"ok": False}, status_code=401, headers={"Cache-Control": "no-store"})
    q = q.strip()[:MAX_QUERY]
    page = max(1, min(page, 10_000))
    conn = _db()
    try:
        pattern = f"%{q}%"
        rows = conn.execute("""SELECT article_id, source_url, publish_date, title, category,
                left(content_text, 360) AS excerpt, has_content, media_count
            FROM market_archive.article WHERE (%s = '' OR title ILIKE %s OR content_text ILIKE %s)
            ORDER BY publish_date DESC, article_id LIMIT %s OFFSET %s""",
            (q, pattern, pattern, MAX_PAGE_SIZE, (page - 1) * MAX_PAGE_SIZE)).fetchall()
        count = conn.execute("SELECT count(*) FROM market_archive.article WHERE (%s = '' OR title ILIKE %s OR content_text ILIKE %s)",
                             (q, pattern, pattern)).fetchone()[0]
        data = [{"id": str(row[0]), "url": row[1], "date": str(row[2]), "title": row[3], "category": row[4],
                 "excerpt": row[5], "has_content": bool(row[6]), "media_count": int(row[7])} for row in rows]
        return JSONResponse({"ok": True, "articles": data, "page": page, "page_size": MAX_PAGE_SIZE, "total": count}, headers={"Cache-Control": "no-store"})
    finally:
        conn.close()


@app.get("/portal/market/api/articles/{article_id}")
async def market_article_detail(request: Request, article_id: str) -> JSONResponse:
    if not _authorized(request):
        return JSONResponse({"ok": False}, status_code=401, headers={"Cache-Control": "no-store"})
    if len(article_id) > 80 or not article_id.isalnum():
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404, headers={"Cache-Control": "no-store"})
    conn = _db()
    try:
        row = conn.execute("""SELECT article_id, source_url, publish_date, title, category, content_text,
                archive_status, has_content, media_count FROM market_archive.article WHERE article_id = %s""",
                           (article_id,)).fetchone()
        if row is None:
            return JSONResponse({"ok": False, "error": "not_found"}, status_code=404, headers={"Cache-Control": "no-store"})
        return JSONResponse({"ok": True, "article": {"id": str(row[0]), "url": row[1], "date": str(row[2]),
            "title": row[3], "category": row[4], "text": row[5], "status": row[6],
            "has_content": bool(row[7]), "media_count": int(row[8])}}, headers={"Cache-Control": "no-store"})
    finally:
        conn.close()


@app.post("/portal/market/api/ask")
async def market_ask(request: Request) -> JSONResponse:
    if not _same_origin(request):
        return JSONResponse({"ok": False}, status_code=403, headers={"Cache-Control": "no-store"})
    if not _authorized(request):
        return JSONResponse({"ok": False}, status_code=401, headers={"Cache-Control": "no-store"})
    if request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        return JSONResponse({"ok": False}, status_code=400, headers={"Cache-Control": "no-store"})
    raw = await _read_bounded_body(request, 8_000)
    if raw is None:
        return JSONResponse({"ok": False}, status_code=400, headers={"Cache-Control": "no-store"})
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError
        query = data["query"]
        ids = data.get("article_ids", [])
        if not isinstance(query, str) or not query.strip() or len(query) > 180 or not isinstance(ids, list) or len(ids) > MAX_RAG_ARTICLES or any(not isinstance(x, str) or len(x) > 80 for x in ids) or len(set(ids)) != len(ids):
            raise ValueError
    except Exception:
        return JSONResponse({"ok": False, "error": "invalid_request"}, status_code=400, headers={"Cache-Control": "no-store"})
    conn = _db()
    try:
        if ids:
            rows = conn.execute("SELECT article_id, publish_date, title, left(content_text, %s) FROM market_archive.article WHERE article_id = ANY(%s) AND has_content = TRUE",
                                (MAX_EXCERPT, ids)).fetchall()
            if len(rows) != len(ids):
                return JSONResponse({"ok": False, "error": "invalid_sources"}, status_code=400, headers={"Cache-Control": "no-store"})
        else:
            rows = conn.execute("""SELECT article_id, publish_date, title, left(content_text, %s) FROM market_archive.article
                WHERE has_content = TRUE AND to_tsvector('simple', title || ' ' || content_text) @@ plainto_tsquery('simple', %s)
                ORDER BY ts_rank(to_tsvector('simple', title || ' ' || content_text), plainto_tsquery('simple', %s)) DESC,
                         publish_date DESC LIMIT %s""", (MAX_EXCERPT, query, query, MAX_RAG_ARTICLES)).fetchall()
    finally:
        conn.close()
    if not rows:
        return JSONResponse({"ok": False, "error": "no_sources"}, status_code=404, headers={"Cache-Control": "no-store"})
    from .ai.companion import _run_provider, validate_companion_payload
    excerpts = [{"id": str(row[0]), "date": str(row[1]), "title": row[2], "excerpt": row[3]} for row in rows]
    context = {"activity": "market_research", "question": json.dumps({"query": query.strip(), "articles": excerpts}, ensure_ascii=False), "choices": [], "selected": ""}
    try:
        prompt, context = validate_companion_payload({"prompt": query.strip(), "context": context})
        if len(json.dumps({"prompt": prompt, "context": context}, ensure_ascii=False).encode("utf-8")) > 8_000:
            return JSONResponse({"ok": False, "error": "context_too_large"}, status_code=400, headers={"Cache-Control": "no-store"})
        status, answer = await __import__("asyncio").to_thread(_run_provider, prompt, context, "market:" + (request.client.host if request.client else "unknown"))
    except Exception:
        return JSONResponse({"ok": False, "error": "ai_unavailable"}, status_code=503, headers={"Cache-Control": "no-store"})
    if status:
        return JSONResponse({"ok": False, "error": "busy" if status == 429 else "ai_unavailable"}, status_code=status, headers={"Cache-Control": "no-store"})
    sources = [{"id": item["id"], "date": item["date"], "title": item["title"],
                "url": "https://contents.premium.naver.com/pangyonevergiveup/pangyobulpae/contents/" + item["id"]}
               for item in excerpts]
    return JSONResponse({"ok": True, "answer": answer, "sources": sources}, headers={"Cache-Control": "no-store"})
