from __future__ import annotations

import base64
import sqlite3
import tempfile
import unittest
from pathlib import Path

from portal_app.database import connect_database, default_child_profile_id
from portal_app.reading_journal import (
    create_reading_record,
    delete_reading_record,
    ensure_reading_journal_schema,
    list_reading_records,
    save_cover_data_url,
)

APP_ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = APP_ROOT / "portal_app" / "static_games" / "eduni_reading_journal.html"

# Minimal PNG bytes are sufficient for server-side type/magic validation.
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlSMYQAAAAASUVORK5CYII="
)
PNG_DATA_URL = "data:image/png;base64," + base64.b64encode(PNG_1X1).decode("ascii")


class ReadingJournalTests(unittest.TestCase):
    def test_schema_create_record_list_and_delete(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db_path = root / "portal.sqlite3"
            media_dir = root / "covers"

            record = create_reading_record(
                {
                    "title": "용기를 내, 비닐장갑!",
                    "author": "책읽는곰",
                    "read_date": "2026-09-24",
                    "reading_mode": "together",
                    "rating": 5,
                    "child_comment": "나도 용기 내볼래.",
                    "favorite_part": "비닐장갑이 용기를 내는 장면",
                    "parent_note": "자전거 도전 이야기와 연결해서 대화함.",
                    "cover_data_url": PNG_DATA_URL,
                },
                db_path,
                media_dir=media_dir,
            )

            self.assertGreater(record["id"], 0)
            self.assertEqual("용기를 내, 비닐장갑!", record["title"])
            self.assertEqual("together", record["reading_mode"])
            self.assertEqual(5, record["rating"])
            self.assertTrue(record["cover_filename"])
            self.assertTrue((media_dir / str(record["cover_filename"])).exists())

            saved = list_reading_records(path=db_path)
            self.assertEqual(1, len(saved))
            self.assertEqual("나도 용기 내볼래.", saved[0]["child_comment"])

            self.assertTrue(delete_reading_record(record["id"], db_path, media_dir=media_dir))
            self.assertEqual([], list_reading_records(path=db_path))
            self.assertFalse((media_dir / str(record["cover_filename"])).exists())

    def test_records_are_scoped_to_child_profile(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db_path = root / "portal.sqlite3"
            media_dir = root / "covers"
            ensure_reading_journal_schema(db_path)
            first_profile = default_child_profile_id(db_path)

            conn = connect_database(db_path)
            try:
                second_profile = int(
                    conn.execute(
                        "INSERT INTO child_profile (display_name, created_at, active) VALUES (?, ?, 0)",
                        ("Second child", "2026-09-24T00:00:00+00:00"),
                    ).lastrowid
                )
                conn.commit()
            finally:
                conn.close()

            create_reading_record(
                {"title": "첫 번째 아이 책", "read_date": "2026-09-24", "rating": 5},
                db_path,
                child_profile_id=first_profile,
                media_dir=media_dir,
            )
            create_reading_record(
                {"title": "두 번째 아이 책", "read_date": "2026-09-24", "rating": 4},
                db_path,
                child_profile_id=second_profile,
                media_dir=media_dir,
            )

            first = list_reading_records(path=db_path, child_profile_id=first_profile)
            second = list_reading_records(path=db_path, child_profile_id=second_profile)
            self.assertEqual(["첫 번째 아이 책"], [item["title"] for item in first])
            self.assertEqual(["두 번째 아이 책"], [item["title"] for item in second])

    def test_validation_rejects_bad_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db_path = root / "portal.sqlite3"
            media_dir = root / "covers"

            with self.assertRaisesRegex(ValueError, "title is required"):
                create_reading_record({}, db_path, media_dir=media_dir)
            with self.assertRaisesRegex(ValueError, "read_date"):
                create_reading_record(
                    {"title": "책", "read_date": "24/09/2026", "rating": 5},
                    db_path,
                    media_dir=media_dir,
                )
            with self.assertRaisesRegex(ValueError, "rating"):
                create_reading_record(
                    {"title": "책", "read_date": "2026-09-24", "rating": 6},
                    db_path,
                    media_dir=media_dir,
                )
            with self.assertRaisesRegex(ValueError, "reading_mode"):
                create_reading_record(
                    {
                        "title": "책",
                        "read_date": "2026-09-24",
                        "rating": 5,
                        "reading_mode": "invalid",
                    },
                    db_path,
                    media_dir=media_dir,
                )

    def test_cover_validation_rejects_non_image_payload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            media_dir = Path(tmp)
            with self.assertRaises(ValueError):
                save_cover_data_url("data:text/plain;base64,SGVsbG8=", media_dir)
            with self.assertRaises(ValueError):
                save_cover_data_url("data:image/png;base64,SGVsbG8=", media_dir)

    def test_page_has_mobile_camera_and_reflection_fields(self) -> None:
        html = HTML_PATH.read_text(encoding="utf-8")
        self.assertIn('capture="environment"', html)
        self.assertIn('accept="image/jpeg,image/png,image/webp"', html)
        self.assertIn('id="childComment"', html)
        self.assertIn('id="favoritePart"', html)
        self.assertIn('id="parentNote"', html)
        self.assertIn('id="records"', html)
        self.assertIn("imageToDataUrl", html)
        self.assertIn("maxSide = 1600", html)
        self.assertIn("/reading/api/records", html)

    def test_page_is_pressure_free_and_does_not_add_leaderboards_or_streaks(self) -> None:
        html = HTML_PATH.read_text(encoding="utf-8")
        self.assertNotIn("leaderboard", html.lower())
        self.assertNotIn("streak", html.lower())
        self.assertIn("많이 읽었는지보다 무엇을 느꼈는지", html)

    def test_portal_links_to_reading_journal(self) -> None:
        source = (APP_ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('EDUNI_READING_URL = "/reading"', source)
        self.assertIn('"독서기록", EDUNI_READING_URL', source)


if __name__ == "__main__":
    unittest.main()
