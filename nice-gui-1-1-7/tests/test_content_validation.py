from __future__ import annotations

import unittest
from pathlib import Path

from portal_app.content_loader import CONTENT_ROOT, ContentValidationError, load_activities
from portal_app.schemas import Activity

APP_ROOT = Path(__file__).resolve().parents[1]


class ContentValidationTests(unittest.TestCase):
    def test_valid_content_loads(self) -> None:
        activities = load_activities(CONTENT_ROOT)
        self.assertEqual(["math.pattern_train.001"], [activity.id for activity in activities])

    def test_invalid_fixture_fails_outside_content_tree(self) -> None:
        invalid_root = APP_ROOT / "tests" / "fixtures" / "invalid"
        with self.assertRaises(ContentValidationError):
            load_activities(invalid_root)

    def test_nested_privacy_field_fails(self) -> None:
        payload = {
            "id": "math.invalid.privacy",
            "world": "math",
            "title": "privacy",
            "activity_type": "pattern_sequence",
            "difficulty": "easy",
            "estimated_minutes": 5,
            "prompt": "privacy",
            "items": [{"photo_url": "https://example.invalid/photo.jpg"}],
        }
        with self.assertRaises(Exception):
            Activity(**payload)

    def test_unknown_extra_field_fails(self) -> None:
        payload = {
            "id": "math.invalid.extra",
            "world": "math",
            "title": "extra",
            "activity_type": "pattern_sequence",
            "difficulty": "easy",
            "estimated_minutes": 5,
            "prompt": "extra",
            "titel": "typo",
        }
        with self.assertRaises(Exception):
            Activity(**payload)


if __name__ == "__main__":
    unittest.main()
