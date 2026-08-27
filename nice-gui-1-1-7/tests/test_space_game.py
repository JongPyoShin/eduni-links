from __future__ import annotations

import unittest

from nicegui import app
from starlette.routing import Match

from portal_app.space_routes import SPACE_GAME_FILE, SPACE_GAME_URL


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class SpaceGameTests(unittest.TestCase):
    def test_space_routes_are_registered(self) -> None:
        for path in (SPACE_GAME_URL, f"{SPACE_GAME_URL}/", "/games/eduni-space", "/games/eduni-space/"):
            route = route_for(path)
            self.assertIsNotNone(route, path)
            assert route is not None
            self.assertTrue(callable(route.endpoint))

    def test_space_game_html_contains_all_mvp_modes(self) -> None:
        self.assertTrue(SPACE_GAME_FILE.exists())
        html = SPACE_GAME_FILE.read_text(encoding="utf-8")
        for marker in ("거울 찾기", "도형 회전", "블록 탐정", "위에서 보기", "const TOTAL = 10"):
            self.assertIn(marker, html)


if __name__ == "__main__":
    unittest.main()
