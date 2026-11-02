from __future__ import annotations

import argparse
from pathlib import Path
import sys

APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from portal_app.reading_storage import _connect_postgres

CREATE_SQL = """
CREATE SCHEMA IF NOT EXISTS market_archive;
CREATE TABLE IF NOT EXISTS market_archive.article (
  article_id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  archive_status TEXT NOT NULL DEFAULT 'saved',
  has_content BOOLEAN NOT NULL DEFAULT TRUE,
  media_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_archive_article_date_idx
  ON market_archive.article (publish_date DESC, article_id);
CREATE INDEX IF NOT EXISTS market_archive_article_search_idx
  ON market_archive.article USING GIN (to_tsvector('simple', title || ' ' || content_text));
"""
DROP_SQL = "DROP SCHEMA IF EXISTS market_archive CASCADE;"
NAVER_ARTICLE_PREFIX = "https://contents.premium.naver.com/pangyonevergiveup/pangyobulpae/contents/"


def _publish_date(page_text: str) -> str:
    import re
    match = re.search(r"(?m)^\s*(20\d{2}\.\d{2}\.\d{2})\.", page_text)
    if not match:
        raise ValueError("publish date not found")
    return match.group(1).replace(".", "-")


def _article_content(data: dict) -> str:
    text_body = data.get("text")
    if isinstance(text_body, str) and text_body.strip():
        return text_body
    html = data.get("html")
    return _text(html) if isinstance(html, str) and html.strip() else ""


def _article_url(article_id: str, saved_url: object) -> str:
    expected = NAVER_ARTICLE_PREFIX + article_id
    url = str(saved_url or "").strip()
    if url and url != expected:
        raise ValueError("unexpected source URL")
    return url or expected


def _text(html: str) -> str:
    from html.parser import HTMLParser

    class Extractor(HTMLParser):
        def __init__(self):
            super().__init__(); self.parts = []; self.skip = 0
        def handle_starttag(self, tag, attrs):
            if tag in {"script", "style"}: self.skip += 1
            if tag in {"p", "div", "br", "li", "h1", "h2", "h3", "tr"}: self.parts.append("\n")
        def handle_endtag(self, tag):
            if tag in {"script", "style"} and self.skip: self.skip -= 1
            if tag in {"p", "div", "li", "h1", "h2", "h3", "tr"}: self.parts.append("\n")
        def handle_data(self, data):
            if not self.skip and data.strip(): self.parts.append(data.strip())
    parser = Extractor(); parser.feed(html)
    return "\n".join(" ".join(line.split()) for line in "\n".join(parser.parts).splitlines() if line.strip())


def migrate() -> None:
    conn = _connect_postgres()
    try:
        conn.execute(CREATE_SQL); conn.commit()
    except Exception:
        conn.rollback(); raise
    finally: conn.close()


def rollback() -> None:
    conn = _connect_postgres()
    try:
        conn.execute(DROP_SQL); conn.commit()
    except Exception:
        conn.rollback(); raise
    finally: conn.close()


def import_articles(source: Path) -> int:
    import json
    files = sorted(source.glob("*.json"))
    if not files: raise ValueError(f"no article JSON files in {source}")
    conn = _connect_postgres(); count = 0
    try:
        for path in files:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
            article_id = path.stem
            title = str(data.get("title", "")).strip()
            category = str(data.get("category", data.get("section", ""))).strip()
            page = str(data.get("pageText", ""))
            raw_html = str(data.get("html", ""))
            content = _article_content(data)
            try:
                date_value = _publish_date(page)
                source_url = _article_url(article_id, data.get("url"))
            except ValueError as exc:
                raise ValueError(f"{exc} in {path.name}") from exc
            if len(title) > 300 or not title: raise ValueError(f"invalid title in {path.name}")
            archive_status = str(data.get("status", "saved"))[:80]
            has_content = bool(data.get("hasContent", bool(content)))
            media_count = len(data.get("images", [])) if isinstance(data.get("images", []), list) else 0
            conn.execute("""INSERT INTO market_archive.article(article_id,source_url,publish_date,title,category,content_text,source_filename,archive_status,has_content,media_count)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(article_id) DO UPDATE SET
                publish_date=EXCLUDED.publish_date,title=EXCLUDED.title,category=EXCLUDED.category,
                source_url=EXCLUDED.source_url,
                content_text=EXCLUDED.content_text,source_filename=EXCLUDED.source_filename,
                archive_status=EXCLUDED.archive_status,has_content=EXCLUDED.has_content,
                media_count=EXCLUDED.media_count,imported_at=now()""",
                (article_id, source_url, date_value, title, category, content, path.name, archive_status, has_content, media_count))
            count += 1
        conn.commit()
    except Exception:
        conn.rollback(); raise
    finally: conn.close()
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="Explicitly manage the dedicated market archive PostgreSQL table")
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("migrate"); imp = sub.add_parser("import"); imp.add_argument("source", type=Path)
    rollback_parser = sub.add_parser("rollback")
    rollback_parser.add_argument("--confirm-drop-market-archive", action="store_true", required=True)
    args = parser.parse_args()
    if args.action == "migrate": migrate(); print("market_archive schema created")
    elif args.action == "import": print(f"upserted {import_articles(args.source)} articles")
    else: rollback(); print("market_archive schema dropped; reading data and other schemas preserved")
    return 0


if __name__ == "__main__":
    sys.exit(main())
