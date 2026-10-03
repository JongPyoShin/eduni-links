"""Bounded Open Library lookup for explicitly requested book-cover candidates."""
from __future__ import annotations

from collections import OrderedDict
import json
import hashlib
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

SEARCH_URL = "https://openlibrary.org/search.json"
COVERS_URL = "https://covers.openlibrary.org/b/id/"
MAX_JSON_BYTES = 512 * 1024
MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_CANDIDATES = 5
_MAX_CACHE_ENTRIES = 32
_MAX_CACHE_BYTES = 8 * 1024 * 1024
_CACHE_TTL = 15 * 60
_LOCK = threading.Lock()
_CACHE: OrderedDict[str, tuple[float, object, int]] = OrderedDict()
_CACHE_BYTES = 0
_LAST_REQUEST = 0.0


class CoverLookupUnavailable(RuntimeError):
    pass


class CoverNotFound(RuntimeError):
    pass


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = build_opener(_NoRedirect())


def _cache_get(key: str):
    global _CACHE_BYTES
    entry = _CACHE.get(key)
    if entry is None:
        return None
    saved, value, size = entry
    if time.monotonic() - saved > _CACHE_TTL:
        _CACHE_BYTES -= size
        del _CACHE[key]
        return None
    _CACHE.move_to_end(key)
    return value


def _cache_put(key: str, value: object, size: int) -> None:
    global _CACHE_BYTES
    previous = _CACHE.pop(key, None)
    if previous:
        _CACHE_BYTES -= previous[2]
    if size > _MAX_CACHE_BYTES:
        return
    _CACHE[key] = (time.monotonic(), value, size)
    _CACHE_BYTES += size
    while len(_CACHE) > _MAX_CACHE_ENTRIES or _CACHE_BYTES > _MAX_CACHE_BYTES:
        _, (_, _, removed_size) = _CACHE.popitem(last=False)
        _CACHE_BYTES -= removed_size


def _get(url: str, *, limit: int, accept: str, cache_key: str) -> bytes:
    global _LAST_REQUEST
    with _LOCK:
        cached = _cache_get(cache_key)
        if isinstance(cached, bytes):
            return cached
        delay = 1.0 - (time.monotonic() - _LAST_REQUEST)
        if delay > 0:
            time.sleep(delay)
        request = Request(url, headers={
            "Accept": accept,
            "User-Agent": "EDUNIReadingJournal/1.0",
        })
        try:
            with _OPENER.open(request, timeout=5) as response:
                raw = response.read(limit + 1)
        except (HTTPError, URLError, OSError, TimeoutError) as exc:
            _LAST_REQUEST = time.monotonic()
            if isinstance(exc, HTTPError) and exc.code == 404 and cache_key.startswith("cover:"):
                raise CoverNotFound("No cover image is available") from exc
            raise CoverLookupUnavailable("Open Library is temporarily unavailable") from exc
        _LAST_REQUEST = time.monotonic()
        if len(raw) > limit:
            raise CoverLookupUnavailable("Open Library response exceeded the size limit")
        _cache_put(cache_key, raw, len(raw))
        return raw


def _valid_cover_id(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 < value <= 2_147_483_647:
        raise ValueError("invalid cover id")
    return value


def search_open_library(title: str, publisher: str = "") -> list[dict[str, object]]:
    title = str(title or "").strip()
    publisher = str(publisher or "").strip()
    if not title or len(title) > 160 or len(publisher) > 120:
        raise ValueError("title or publisher is invalid")
    query = urlencode({
        "title": title,
        **({"publisher": publisher} if publisher else {}),
        "fields": "title,author_name,publisher,cover_i,edition_count,first_publish_year",
        "limit": str(MAX_CANDIDATES),
    })
    url = SEARCH_URL + "?" + query
    cache_key = "search:" + hashlib.sha256(url.encode("utf-8")).hexdigest()
    raw = _get(url, limit=MAX_JSON_BYTES, accept="application/json", cache_key=cache_key)
    try:
        payload = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise CoverLookupUnavailable("Open Library returned invalid search data") from exc
    docs = payload.get("docs") if isinstance(payload, dict) else None
    if not isinstance(docs, list):
        raise CoverLookupUnavailable("Open Library returned invalid search data")
    candidates: list[dict[str, object]] = []
    for doc in docs:
        if not isinstance(doc, dict):
            continue
        cover_id = doc.get("cover_i")
        if not isinstance(cover_id, int) or isinstance(cover_id, bool) or not 0 < cover_id <= 2_147_483_647:
            continue
        book_title = doc.get("title")
        if not isinstance(book_title, str) or not book_title.strip():
            continue
        authors = doc.get("author_name", [])
        publishers = doc.get("publisher", [])
        candidates.append({
            "cover_id": cover_id,
            "title": book_title.strip()[:160],
            "authors": [v.strip()[:120] for v in authors[:3] if isinstance(v, str) and v.strip()] if isinstance(authors, list) else [],
            "publishers": [v.strip()[:120] for v in publishers[:3] if isinstance(v, str) and v.strip()] if isinstance(publishers, list) else [],
            "edition_count": doc.get("edition_count") if isinstance(doc.get("edition_count"), int) else None,
            "first_publish_year": doc.get("first_publish_year") if isinstance(doc.get("first_publish_year"), int) else None,
        })
        if len(candidates) >= MAX_CANDIDATES:
            break
    return candidates


def download_cover(cover_id: int) -> tuple[bytes, str]:
    cover_id = _valid_cover_id(cover_id)
    url = f"{COVERS_URL}{cover_id}-M.jpg?default=false"
    raw = _get(url, limit=MAX_IMAGE_BYTES, accept="image/jpeg,image/png,image/webp", cache_key=f"cover:{cover_id}")
    if raw.startswith(b"\xff\xd8\xff"):
        return raw, "image/jpeg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return raw, "image/png"
    if len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return raw, "image/webp"
    if b"not found" in raw[:256].lower() or not raw:
        raise CoverNotFound("No cover image is available")
    raise CoverLookupUnavailable("Open Library returned an unsupported image")


def _reset_test_state() -> None:
    """Reset module state for isolated unit tests only."""
    global _CACHE_BYTES, _LAST_REQUEST
    with _LOCK:
        _CACHE.clear()
        _CACHE_BYTES = 0
        _LAST_REQUEST = 0.0
