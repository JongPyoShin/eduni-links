from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from portal_app.database import (
    complete_activity_session,
    connect_database,
    hash_parent_pin,
    initialize_database,
    latest_completed_activity_session,
    recent_activity_sessions,
    start_activity_session,
    verify_parent_pin,
)


class DatabaseTests(unittest.TestCase):
    def test_initialize_database_creates_phase0_tables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = initialize_database(Path(tmp) / "portal.sqlite3")
            conn = sqlite3.connect(db_path)
            try:
                tables = {
                    row[0]
                    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                }
            finally:
                conn.close()
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
            conn = connect_database(db_path)
            try:
                with self.assertRaises(sqlite3.IntegrityError):
                    conn.execute(
                        "INSERT INTO activity_session (child_profile_id, activity_id, difficulty, started_at) VALUES (?, ?, ?, ?)",
                        (999, "math.pattern_train.001", "easy", "2026-06-12T00:00:00"),
                    )
            finally:
                conn.close()

    def test_activity_session_start_completion_and_reload_readback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "portal.sqlite3"
            session_id = start_activity_session("math.pattern_train.001", "normal", db_path)
            self.assertGreater(session_id, 0)
            self.assertEqual("in_progress", recent_activity_sessions(path=db_path)[0]["status"])

            complete_activity_session(
                session_id,
                score=100,
                hint_count=2,
                retry_count=1,
                result_summary={"correct_answers": 15, "total_questions": 15, "levels_completed": 3},
                path=db_path,
            )

            saved = latest_completed_activity_session("math.pattern_train.001", db_path)
            self.assertIsNotNone(saved)
            assert saved is not None
            self.assertEqual("completed", saved["status"])
            self.assertTrue(saved["completed_at"])
            self.assertEqual(2, saved["hint_count"])
            self.assertEqual(1, saved["retry_count"])
            self.assertEqual(100, saved["result_summary"]["score"])
            self.assertEqual(15, saved["result_summary"]["correct_answers"])

    def test_recent_sessions_supply_parent_summary_readback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "portal.sqlite3"
            session_id = start_activity_session("math.pattern_train.001", "normal", db_path)
            complete_activity_session(
                session_id,
                score=80,
                result_summary={"correct_answers": 12, "total_questions": 15},
                path=db_path,
            )
            sessions = recent_activity_sessions(path=db_path)
            self.assertEqual(1, len(sessions))
            self.assertEqual("math.pattern_train.001", sessions[0]["activity_id"])
            self.assertEqual("completed", sessions[0]["status"])
            self.assertEqual(80, sessions[0]["result_summary"]["score"])


if __name__ == "__main__":
    unittest.main()
