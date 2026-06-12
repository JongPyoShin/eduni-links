from __future__ import annotations

import unittest
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
BLOCKED_TERMS = (
    "getUserMedia",
    "navigator.geolocation",
    "analytics.js",
    "googletagmanager",
    "google-analytics",
    "facebook.com/sharer",
    "adservice",
    "doubleclick",
)


class PrivacyDefaultTests(unittest.TestCase):
    def test_no_blocked_integrations_in_phase0_files(self) -> None:
        candidate_paths = [
            *Path(APP_ROOT, "portal_app").rglob("*.py"),
            *Path(APP_ROOT, "content").rglob("*.json"),
            Path(APP_ROOT).parents[0] / "portal" / "index.html",
        ]
        paths = [path for path in candidate_paths if path.exists()]
        combined = "\n".join(path.read_text(encoding="utf-8") for path in paths)
        for term in BLOCKED_TERMS:
            with self.subTest(term=term):
                self.assertNotIn(term, combined)

    def test_update_links_has_no_git_publish_switch(self) -> None:
        script_path = APP_ROOT.parents[0] / "update_links.ps1"
        if script_path.exists():
            script = script_path.read_text(encoding="utf-8")
            self.assertIn("NoGitPublish", script)


if __name__ == "__main__":
    unittest.main()
