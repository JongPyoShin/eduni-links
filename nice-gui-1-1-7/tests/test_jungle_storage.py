from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from portal_app.jungle_storage import count_total_captures, load_collection, record_capture


class JungleStorageTests(unittest.TestCase):
    def test_record_capture_persists_counts_and_history(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "jungle.sqlite3"
            bird = {
                "id": "bird.pigeon",
                "emoji": "🕊️",
                "name": "비둘기",
                "rarity": "common",
                "rarity_label": "흔한 새",
                "stars": "★",
            }
            question = {
                "id": "english-001",
                "subject": "영어",
            }

            self.assertEqual(1, record_capture(bird, question, db_path))
            self.assertEqual(2, record_capture(bird, question, db_path))
            self.assertEqual(2, count_total_captures(db_path))

            collection = load_collection(db_path)
            self.assertEqual(1, len(collection))
            self.assertEqual("bird.pigeon", collection[0]["bird_id"])
            self.assertEqual("비둘기", collection[0]["bird_name"])
            self.assertEqual("🕊️", collection[0]["emoji"])
            self.assertEqual("common", collection[0]["rarity"])
            self.assertEqual("흔한 새", collection[0]["rarity_label"])
            self.assertEqual("★", collection[0]["stars"])
            self.assertEqual(2, collection[0]["capture_count"])
            self.assertTrue(collection[0]["first_captured_at"])
            self.assertTrue(collection[0]["last_captured_at"])

    def test_record_capture_keeps_multiple_bird_types(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "jungle.sqlite3"
            pigeon = {
                "id": "bird.pigeon",
                "emoji": "🕊️",
                "name": "비둘기",
                "rarity": "common",
                "rarity_label": "흔한 새",
                "stars": "★",
            }
            peacock = {
                "id": "bird.peacock",
                "emoji": "🦚",
                "name": "공작",
                "rarity": "rare",
                "rarity_label": "희귀 새",
                "stars": "★★",
            }
            question = {"id": "math-001", "subject": "구구단"}

            record_capture(pigeon, question, db_path)
            record_capture(peacock, question, db_path)
            record_capture(peacock, question, db_path)

            collection = load_collection(db_path)
            by_id = {item["bird_id"]: item for item in collection}
            self.assertEqual(3, count_total_captures(db_path))
            self.assertEqual(1, by_id["bird.pigeon"]["capture_count"])
            self.assertEqual(2, by_id["bird.peacock"]["capture_count"])


if __name__ == "__main__":
    unittest.main()
