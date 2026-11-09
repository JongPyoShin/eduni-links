from __future__ import annotations

import argparse
import hashlib
import html
from pathlib import Path
import re
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
  content_html TEXT NOT NULL DEFAULT '',
  source_filename TEXT NOT NULL,
  archive_status TEXT NOT NULL DEFAULT 'saved',
  has_content BOOLEAN NOT NULL DEFAULT TRUE,
  has_video BOOLEAN NOT NULL DEFAULT FALSE,
  media_count INTEGER NOT NULL DEFAULT 0,
  stored_media_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS market_archive.media_asset (
  sha256 TEXT PRIMARY KEY CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  content_type TEXT NOT NULL,
  byte_length BIGINT NOT NULL CHECK (byte_length >= 0),
  data BYTEA NOT NULL,
  CHECK (octet_length(data) = byte_length)
);
ALTER TABLE market_archive.article
  ADD COLUMN IF NOT EXISTS has_video BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE market_archive.article
  ADD COLUMN IF NOT EXISTS content_html TEXT NOT NULL DEFAULT '';
ALTER TABLE market_archive.article
  ADD COLUMN IF NOT EXISTS stored_media_count INTEGER NOT NULL DEFAULT 0;
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


def import_articles(source: Path, asset_root: Path) -> int:
    import json
    files = sorted(source.glob("*.json"))
    if not files: raise ValueError(f"no article JSON files in {source}")
    asset_root = asset_root.resolve()
    asset_digests: dict[Path, str] = {}
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
            content_html = data.get("contentHtml", "")
            if not isinstance(content_html, str):
                raise ValueError(f"invalid contentHtml in {path.name}")
            for image in data.get("images", []):
                if not isinstance(image, dict) or image.get("downloaded") is not True:
                    continue
                source_image = str(image.get("src", "")).strip()
                local_path = str(image.get("localPath", "")).replace("\\", "/")
                filename = Path(local_path).name
                relative = Path(local_path)
                if (not source_image.startswith(("https://", "http://"))
                        or relative.parts[:2] != ("assets", "images")
                        or len(relative.parts) != 4
                        or not re.fullmatch(r"[0-9a-f]{64}", Path(filename).stem)
                        or relative.parts[2] != Path(filename).stem[:2]
                        or Path(filename).suffix.lower() not in {".png", ".jpg", ".jpeg", ".gif", ".webp"}):
                    raise ValueError(f"invalid saved image mapping in {path.name}")
                saved_asset = (asset_root / Path(*relative.parts[2:])).resolve()
                saved_asset.relative_to(asset_root)
                if not saved_asset.is_file():
                    raise ValueError(f"saved image file missing: {local_path}")
                asset_sha256 = asset_digests.get(saved_asset)
                if asset_sha256 is None:
                    asset_sha256 = hashlib.sha256(saved_asset.read_bytes()).hexdigest()
                    asset_digests[saved_asset] = asset_sha256
                asset_url = f"/portal/market/api/assets/{asset_sha256}"
                content_html = content_html.replace(html.escape(source_image, quote=True), asset_url)
                content_html = content_html.replace("../" + local_path, asset_url)
            try:
                date_value = _publish_date(page)
                source_url = _article_url(article_id, data.get("url"))
            except ValueError as exc:
                raise ValueError(f"{exc} in {path.name}") from exc
            if len(title) > 300 or not title: raise ValueError(f"invalid title in {path.name}")
            archive_status = str(data.get("status", "saved"))[:80]
            has_content = bool(data.get("hasContent", bool(content)))
            has_video = data.get("hasVideo") is True
            image_records = data.get("images", [])
            if not isinstance(image_records, list):
                raise ValueError(f"invalid images in {path.name}")
            media_count = len(image_records)
            stored_media_count = sum(1 for image in image_records if isinstance(image, dict) and image.get("downloaded") is True)
            conn.execute("""INSERT INTO market_archive.article(article_id,source_url,publish_date,title,category,content_text,content_html,source_filename,archive_status,has_content,has_video,media_count,stored_media_count)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(article_id) DO UPDATE SET
                publish_date=EXCLUDED.publish_date,title=EXCLUDED.title,category=EXCLUDED.category,
                source_url=EXCLUDED.source_url,
                content_text=EXCLUDED.content_text,content_html=EXCLUDED.content_html,source_filename=EXCLUDED.source_filename,
                archive_status=EXCLUDED.archive_status,has_content=EXCLUDED.has_content,
                has_video=EXCLUDED.has_video,
                media_count=EXCLUDED.media_count,stored_media_count=EXCLUDED.stored_media_count,imported_at=now()""",
                (article_id, source_url, date_value, title, category, content, content_html, path.name, archive_status, has_content, has_video, media_count, stored_media_count))
            count += 1
        conn.commit()
    except Exception:
        conn.rollback(); raise
    finally: conn.close()
    return count


def import_assets(source: Path) -> tuple[int, int, int]:
    files = sorted(path for path in source.rglob("*") if path.is_file())
    if not files:
        raise ValueError(f"no image assets in {source}")
    mime_types = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                  ".gif": "image/gif", ".webp": "image/webp"}
    conn = _connect_postgres()
    inserted = skipped = total_bytes = 0
    try:
        for index, path in enumerate(files, 1):
            source_key = path.stem.lower()
            content_type = mime_types.get(path.suffix.lower())
            if (not content_type or not re.fullmatch(r"[0-9a-f]{64}", source_key)
                    or path.parent.name.lower() != source_key[:2]):
                raise ValueError(f"invalid image asset path: {path}")
            data = path.read_bytes()
            asset_sha256 = hashlib.sha256(data).hexdigest()
            total_bytes += len(data)
            cursor = conn.execute("""INSERT INTO market_archive.media_asset(sha256,content_type,byte_length,data)
                VALUES(%s,%s,%s,%s) ON CONFLICT(sha256) DO NOTHING""",
                (asset_sha256, content_type, len(data), data))
            if cursor.rowcount:
                inserted += 1
            else:
                skipped += 1
            if index % 100 == 0:
                conn.commit()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return inserted, skipped, total_bytes


def main() -> int:
    parser = argparse.ArgumentParser(description="Explicitly manage the dedicated market archive PostgreSQL table")
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("migrate"); imp = sub.add_parser("import"); imp.add_argument("source", type=Path)
    imp.add_argument("--assets", type=Path, required=True)
    assets = sub.add_parser("assets"); assets.add_argument("source", type=Path)
    rollback_parser = sub.add_parser("rollback")
    rollback_parser.add_argument("--confirm-drop-market-archive", action="store_true", required=True)
    args = parser.parse_args()
    if args.action == "migrate": migrate(); print("market_archive schema created")
    elif args.action == "import": print(f"upserted {import_articles(args.source, args.assets)} articles")
    elif args.action == "assets":
        inserted, skipped, size = import_assets(args.source)
        print(f"assets inserted={inserted} existing={skipped} bytes={size}")
    else: rollback(); print("market_archive schema dropped; reading data and other schemas preserved")
    return 0


if __name__ == "__main__":
    sys.exit(main())
