from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from portal_app.content_loader import ContentValidationError, activity_from_file
from portal_app.pattern_train import PATTERN_TRAIN_ACTIVITY_ID, get_pattern_train_items

APP_ROOT = Path(__file__).resolve().parents[1]
ACTIVITY_PATH = APP_ROOT / "content" / "activities" / "math" / "pattern_train_001.json"


class PatternTrainTests(unittest.TestCase):
    def test_progressive_activity_has_ten_playable_questions(self) -> None:
        activity = activity_from_file(ACTIVITY_PATH)
        items = get_pattern_train_items(activity)
        self.assertEqual(PATTERN_TRAIN_ACTIVITY_ID, activity.id)
        self.assertEqual(10, len(items))
        self.assertEqual("normal", activity.difficulty)
        self.assertIn("3단계 · 숫자 도전", {item["stage"] for item in items})
        self.assertEqual("13", items[-1]["answer"])
        for item in items:
            self.assertEqual(3, len(item["choices"]))
            self.assertIn(item["answer"], item["choices"])
            self.assertGreaterEqual(len(item["hints"]), 2)

    def test_invalid_answer_is_rejected(self) -> None:
        payload = json.loads(ACTIVITY_PATH.read_text(encoding="utf-8"))
        payload["items"][0]["answer"] = "❌"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "invalid_pattern.json"
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            with self.assertRaises(ContentValidationError):
                activity_from_file(path)

    def test_missing_item_hints_are_rejected(self) -> None:
        payload = json.loads(ACTIVITY_PATH.read_text(encoding="utf-8"))
        payload["items"][0]["hints"] = ["힌트 하나만 있음"]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "invalid_hints.json"
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            with self.assertRaises(ContentValidationError):
                activity_from_file(path)

    def test_activity_route_and_start_link_are_declared(self) -> None:
        route_source = (APP_ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('@ui.page("/portal/activity/{activity_id}")', route_source)
        self.assertIn('f"/portal/activity/{activity.id}"', route_source)


if __name__ == "__main__":
    unittest.main()
