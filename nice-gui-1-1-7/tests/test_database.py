from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from portal_app.database import hash_parent_pin, initialize_database


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
        hashed = hash_parent_pin("1234", salt="test")
        self.assertNotEqual("1234", hashed)
        self.assertEqual(64, len(hashed))


if __name__ == "__main__":
    unittest.main()

