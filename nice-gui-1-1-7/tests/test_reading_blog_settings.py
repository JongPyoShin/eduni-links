from __future__ import annotations

import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from nicegui import app as nicegui_app

from portal_app.database import database_connection, default_child_profile_id, initialize_database, utc_now
from portal_app.reading_journal import create_reading_record, get_reading_blog_settings, update_reading_blog_settings
from portal_app.reading_storage import ensure_reading_journal_schema


class ReadingBlogSettingsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db = self.root / "reading.sqlite3"
        initialize_database(self.db)
        self.profile = default_child_profile_id(self.db)
        self.record = create_reading_record({"title": "테스트", "read_date": "2026-11-04"}, self.db, child_profile_id=self.profile)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_defaults_validation_and_persistence(self) -> None:
        initial = get_reading_blog_settings(self.record["id"], self.db)
        self.assertEqual((initial["blog_note"], initial["blog_tone"]), ("", "family"))
        self.assertRegex(initial["source_revision"], r"^[0-9a-f]{64}$")
        saved = update_reading_blog_settings(self.record["id"], {"blog_note": "장면 아이디어", "blog_tone": "child"}, self.db)
        self.assertEqual((saved["blog_note"], saved["blog_tone"]), ("장면 아이디어", "child"))
        self.assertNotEqual(saved["source_revision"], initial["source_revision"])
        cleared = update_reading_blog_settings(self.record["id"], {"blog_note": "", "blog_tone": "family"}, self.db)
        self.assertEqual((cleared["blog_note"], cleared["blog_tone"]), ("", "family"))
        self.assertEqual(get_reading_blog_settings(self.record["id"], self.db), cleared)
        for payload in (
            {"blog_note": "x" * 4001, "blog_tone": "family"},
            {"blog_note": "", "blog_tone": "system"},
            {"blog_note": "", "blog_tone": "family", "extra": True},
        ):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                update_reading_blog_settings(self.record["id"], payload, self.db)

    def test_legacy_sqlite_schema_is_migrated(self) -> None:
        legacy = self.root / "legacy.sqlite3"
        initialize_database(legacy)
        profile = default_child_profile_id(legacy)
        with database_connection(legacy) as conn:
            conn.execute("""CREATE TABLE reading_record (
                id INTEGER PRIMARY KEY, child_profile_id INTEGER NOT NULL, title TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT '', read_date TEXT NOT NULL,
                reading_mode TEXT NOT NULL DEFAULT 'together', rating INTEGER NOT NULL DEFAULT 4,
                child_comment TEXT NOT NULL DEFAULT '', favorite_part TEXT NOT NULL DEFAULT '',
                parent_note TEXT NOT NULL DEFAULT '', cover_filename TEXT, created_at TEXT NOT NULL
            )""")
            conn.execute("INSERT INTO reading_record(child_profile_id,title,read_date,created_at) VALUES (?,?,?,?)",
                         (profile, "기존", "2026-11-03", utc_now()))
        ensure_reading_journal_schema(legacy)
        with database_connection(legacy) as conn:
            row = conn.execute("SELECT blog_note, blog_tone FROM reading_record").fetchone()
        self.assertEqual(tuple(row), ("", "family"))

    def test_settings_api_and_draft_respect_saved_note_tone_and_revision(self) -> None:
        from portal_app.ai import companion

        headers = {"X-Requested-With": "XMLHttpRequest"}
        env = {"EDUNI_PORTAL_DB": str(self.db), "EDUNI_AI_COMPANION_ENABLED": "1", "EDUNI_AI_COMPANION_PROVIDER": "bridge"}
        with patch.dict("os.environ", env, clear=False), patch.object(companion, "_run_blog_draft", return_value={"title": "제목", "body": "본문"}):
            client = TestClient(nicegui_app)
            url = f"/reading/api/records/{self.record['id']}/blog-settings"
            got = client.get(url, headers=headers)  # Same-origin browser fetch omits Origin on GET.
            self.assertEqual(got.status_code, 200, got.text)
            self.assertEqual(got.json()["blog_tone"], "family")
            self.assertEqual(client.patch(url, headers=headers, json={"blog_note": "x", "blog_tone": "family"}).status_code, 403)
            saved = client.patch(url, headers={**headers, "Origin": "http://testserver"}, json={"blog_note": "중요한 장면", "blog_tone": "book"})
            self.assertEqual(saved.status_code, 200, saved.text)
            revision = saved.json()["source_revision"]

            with patch.object(companion, "_run_blog_draft", side_effect=lambda payload, caller: self.assert_payload(payload)):
                drafted = client.post(
                    f"/reading/api/records/{self.record['id']}/blog-draft",
                    headers={**headers, "Origin": "http://testserver"},
                    json={"tone": "family", "include_parent_note": False},
                )
            self.assertEqual(drafted.status_code, 200, drafted.text)
            self.assertEqual(drafted.json()["source_revision"], revision)

            foreign_profile = self.profile + 100
            with database_connection(self.db) as conn:
                conn.execute("INSERT INTO child_profile(id, display_name, created_at, active) VALUES (?, ?, ?, 1)", (foreign_profile, "foreign", utc_now()))
            foreign = create_reading_record({"title": "외부", "read_date": "2026-11-04"}, self.db, child_profile_id=foreign_profile)
            self.assertEqual(client.get(f"/reading/api/records/{foreign['id']}/blog-settings", headers=headers).status_code, 404)

            def change_settings_while_generating(payload, caller):
                update_reading_blog_settings(self.record["id"], {"blog_note": "바뀐 메모", "blog_tone": "plain"})
                return {"title": "오래된 제목", "body": "오래된 본문"}

            with patch.object(companion, "_run_blog_draft", side_effect=change_settings_while_generating):
                stale = client.post(
                    f"/reading/api/records/{self.record['id']}/blog-draft",
                    headers={**headers, "Origin": "http://testserver"},
                    json={"tone": "book", "include_parent_note": False},
                )
            self.assertEqual(stale.status_code, 409)
            self.assertEqual(stale.json()["error"], "blog_settings_changed")

    @staticmethod
    def assert_payload(payload: dict) -> dict[str, str]:
        assert payload["tone"] == "book"
        assert payload["record"]["blog_note"] == "중요한 장면"
        assert "parent_note" not in payload["record"]
        return {"title": "제목", "body": "본문"}


if __name__ == "__main__":
    unittest.main()
