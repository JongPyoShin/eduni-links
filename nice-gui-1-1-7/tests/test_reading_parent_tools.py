from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest
from datetime import date
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

from portal_app.database import connect_database, default_child_profile_id, utc_now
from portal_app import reading_covers
from portal_app.reading_journal import (
    reading_cover_image_api,
    reading_cover_search_api,
    reading_parent_insights,
)
from portal_app.reading_storage import ensure_reading_journal_schema


class _Response:
    def __init__(self, body: bytes):
        self.body = body

    def __enter__(self): return self
    def __exit__(self, *_args): return False
    def read(self, _limit=-1): return self.body


class _Opener:
    def __init__(self, body: bytes):
        self.body = body
        self.requests = []

    def open(self, request, timeout):
        self.requests.append((request, timeout))
        if isinstance(self.body, Exception):
            raise self.body
        return _Response(self.body)


class ReadingCoverLookupTests(unittest.TestCase):
    def setUp(self):
        reading_covers._reset_test_state()

    def tearDown(self):
        reading_covers._reset_test_state()

    def test_search_sends_only_bibliographic_fields_and_returns_safe_candidates(self):
        opener = _Opener(json.dumps({"docs": [{
            "title": "A Book", "author_name": ["Writer"], "publisher": ["Press"],
            "cover_i": 42, "edition_count": 3, "first_publish_year": 2001,
            "child_comment": "PRIVATE_SENTINEL", "secret": "PRIVATE_SENTINEL",
        }]}).encode())
        with patch.object(reading_covers, "_OPENER", opener):
            result = reading_covers.search_open_library("A Book", "Press")
        self.assertEqual([{"cover_id": 42, "title": "A Book", "authors": ["Writer"],
                          "publishers": ["Press"], "edition_count": 3, "first_publish_year": 2001}], result)
        request, timeout = opener.requests[0]
        parsed = urlparse(request.full_url)
        self.assertEqual(("https", "openlibrary.org", "/search.json"), (parsed.scheme, parsed.netloc, parsed.path))
        self.assertEqual({"A Book"}, set(parse_qs(parsed.query)["title"]))
        self.assertEqual({"Press"}, set(parse_qs(parsed.query)["publisher"]))
        self.assertEqual(5, int(parse_qs(parsed.query)["limit"][0]))
        self.assertLessEqual(timeout, 5)
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(result))
        self.assertIn("EDUNIReadingJournal", request.get_header("User-agent"))

    def test_search_rejects_malformed_oversize_and_redirect_responses(self):
        for body, error in ((b"not json", "invalid search"), (b"x" * (reading_covers.MAX_JSON_BYTES + 1), "size limit")):
            with self.subTest(error=error), patch.object(reading_covers, "_OPENER", _Opener(body)):
                with self.assertRaisesRegex(reading_covers.CoverLookupUnavailable, error):
                    reading_covers.search_open_library("A Book")
                reading_covers._reset_test_state()
        redirect = HTTPError(reading_covers.SEARCH_URL, 302, "Found", {}, None)
        with patch.object(reading_covers, "_OPENER", _Opener(redirect)):
            with self.assertRaises(reading_covers.CoverLookupUnavailable):
                reading_covers.search_open_library("A Book")

    def test_redirect_handler_refuses_redirects_and_distinct_requests_are_spaced(self):
        handler = reading_covers._NoRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, "Found", {}, "https://evil.example/"))
        clock = [10.0]

        class TimedOpener:
            def __init__(self): self.times=[]; self.calls=0
            def open(self, _request, timeout):
                self.times.append(clock[0]); self.calls += 1
                return _Response(b'{"docs":[]}')

        opener = TimedOpener()
        with patch.object(reading_covers, "_OPENER", opener), \
             patch.object(reading_covers.time, "monotonic", lambda: clock[0]), \
             patch.object(reading_covers.time, "sleep", lambda seconds: clock.__setitem__(0, clock[0] + seconds)):
            self.assertEqual([], reading_covers.search_open_library("One"))
            self.assertEqual([], reading_covers.search_open_library("One"))
            self.assertEqual(1, opener.calls, "cached searches must not make another provider request")
            self.assertEqual([], reading_covers.search_open_library("Two"))
        self.assertEqual([10.0, 11.0], opener.times)

    def test_image_ids_magic_missing_cover_and_size_are_bounded(self):
        for invalid in (0, -1, "42", True, 2_147_483_648):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                reading_covers.download_cover(invalid)
        image = b"\xff\xd8\xff" + b"safe jpeg"
        opener = _Opener(image)
        with patch.object(reading_covers, "_OPENER", opener):
            self.assertEqual((image, "image/jpeg"), reading_covers.download_cover(42))
        self.assertTrue(opener.requests[0][0].full_url.startswith(reading_covers.COVERS_URL + "42-M.jpg?default=false"))
        reading_covers._reset_test_state()
        missing = HTTPError(reading_covers.COVERS_URL + "42-M.jpg", 404, "Not Found", {}, None)
        with patch.object(reading_covers, "_OPENER", _Opener(missing)):
            with self.assertRaises(reading_covers.CoverNotFound):
                reading_covers.download_cover(42)
        bad_image = _Opener(b"GIF89a")
        with patch.object(reading_covers, "_OPENER", bad_image):
            with self.assertRaises(reading_covers.CoverLookupUnavailable):
                reading_covers.download_cover(43)
        huge_image = _Opener(b"\xff\xd8\xff" + b"x" * reading_covers.MAX_IMAGE_BYTES)
        with patch.object(reading_covers, "_OPENER", huge_image):
            with self.assertRaisesRegex(reading_covers.CoverLookupUnavailable, "size limit"):
                reading_covers.download_cover(44)

    def test_lookup_cache_is_bounded(self):
        for i in range(reading_covers._MAX_CACHE_ENTRIES + 5):
            reading_covers._cache_put(f"key:{i}", b"x", 1)
        self.assertLessEqual(len(reading_covers._CACHE), reading_covers._MAX_CACHE_ENTRIES)
        self.assertLessEqual(reading_covers._CACHE_BYTES, reading_covers._MAX_CACHE_BYTES)

    def test_search_endpoint_rejects_nonbibliographic_fields_and_missing_cover_is_404(self):
        rejected = reading_cover_search_api({"title": "A Book", "child_comment": "PRIVATE_SENTINEL"})
        self.assertEqual(400, rejected.status_code)
        with patch("portal_app.reading_journal.search_open_library", return_value=[]):
            response = reading_cover_search_api({"title": "A Book", "publisher": "Press"})
        self.assertEqual({"ok": True, "candidates": []}, json.loads(response.body))
        with patch("portal_app.reading_journal.download_cover", side_effect=reading_covers.CoverNotFound()):
            self.assertEqual(404, reading_cover_image_api(42).status_code)


class ReadingParentInsightsTests(unittest.TestCase):
    def test_full_dataset_profile_scope_future_cutoff_and_30_day_boundaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "journal.sqlite3"
            ensure_reading_journal_schema(db_path)
            first_profile = default_child_profile_id(db_path)
            conn = connect_database(db_path)
            try:
                second = conn.execute(
                    "INSERT INTO child_profile (display_name, created_at, active) VALUES (?, ?, 0)",
                    ("Other learner", utc_now()),
                ).lastrowid
                bulk = []
                for i in range(205):
                    read_date = "2026-10-03" if i == 0 else "2026-09-04" if i == 1 else "2026-09-03" if i == 2 else "2026-07-10"
                    title = "  THE   SAME BOOK " if i < 2 else f"Book {i}"
                    mode = ("alone", "together", "read_aloud")[i % 3]
                    bulk.append((first_profile, title, "", read_date, mode, 4, "", "", "", None, utc_now()))
                bulk.append((first_profile, "Future book", "", "2026-10-04", "alone", 5, "", "", "", None, utc_now()))
                bulk.append((second, "Other profile", "", "2026-10-03", "together", 5, "", "", "", None, utc_now()))
                conn.executemany(
                    """INSERT INTO reading_record
                    (child_profile_id,title,author,read_date,reading_mode,rating,child_comment,favorite_part,parent_note,cover_filename,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                    bulk,
                )
                conn.commit()
            finally:
                conn.close()
            result = reading_parent_insights(db_path, today=date(2026, 10, 3))
            self.assertEqual(205, result["recorded_count"])
            self.assertEqual(204, result["distinct_titles"])
            self.assertEqual(1, result["repeated_readings"])
            self.assertEqual(2, result["recent_30_days"])
            self.assertEqual(1, result["previous_30_days"])
            self.assertEqual({"alone": 69, "read_aloud": 68, "together": 68}, result["reading_modes"])
            self.assertEqual("2026-09-04", result["recent_period_start"])
            self.assertEqual("2026-08-05", result["previous_period_start"])
            self.assertEqual("2026-09-03", result["previous_period_end"])
            self.assertFalse(result["insufficient_data"])
            other = reading_parent_insights(db_path, child_profile_id=int(second), today=date(2026, 10, 3))
            self.assertEqual(1, other["recorded_count"])
            self.assertEqual({"alone": 0, "read_aloud": 0, "together": 1}, other["reading_modes"])
            self.assertTrue(other["insufficient_data"])

    def test_sparse_profile_has_no_inferred_insight(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "journal.sqlite3"
            ensure_reading_journal_schema(db_path)
            profile = default_child_profile_id(db_path)
            result = reading_parent_insights(db_path, child_profile_id=profile, today=date(2026, 10, 3))
            self.assertTrue(result["insufficient_data"])
            self.assertEqual(0, result["repeated_readings"])
            self.assertEqual(0, result["recent_30_days"])


if __name__ == "__main__":
    unittest.main()
