from __future__ import annotations

import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.routes import EDUNI_MATH_PLAYFACTORY_URL, math_playfactory_page, register_pages


ROOT = Path(__file__).resolve().parents[1]


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class MathPlayfactoryPortalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        register_pages()

    def test_math_game_route_and_content(self):
        self.assertEqual("/portal/math/playfactory", EDUNI_MATH_PLAYFACTORY_URL)
        self.assertIsNotNone(route_for(EDUNI_MATH_PLAYFACTORY_URL))
        response = math_playfactory_page()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        for marker in ("수와 연산", "평면도형", "공간전략게임",
                       "rotateShape()", "hintSpatial()", "undoSpatial()",
                       'href="/portal/world/math"'):
            self.assertIn(marker, html)

    def test_math_game_is_linked_in_all_three_portal_sections(self):
        source = (ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('_portal_card(EDUNI_MATH_PLAYFACTORY_URL, "🎲 수학 보드게임 3종"', source)
        self.assertIn('if world_id == "math":', source)
        self.assertIn('ui.link("🎲 수학 보드게임 3종 시작하기", EDUNI_MATH_PLAYFACTORY_URL)', source)
        self.assertIn('EDUNI_GAME_PORTAL_URL = "/portal/games"', source)

    def test_no_child_upload_or_remote_api_calls(self):
        html = math_playfactory_page().body.decode("utf-8")
        for unsafe in ("XMLHttpRequest(", "fetch(", "navigator.mediaDevices",
                       "<iframe", "https://", "http://"):
            self.assertNotIn(unsafe, html)


if __name__ == "__main__":
    unittest.main()
