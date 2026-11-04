from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path

from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from nicegui import app

from .reading_storage import _connect_postgres

MAX_QUERY = 160
MAX_PAGE_SIZE = 30
MAX_EXCERPT = 350
MAX_RAG_ARTICLES = 4
_PROMO_TEXT = re.compile(r"처음 오신분|신규구독|인생나락|전자책|전차책|Bloom X|프리미엄연간|프리미엄\+|특별링크|신규연간구독자|구독자 여러분|3일 완성|할인 행사")

_MARKET_QUERY_STOPWORDS = {"선택한", "글", "글의", "핵심", "주장", "주장과", "근거", "근거를", "간단히", "요약", "요약해줘", "요약해주세요", "알려줘", "알려주세요", "설명해줘", "설명해주세요", "해주세요", "해줘", "어때", "어때요", "무엇", "무엇이", "어떤", "대해", "대해서", "관련", "있는", "있나요", "인가요"}


def _market_query_terms(query: str) -> list[str]:
    terms = re.findall(r"[0-9A-Za-z가-힣]+", query.lower())
    return list(dict.fromkeys(term for term in terms if len(term) > 1 and term not in _MARKET_QUERY_STOPWORDS))[:8]


def _db():
    return _connect_postgres()


def _article_excerpt(text: str) -> str:
    normalized = " ".join(text.split())
    fallback = normalized[:MAX_EXCERPT]
    final_start = min(max(0, len(normalized) - MAX_EXCERPT), 5000)
    for start in range(0, final_start + 1, 100):
        excerpt = normalized[start:start + MAX_EXCERPT]
        if excerpt and not _PROMO_TEXT.search(excerpt):
            return excerpt
    return fallback


def _html() -> HTMLResponse:
    page = Path(__file__).with_name("static_games").joinpath("eduni_market_archive.html").read_text(encoding="utf-8")
    return HTMLResponse(page, headers={"Cache-Control": "no-store"})


@app.get("/portal/market", response_class=HTMLResponse)
async def market_archive_page(request: Request) -> HTMLResponse:
    return _html()


def _same_origin(request: Request) -> bool:
    origin = request.headers.get("origin", "").rstrip("/")
    expected = os.environ.get("EDUNI_MARKET_PUBLIC_ORIGIN", str(request.base_url)).strip().rstrip("/")
    return bool(origin and origin == expected)


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
async def market_articles(q: str = "", page: int = 1) -> JSONResponse:
    q = q.strip()[:MAX_QUERY]
    page = max(1, min(page, 10_000))
    conn = _db()
    try:
        pattern = f"%{q}%"
        rows = conn.execute("""SELECT article_id, source_url, publish_date, title, category,
                left(content_text, 360) AS excerpt, has_content, media_count, stored_media_count, has_video
            FROM market_archive.article WHERE (%s = '' OR title ILIKE %s OR content_text ILIKE %s)
            ORDER BY publish_date DESC, article_id LIMIT %s OFFSET %s""",
            (q, pattern, pattern, MAX_PAGE_SIZE, (page - 1) * MAX_PAGE_SIZE)).fetchall()
        count = conn.execute("SELECT count(*) FROM market_archive.article WHERE (%s = '' OR title ILIKE %s OR content_text ILIKE %s)",
                             (q, pattern, pattern)).fetchone()[0]
        data = [{"id": str(row[0]), "url": row[1], "date": str(row[2]), "title": row[3], "category": row[4],
                 "excerpt": row[5], "has_content": bool(row[6]), "media_count": int(row[7]),
                 "stored_media_count": int(row[8]), "has_video": bool(row[9])} for row in rows]
        return JSONResponse({"ok": True, "articles": data, "page": page, "page_size": MAX_PAGE_SIZE, "total": count}, headers={"Cache-Control": "no-store"})
    finally:
        conn.close()


@app.get("/portal/market/api/articles/{article_id}")
async def market_article_detail(article_id: str) -> JSONResponse:
    if len(article_id) > 80 or not article_id.isalnum():
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404, headers={"Cache-Control": "no-store"})
    conn = _db()
    try:
        row = conn.execute("""SELECT article_id, source_url, publish_date, title, category, content_text, content_html,
                archive_status, has_content, media_count, stored_media_count, has_video FROM market_archive.article WHERE article_id = %s""",
                           (article_id,)).fetchone()
        if row is None:
            return JSONResponse({"ok": False, "error": "not_found"}, status_code=404, headers={"Cache-Control": "no-store"})
        return JSONResponse({"ok": True, "article": {"id": str(row[0]), "url": row[1], "date": str(row[2]),
            "title": row[3], "category": row[4], "text": row[5], "html": row[6], "status": row[7],
            "has_content": bool(row[8]), "media_count": int(row[9]), "stored_media_count": int(row[10]),
            "has_video": bool(row[11])}}, headers={"Cache-Control": "no-store"})
    finally:
        conn.close()


@app.get("/portal/market/api/assets/{asset_sha256}")
async def market_asset(asset_sha256: str) -> Response:
    if not re.fullmatch(r"[0-9a-f]{64}", asset_sha256):
        return Response(status_code=404, headers={"Cache-Control": "no-store"})
    conn = _db()
    try:
        row = conn.execute("SELECT content_type, data FROM market_archive.media_asset WHERE sha256 = %s",
                           (asset_sha256,)).fetchone()
    finally:
        conn.close()
    if row is None or row[0] not in {"image/png", "image/jpeg", "image/gif", "image/webp"}:
        return Response(status_code=404, headers={"Cache-Control": "no-store"})
    return Response(content=bytes(row[1]), media_type=row[0], headers={
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    })


@app.post("/portal/market/api/ask")
async def market_ask(request: Request) -> JSONResponse:
    if not _same_origin(request):
        return JSONResponse({"ok": False}, status_code=403, headers={"Cache-Control": "no-store"})
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
    source_mode = "selected" if ids else "matched"
    conn = _db()
    try:
        if ids:
            rows = conn.execute("SELECT article_id, publish_date, title, content_text FROM market_archive.article WHERE article_id = ANY(%s) AND has_content = TRUE",
                                (ids,)).fetchall()
            if len(rows) != len(ids):
                return JSONResponse({"ok": False, "error": "invalid_sources"}, status_code=400, headers={"Cache-Control": "no-store"})
        else:
            rows = conn.execute("""SELECT article_id, publish_date, title, content_text FROM market_archive.article
                WHERE has_content = TRUE AND to_tsvector('simple', title || ' ' || content_text) @@ plainto_tsquery('simple', %s)
                ORDER BY ts_rank(to_tsvector('simple', title || ' ' || content_text), plainto_tsquery('simple', %s)) DESC,
                         publish_date DESC LIMIT %s""", (query, query, MAX_RAG_ARTICLES)).fetchall()
            if not rows:
                terms = _market_query_terms(query)
                if terms:
                    clauses = " OR ".join("(title ILIKE %s OR content_text ILIKE %s)" for _ in terms)
                    score = " + ".join("(CASE WHEN title ILIKE %s THEN 4 ELSE 0 END + CASE WHEN content_text ILIKE %s THEN 1 ELSE 0 END)" for _ in terms)
                    patterns = [f"%{term}%" for term in terms]
                    match_values = tuple(pattern for pattern in patterns for _ in range(2))
                    rows = conn.execute(f"""SELECT article_id, publish_date, title, content_text FROM market_archive.article
                        WHERE has_content = TRUE AND ({clauses}) ORDER BY {score} DESC, publish_date DESC LIMIT %s""",
                        (*match_values, *match_values, MAX_RAG_ARTICLES)).fetchall()
            if not rows:
                rows = conn.execute("""SELECT article_id, publish_date, title, content_text FROM market_archive.article
                    WHERE has_content = TRUE ORDER BY publish_date DESC, article_id DESC LIMIT %s""", (MAX_RAG_ARTICLES,)).fetchall()
                if rows:
                    source_mode = "recent"
    finally:
        conn.close()
    if not rows:
        return JSONResponse({"ok": False, "error": "no_sources"}, status_code=404, headers={"Cache-Control": "no-store"})
    from .ai.companion import ProviderUnavailableError, _run_provider, validate_companion_payload
    excerpts = [{"id": str(row[0]), "date": str(row[1]), "title": row[2], "excerpt": _article_excerpt(row[3])} for row in rows]
    context = {"activity": "market_research", "question": json.dumps({"query": query.strip(), "articles": excerpts}, ensure_ascii=False), "choices": [], "selected": ""}
    try:
        prompt_text = query.strip()
        if source_mode == "recent":
            prompt_text += "\n\n참고: 질문과 관련된 글을 찾지 못해 최근 저장 글을 참고 자료로 제공합니다. 글이 질문을 직접 다루지 않으면 관련 근거가 없다고 알려주세요."
        prompt, context = validate_companion_payload({"prompt": prompt_text, "context": context})
        if len(json.dumps({"prompt": prompt, "context": context}, ensure_ascii=False).encode("utf-8")) > 8_000:
            return JSONResponse({"ok": False, "error": "context_too_large"}, status_code=400, headers={"Cache-Control": "no-store"})
        caller = "market:" + (request.client.host if request.client else "unknown")
        try:
            status, answer = await asyncio.to_thread(_run_provider, prompt, context, caller)
        except ProviderUnavailableError:
            await asyncio.sleep(1.05)
            status, answer = await asyncio.to_thread(_run_provider, prompt, context, caller + ":retry")
        else:
            if status == 503:
                await asyncio.sleep(1.05)
                status, answer = await asyncio.to_thread(_run_provider, prompt, context, caller + ":retry")
    except Exception:
        return JSONResponse({"ok": False, "error": "ai_unavailable"}, status_code=503, headers={"Cache-Control": "no-store"})
    if status:
        return JSONResponse({"ok": False, "error": "busy" if status == 429 else "ai_unavailable"}, status_code=status, headers={"Cache-Control": "no-store"})
    sources = [{"id": item["id"], "date": item["date"], "title": item["title"],
                "url": "https://contents.premium.naver.com/pangyonevergiveup/pangyobulpae/contents/" + item["id"]}
               for item in excerpts]
    return JSONResponse({"ok": True, "answer": answer, "sources": sources, "source_mode": source_mode}, headers={"Cache-Control": "no-store"})
