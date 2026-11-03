from __future__ import annotations

import io
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from starlette.datastructures import Headers, UploadFile
from nicegui import app as nicegui_app

from portal_app.database import database_connection, default_child_profile_id, initialize_database, utc_now
from portal_app.reading_attachments import (
    add_reading_attachment,
    delete_reading_attachment,
    list_reading_attachments,
    resolve_reading_attachment,
    update_reading_attachment,
)
from portal_app.reading_journal import create_reading_record, delete_reading_record
from portal_app.reading_storage import ensure_reading_journal_schema


class ReadingAttachmentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db = self.root / "reading.sqlite3"
        self.media = self.root / "moments"
        initialize_database(self.db)
        self.profile_id = default_child_profile_id(self.db)
        self.record_id = self.create_record(self.profile_id)["id"]

    def tearDown(self) -> None:
        self.temp.cleanup()

    def create_record(self, profile_id: int) -> dict:
        return create_reading_record(
            {"title": "테스트 책", "read_date": "2026-11-03"}, self.db,
            child_profile_id=profile_id, media_dir=self.root / "covers",
        )

    @staticmethod
    def upload(data: bytes, filename: str = "moment.jpg", content_type: str = "image/jpeg") -> UploadFile:
        return UploadFile(filename=filename, file=io.BytesIO(data), headers=Headers({"content-type": content_type}))

    def add_photo(self, *, blog_use: bool = False, caption: str = "") -> dict:
        # JPEG's file signature is sufficient for the server's type sniffing.
        return add_reading_attachment(
            self.record_id, self.upload(b"\xff\xd8\xff\xe0" + b"sample"), caption,
            blog_use, path=self.db, media_dir=self.media,
        )

    def test_upload_list_blog_filter_patch_and_delete(self) -> None:
        private = self.add_photo(caption="처음")
        opted_in = self.add_photo(blog_use=True, caption="블로그 사진")
        self.assertEqual([item["id"] for item in list_reading_attachments(self.record_id, self.db)], [private["id"], opted_in["id"]])
        blog_items = list_reading_attachments(self.record_id, self.db, blog_only=True)
        self.assertEqual([item["id"] for item in blog_items], [opted_in["id"]])
        self.assertTrue(blog_items[0]["url"].startswith("/reading-attachments/"))

        updated = update_reading_attachment(private["id"], {"caption": "수정", "blog_use": True}, self.db)
        self.assertEqual(updated["caption"], "수정")
        self.assertTrue(updated["blog_use"])
        self.assertEqual(len(list_reading_attachments(self.record_id, self.db, blog_only=True)), 2)

        resolved = resolve_reading_attachment(private["filename"], self.db, media_dir=self.media)
        self.assertEqual(resolved[0].read_bytes(), b"\xff\xd8\xff\xe0sample")
        self.assertEqual(resolved[1], "image/jpeg")
        self.assertTrue(delete_reading_attachment(private["id"], self.db, media_dir=self.media))
        self.assertFalse((self.media / private["filename"]).exists())
        self.assertEqual([item["id"] for item in list_reading_attachments(self.record_id, self.db)], [opted_in["id"]])

    def test_upload_rejects_forged_signatures_extension_mime_and_caption(self) -> None:
        invalid_uploads = (
            self.upload(b"not an image", "fake.jpg", "image/jpeg"),
            self.upload(b"\xff\xd8\xfffake", "fake.png", "image/png"),
            self.upload(b"\xff\xd8\xfffake", "fake.jpg", "image/png"),
            self.upload(b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00", "photo.heic", "image/heic"),
            self.upload(b"\x1aE\xdf\xa3\x42\x86\x82matroska", "clip.mkv", "video/x-matroska"),
        )
        for upload in invalid_uploads:
            with self.subTest(filename=upload.filename), self.assertRaises(ValueError):
                add_reading_attachment(self.record_id, upload, path=self.db, media_dir=self.media)
        with self.assertRaises(ValueError):
            add_reading_attachment(self.record_id, self.upload(b"\xff\xd8\xff"), "가" * 501, path=self.db, media_dir=self.media)
        self.assertEqual(list(self.media.iterdir()) if self.media.exists() else [], [])
        self.assertEqual(list_reading_attachments(self.record_id, self.db), [])

    def test_missing_or_foreign_record_is_rejected_before_writing_file(self) -> None:
        with self.assertRaises(KeyError):
            add_reading_attachment(999999, self.upload(b"\xff\xd8\xff\xe0sample"), path=self.db, media_dir=self.media)
        self.assertEqual(list(self.media.iterdir()) if self.media.exists() else [], [])

    def test_failed_metadata_transaction_rolls_back_and_removes_written_file(self) -> None:
        from contextlib import contextmanager
        from portal_app import reading_attachments

        original_connection = reading_attachments.reading_database_connection

        @contextmanager
        def fail_before_commit(path=None):
            with original_connection(path) as conn:
                yield conn
                raise RuntimeError("simulated commit failure")

        with patch.object(reading_attachments, "reading_database_connection", fail_before_commit):
            with self.assertRaisesRegex(RuntimeError, "simulated commit failure"):
                self.add_photo()
        self.assertEqual(list(self.media.iterdir()) if self.media.exists() else [], [])
        self.assertEqual(list_reading_attachments(self.record_id, self.db), [])

    def test_upload_enforces_photo_size_and_twelve_attachment_limit(self) -> None:
        oversize = b"\xff\xd8\xff" + b"0" * (10 * 1024 * 1024)
        with self.assertRaisesRegex(ValueError, "too large"):
            add_reading_attachment(self.record_id, self.upload(oversize), path=self.db, media_dir=self.media)
        for _ in range(12):
            self.add_photo()
        with self.assertRaisesRegex(ValueError, "at most 12"):
            self.add_photo()
        self.assertEqual(len(list_reading_attachments(self.record_id, self.db)), 12)
        self.assertEqual(len(list(self.media.iterdir())), 12)

    def test_record_delete_cascades_metadata_and_removes_files(self) -> None:
        first = self.add_photo()
        second = self.add_photo(blog_use=True)
        self.assertTrue(delete_reading_record(self.record_id, self.db, child_profile_id=self.profile_id, media_dir=self.root / "covers"))
        self.assertFalse((self.media / first["filename"]).exists())
        self.assertFalse((self.media / second["filename"]).exists())
        with database_connection(self.db) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM reading_attachment").fetchone()[0], 0)

    def test_attachment_operations_are_scoped_to_record_owner(self) -> None:
        other_profile = self.profile_id + 1
        with database_connection(self.db) as conn:
            conn.execute(
                "INSERT INTO child_profile(id, display_name, created_at, active) VALUES (?, ?, ?, 1)",
                (other_profile, "다른 프로필", utc_now()),
            )
        foreign_record = self.create_record(other_profile)
        attachment = self.add_photo()
        with self.assertRaises(KeyError):
            list_reading_attachments(foreign_record["id"], self.db, child_profile_id=self.profile_id)
        with self.assertRaises(KeyError):
            update_reading_attachment(attachment["id"], {"caption": "누출"}, self.db, child_profile_id=other_profile)
        self.assertFalse(delete_reading_attachment(attachment["id"], self.db, child_profile_id=other_profile, media_dir=self.media))
        self.assertIsNone(resolve_reading_attachment(attachment["filename"], self.db, child_profile_id=other_profile, media_dir=self.media))
        self.assertEqual(list_reading_attachments(self.record_id, self.db, child_profile_id=self.profile_id)[0]["caption"], "")

    def test_file_resolution_rejects_path_like_names(self) -> None:
        self.add_photo()
        for filename in ("../secret.jpg", "nested/asset.jpg", ".hidden.jpg", "x" * 32 + ".jpg"):
            with self.subTest(filename=filename):
                self.assertIsNone(resolve_reading_attachment(filename, self.db, media_dir=self.media))

    def test_http_routes_support_upload_opt_in_patch_delete_and_range(self) -> None:
        from portal_app import reading_attachments

        original_add = reading_attachments.add_reading_attachment
        original_delete = reading_attachments.delete_reading_attachment
        original_resolve = reading_attachments.resolve_reading_attachment

        def add_to_temp(record_id, upload, caption="", blog_use=False, position=None, path=None, **kwargs):
            return original_add(record_id, upload, caption, blog_use, position, path, media_dir=self.media, **kwargs)

        def delete_from_temp(attachment_id, path=None, **kwargs):
            return original_delete(attachment_id, path, media_dir=self.media, **kwargs)

        def resolve_from_temp(filename, path=None, **kwargs):
            return original_resolve(filename, path, media_dir=self.media, **kwargs)

        with patch.dict("os.environ", {"EDUNI_PORTAL_DB": str(self.db), "EDUNI_READING_DATA_DIR": str(self.root)}), \
             patch.object(reading_attachments, "add_reading_attachment", add_to_temp), \
             patch.object(reading_attachments, "delete_reading_attachment", delete_from_temp), \
             patch.object(reading_attachments, "resolve_reading_attachment", resolve_from_temp):
            client = TestClient(nicegui_app)
            private_response = client.post(
                f"/reading/api/records/{self.record_id}/attachments",
                files={"file": ("private.jpg", b"\xff\xd8\xff\xe0private", "image/jpeg")},
                data={"caption": "개인 기록"},
            )
            self.assertEqual(private_response.status_code, 201, private_response.text)
            private = private_response.json()["attachment"]
            public_response = client.post(
                f"/reading/api/records/{self.record_id}/attachments",
                files={"file": ("blog.jpg", b"\xff\xd8\xff\xe0blog", "image/jpeg")},
                data={"caption": "블로그 후보", "blog_use": "true"},
            )
            self.assertEqual(public_response.status_code, 201, public_response.text)
            opted_in = public_response.json()["attachment"]

            listing = client.get(f"/reading/api/records/{self.record_id}/attachments").json()["attachments"]
            blog_media = client.get(f"/reading/api/records/{self.record_id}/blog-media").json()["attachments"]
            self.assertEqual(len(listing), 2)
            self.assertEqual([item["id"] for item in blog_media], [opted_in["id"]])
            ranged = client.get(private["url"], headers={"Range": "bytes=0-2"})
            self.assertEqual(ranged.status_code, 206)
            self.assertEqual(ranged.content, b"\xff\xd8\xff")

            changed = client.patch(f"/reading/api/attachments/{private['id']}", json={"blog_use": True}).json()["attachment"]
            self.assertTrue(changed["blog_use"])
            self.assertEqual(len(client.get(f"/reading/api/records/{self.record_id}/blog-media").json()["attachments"]), 2)
            deleted = client.delete(f"/reading/api/attachments/{private['id']}")
            self.assertEqual(deleted.status_code, 200)
            self.assertEqual(client.get(private["url"]).status_code, 404)
            alternate_profile = self.profile_id + 1
            with database_connection(self.db) as conn:
                conn.execute(
                    "INSERT INTO child_profile(id, display_name, created_at, active) VALUES (?, ?, ?, 1)",
                    (alternate_profile, "다른 프로필", utc_now()),
                )
            foreign_record = self.create_record(alternate_profile)
            self.assertEqual(client.get(f"/reading/api/records/{foreign_record['id']}/attachments").status_code, 404)
            self.assertEqual(client.get(f"/reading/api/records/{foreign_record['id']}/blog-media").status_code, 404)

    def test_existing_reading_database_gains_attachment_table(self) -> None:
        legacy_db = self.root / "legacy.sqlite3"
        initialize_database(legacy_db)
        profile_id = default_child_profile_id(legacy_db)
        with database_connection(legacy_db) as conn:
            conn.execute(
                """CREATE TABLE reading_record (
                    id INTEGER PRIMARY KEY, child_profile_id INTEGER NOT NULL, title TEXT NOT NULL,
                    author TEXT NOT NULL DEFAULT '', read_date TEXT NOT NULL,
                    reading_mode TEXT NOT NULL DEFAULT 'together', rating INTEGER NOT NULL DEFAULT 4,
                    child_comment TEXT NOT NULL DEFAULT '', favorite_part TEXT NOT NULL DEFAULT '',
                    parent_note TEXT NOT NULL DEFAULT '', cover_filename TEXT, created_at TEXT NOT NULL
                )"""
            )
            conn.execute(
                "INSERT INTO reading_record(child_profile_id,title,read_date,created_at) VALUES (?, ?, ?, ?)",
                (profile_id, "기존 책", "2026-11-02", utc_now()),
            )
        ensure_reading_journal_schema(legacy_db)
        with database_connection(legacy_db) as conn:
            self.assertEqual(conn.execute("SELECT title FROM reading_record").fetchone()[0], "기존 책")
            self.assertIsNotNone(conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reading_attachment'").fetchone())


if __name__ == "__main__":
    unittest.main()
