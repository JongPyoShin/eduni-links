from __future__ import annotations

import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.routes import (
    EDUNI_GAME_PORTAL_URL,
    EDUNI_SURVIVAL_URL,
    eduni_survival_game,
    register_pages,
)

ROOT = Path(__file__).resolve().parents[1]


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class FamilySurvivalRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        register_pages()

    def test_family_server_serves_survival_and_assets(self) -> None:
        self.assertEqual("/survival", EDUNI_SURVIVAL_URL)
        self.assertEqual("/portal/games", EDUNI_GAME_PORTAL_URL)
        for path in (
            "/survival", "/survival/", "/portal/games",
            "/survival-static/logic.js",
            "/survival-static/render25d.js",
            "/survival-static/worlds.js",
            "/survival-static/worldart25d.js",
            "/survival-static/game.js",
            "/survival-static/survival3d.module.js",
        ):
            with self.subTest(path=path):
                self.assertIsNotNone(route_for(path))

    def test_game_html_uses_same_origin_not_github_pages(self) -> None:
        response = eduni_survival_game()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        for marker in (
            "3D ADVENTURE", 'id="gameCanvas"',
            'id="graphicsToggle"', 'id="miniMapCanvas"',
            'id="livesRange"', 'max="35"',
            '/survival-static/game.js?v=11',
            '/survival-static/survival3d.module.js?v=11',
            'href="/portal/games"', 'type="module"',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, html)
        self.assertNotIn("jongpyoshin.github.io", html)
        self.assertNotIn('src="../nice-gui-1-1-7/', html)
        self.assertIn("/sudoku-assets/eduni_companion.js", html)

    def test_survival_embedded_in_family_portal_navigation(self) -> None:
        source = (ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('_portal_card(EDUNI_SURVIVAL_URL, "🎮 마주치지 마! 3D 서바이벌"', source)
        self.assertIn('_portal_card(EDUNI_SURVIVAL_URL, "마주치지 마! 3D 서바이벌"', source)
        self.assertIn('ui.link("🎮 서바이벌 3D", EDUNI_SURVIVAL_URL)', source)
        self.assertIn('ui.link("← 가족 포털로 돌아가기", "/portal")', source)

    def test_previous_routes_and_ai_companion_are_preserved(self) -> None:
        for path in (
            "/portal", "/portal/games", "/jungle", "/jungle-3d",
            "/link", "/omok", "/reading", "/ai/companion/chat",
        ):
            with self.subTest(path=path):
                self.assertIsNotNone(route_for(path))
        source = (ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn("inject_companion_assets(body)", source)
        self.assertIn('@ui.page("/portal/world/{world_id}")', source)


if __name__ == "__main__":
    unittest.main()
