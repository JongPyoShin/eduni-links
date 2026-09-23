from __future__ import annotations

import os
from pathlib import Path
import tempfile
import time
import unittest

from portal_app.reading_journal import (
    create_reading_record,
    delete_reading_record,
    list_reading_records,
    search_reading_records,
    update_reading_record,
)
from portal_app.reading_storage import reading_uses_postgres

PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlSMYQAAAAASUVORK5CYII="
)


@unittest.skipUnless(
    os.environ.get("EDUNI_ALLOW_POSTGRES_TESTS") == "1",
    "set EDUNI_ALLOW_POSTGRES_TESTS=1 inside the dedicated EDUNI PostgreSQL test environment",
)
class ReadingJournalPostgresIntegrationTests(unittest.TestCase):
    def test_postgres_crud_and_cover_lifecycle(self) -> None:
        self.assertTrue(reading_uses_postgres())
        child_profile_id = 8_000_000_000 + (time.time_ns() % 1_000_000_000)

        with tempfile.TemporaryDirectory() as tmp:
            media_dir = Path(tmp) / "covers"
            record_id: int | None = None
            try:
                created = create_reading_record(
                    {
                        "title": "PG 통합 테스트",
                        "author": "EDUNI",
                        "read_date": "2026-09-24",
                        "reading_mode": "together",
                        "rating": 5,
                        "child_comment": "처음 기록",
                        "cover_data_url": PNG_DATA_URL,
                    },
                    child_profile_id=child_profile_id,
                    media_dir=media_dir,
                )
                record_id = created["id"]
                first_cover = created["cover_filename"]
                self.assertIsNotNone(first_cover)
                self.assertTrue((media_dir / str(first_cover)).exists())

                listed = list_reading_records(child_profile_id=child_profile_id)
                self.assertEqual([record_id], [row["id"] for row in listed])

                kept = update_reading_record(
                    record_id,
                    {
                        "title": "PG 수정",
                        "author": "EDUNI",
                        "read_date": "2026-09-23",
                        "reading_mode": "alone",
                        "rating": 4,
                        "child_comment": "수정 기록",
                        "cover_action": "keep",
                    },
                    child_profile_id=child_profile_id,
                    media_dir=media_dir,
                )
                self.assertEqual("PG 수정", kept["title"])
                self.assertEqual(first_cover, kept["cover_filename"])

                replaced = update_reading_record(
                    record_id,
                    {
                        "title": "PG 사진 교체",
                        "author": "EDUNI",
                        "read_date": "2026-09-22",
                        "reading_mode": "read_aloud",
                        "rating": 3,
                        "cover_action": "replace",
                        "cover_data_url": PNG_DATA_URL,
                    },
                    child_profile_id=child_profile_id,
                    media_dir=media_dir,
                )
                second_cover = replaced["cover_filename"]
                self.assertNotEqual(first_cover, second_cover)
                self.assertFalse((media_dir / str(first_cover)).exists())
                self.assertTrue((media_dir / str(second_cover)).exists())

                removed = update_reading_record(
                    record_id,
                    {
                        "title": "PG 사진 제거",
                        "author": "EDUNI",
                        "read_date": "2026-09-21",
                        "reading_mode": "together",
                        "rating": 5,
                        "cover_action": "remove",
                    },
                    child_profile_id=child_profile_id,
                    media_dir=media_dir,
                )
                self.assertIsNone(removed["cover_filename"])
                self.assertFalse((media_dir / str(second_cover)).exists())

                found, total = search_reading_records(
                    child_profile_id=child_profile_id,
                    query="사진 제거",
                    date_from="2026-09-21",
                    date_to="2026-09-21",
                    reading_mode="together",
                    rating=5,
                    limit=1,
                    offset=0,
                )
                self.assertEqual(1, total)
                self.assertEqual([record_id], [row["id"] for row in found])

                self.assertTrue(
                    delete_reading_record(
                        record_id,
                        child_profile_id=child_profile_id,
                        media_dir=media_dir,
                    )
                )
                record_id = None
                self.assertEqual([], list_reading_records(child_profile_id=child_profile_id))
            finally:
                if record_id is not None:
                    delete_reading_record(
                        record_id,
                        child_profile_id=child_profile_id,
                        media_dir=media_dir,
                    )


if __name__ == "__main__":
    unittest.main()
