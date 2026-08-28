from __future__ import annotations

import unittest

from nicegui import app
from starlette.routing import Match

from portal_app.space_routes import (
    SPACE_GAME_FILE,
    SPACE_GAME_URL,
    SPACE_QUESTION_BANK_FILE,
    SPACE_QUESTION_BANK_URL,
    _space_game_html,
)


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class SpaceGameTests(unittest.TestCase):
    def test_space_routes_are_registered(self) -> None:
        for path in (
            SPACE_GAME_URL,
            f"{SPACE_GAME_URL}/",
            SPACE_QUESTION_BANK_URL,
            "/games/eduni-space",
            "/games/eduni-space/",
        ):
            route = route_for(path)
            self.assertIsNotNone(route, path)
            assert route is not None
            self.assertTrue(callable(route.endpoint))

    def test_space_game_html_contains_all_mvp_modes(self) -> None:
        self.assertTrue(SPACE_GAME_FILE.exists())
        html = SPACE_GAME_FILE.read_text(encoding="utf-8")
        for marker in ("거울 찾기", "도형 회전", "블록 탐정", "위에서 보기", "const TOTAL = 10"):
            self.assertIn(marker, html)

    def test_question_bank_contains_200_randomized_configurations(self) -> None:
        self.assertTrue(SPACE_QUESTION_BANK_FILE.exists())
        javascript = SPACE_QUESTION_BANK_FILE.read_text(encoding="utf-8")
        for marker in (
            "buildUnique(50, 101",
            "buildUnique(50, 2001",
            "buildUnique(50, 5001",
            "mirror: 50",
            "rotate: 50",
            "count: 50",
            "projection: 50",
            "total: 200",
        ):
            self.assertIn(marker, javascript)

    def test_served_space_html_wires_question_bank_and_shuffle_bags(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn(f'<script src="{SPACE_QUESTION_BANK_URL}"></script>', html)
        self.assertIn("200문제 풀에서 매번 10문제를 랜덤으로 골라", html)
        self.assertIn("drawBankMatrix('mirror'", html)
        self.assertIn("drawBankMatrix('rotate'", html)
        self.assertIn("drawBankMatrix('count'", html)
        self.assertIn("drawBankMatrix('projection'", html)
        self.assertIn("bankBags[name] = shuffle", html)

    def test_served_space_html_has_in_game_return_to_intro(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn('id="spaceHomeBtn"', html)
        self.assertIn("← 처음으로", html)
        self.assertIn("function goToSpaceIntro()", html)
        self.assertIn("$('intro').style.display='block'", html)
        self.assertIn("$('game').style.display='none'", html)


if __name__ == "__main__":
    unittest.main()
