from __future__ import annotations

import unittest
from pathlib import Path

from portal_app.content_loader import CONTENT_ROOT, ContentValidationError, load_activities

APP_ROOT = Path(__file__).resolve().parents[1]


class ContentValidationTests(unittest.TestCase):
    def test_valid_content_loads(self) -> None:
        activities = load_activities(CONTENT_ROOT)
        self.assertEqual(["math.pattern_train.001"], [activity.id for activity in activities])

    def test_invalid_fixture_fails_outside_content_tree(self) -> None:
        invalid_root = APP_ROOT / "tests" / "fixtures" / "invalid"
        with self.assertRaises(ContentValidationError):
            load_activities(invalid_root)


if __name__ == "__main__":
    unittest.main()

