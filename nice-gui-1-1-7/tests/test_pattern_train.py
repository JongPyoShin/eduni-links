from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from portal_app.content_loader import ContentValidationError, activity_from_file
from portal_app.pattern_train import (
    PATTERN_TRAIN_ACTIVITY_ID,
    build_pattern_train_result_summary,
    get_pattern_train_items,
    group_pattern_train_levels,
)

APP_ROOT = Path(__file__).resolve().parents[1]
ACTIVITY_PATH = APP_ROOT / "content" / "activities" / "math" / "pattern_train_001.json"


class PatternTrainTests(unittest.TestCase):
    def test_activity_has_three_levels_of_five_questions(self) -> None:
        activity = activity_from_file(ACTIVITY_PATH)
        items = get_pattern_train_items(activity)
        levels = group_pattern_train_levels(items)
        self.assertEqual(PATTERN_TRAIN_ACTIVITY_ID, activity.id)
        self.assertEqual(15, len(items))
        self.assertEqual("normal", activity.difficulty)
        self.assertEqual([1, 2, 3], [level for level, _ in levels])
        self.assertEqual([5, 5, 5], [len(level_items) for _, level_items in levels])
        self.assertEqual("16", items[-1]["answer"])
        for item in items:
            self.assertEqual(3, len(item["choices"]))
            self.assertIn(item["answer"], item["choices"])
            self.assertGreaterEqual(len(item["hints"]), 2)
            self.assertGreaterEqual(item["level"], 1)

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

    def test_non_consecutive_levels_are_rejected(self) -> None:
        payload = json.loads(ACTIVITY_PATH.read_text(encoding="utf-8"))
        for item in payload["items"]:
            if item["level"] == 2:
                item["level"] = 4
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "invalid_levels.json"
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            with self.assertRaises(ContentValidationError):
                activity_from_file(path)

    def test_next_level_button_is_declared(self) -> None:
        source = (APP_ROOT / "portal_app" / "pattern_train.py").read_text(encoding="utf-8")
        self.assertIn("다음 레벨 도전", source)
        self.assertIn("start_next_level", source)

    def test_completed_run_with_retry_uses_first_try_score(self) -> None:
        summary = build_pattern_train_result_summary(
            correct_answers=15,
            first_try_correct_answers=14,
            total_questions=15,
            retry_count=1,
            hint_count=2,
            levels_completed=3,
        )
        self.assertEqual(93, summary["score"])
        self.assertEqual(15, summary["correct_answers"])
        self.assertEqual(14, summary["first_try_correct_answers"])
        self.assertEqual(15, summary["total_questions"])
        self.assertEqual(1, summary["retry_count"])
        self.assertEqual(2, summary["hint_count"])
        self.assertEqual(3, summary["levels_completed"])

    def test_activity_route_and_start_link_are_declared(self) -> None:
        route_source = (APP_ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('@ui.page("/portal/activity/{activity_id}")', route_source)
        self.assertIn('f"/portal/activity/{activity.id}"', route_source)


if __name__ == "__main__":
    unittest.main()
