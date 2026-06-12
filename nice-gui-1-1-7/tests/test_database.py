from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from portal_app.database import connect_database, hash_parent_pin, initialize_database, verify_parent_pin


class DatabaseTests(unittest.TestCase):
    def test_initialize_database_creates_phase0_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = initialize_database(Path(tmp) / "portal.sqlite3")
            with sqlite3.connect(db_path) as conn:
                tables = {
                    row[0]
                    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                }
        self.assertTrue({"child_profile", "activity_session", "process_badge_event", "parent_settings"}.issubset(tables))

    def test_pin_hash_is_not_plaintext(self) -> None:
        hashed = hash_parent_pin("1234", salt=b"0123456789abcdef")
        self.assertNotEqual("1234", hashed)
        self.assertNotIn("1234", hashed)

    def test_correct_pin_verifies(self) -> None:
        hashed = hash_parent_pin("1234", salt=b"0123456789abcdef")
        self.assertTrue(verify_parent_pin("1234", hashed))

    def test_wrong_pin_fails(self) -> None:
        hashed = hash_parent_pin("1234", salt=b"0123456789abcdef")
        self.assertFalse(verify_parent_pin("9999", hashed))

    def test_hash_requires_non_empty_salt_when_supplied(self) -> None:
        with self.assertRaises(ValueError):
            hash_parent_pin("1234", salt=b"")

    def test_foreign_key_violation_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = initialize_database(Path(tmp) / "portal.sqlite3")
            with connect_database(db_path) as conn:
                with self.assertRaises(sqlite3.IntegrityError):
                    conn.execute(
                        "INSERT INTO activity_session (child_profile_id, activity_id, difficulty, started_at) VALUES (?, ?, ?, ?)",
                        (999, "math.pattern_train.001", "easy", "2026-06-12T00:00:00"),
                    )


if __name__ == "__main__":
    unittest.main()
