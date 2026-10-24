from __future__ import annotations

import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.routes import EDUNI_PHONICS_URL, english_phonics_page, register_pages

ROOT = Path(__file__).resolve().parents[1]


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class PhonicsPortalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_pages()

    def test_phonics_route_and_static_script(self):
        self.assertEqual(EDUNI_PHONICS_URL, "/portal/english/phonics")
        self.assertIsNotNone(route_for(EDUNI_PHONICS_URL))
        self.assertIsNotNone(route_for("/phonics-static/phonics.js"))
        response = english_phonics_page()
        self.assertEqual(response.status_code, 200)
        html = response.body.decode("utf-8")
        for marker in (
            "소리톡 파닉스", "phonicsLesson", 'id="phonemes"',
            'id="playSounds"', 'id="playWhole"', 'id="playSlow"',
            'id="recordButton"', 'id="parentConfirm"',
            "/phonics-static/phonics.js?v=1", "음소별 정확도를 측정한 점수가 아닙니다"
        ):
            self.assertIn(marker, html)

    def test_portal_english_link_is_no_longer_placeholder(self):
        source = (ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('_portal_card(EDUNI_PHONICS_URL, "영어 · 소리톡 파닉스"', source)
        self.assertIn('_portal_card(EDUNI_PHONICS_URL, "🔤 소리톡 파닉스"', source)
        self.assertIn('ui.link("🔤 영어 파닉스", EDUNI_PHONICS_URL)', source)
        self.assertIn('if world_id == "english":', source)
        self.assertIn('ui.navigate.to(EDUNI_PHONICS_URL)', source)

    def test_child_audio_not_collected_by_eduni(self):
        js = (ROOT / "portal_app" / "phonics_static" / "phonics.js").read_text(encoding="utf-8")
        self.assertIn("rec.continuous=false", js)
        self.assertIn("rec.lang=\"en-US\"", js)
        self.assertIn("rec.onresult=", js)
        self.assertIn('doc.addEventListener("visibilitychange"', js)
        self.assertNotIn("MediaRecorder", js)
        self.assertNotIn("fetch(", js)
        self.assertNotIn("localStorage", js)
        self.assertNotIn("indexedDB", js)
        self.assertNotIn("XMLHttpRequest", js)


if __name__ == "__main__":
    unittest.main()
