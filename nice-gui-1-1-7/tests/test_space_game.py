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

    def test_space_game_html_contains_original_mvp_modes(self) -> None:
        self.assertTrue(SPACE_GAME_FILE.exists())
        html = SPACE_GAME_FILE.read_text(encoding="utf-8")
        for marker in ("거울 찾기", "도형 회전", "블록 탐정", "위에서 보기", "const TOTAL = 10"):
            self.assertIn(marker, html)

    def test_question_bank_contains_350_randomized_configurations(self) -> None:
        self.assertTrue(SPACE_QUESTION_BANK_FILE.exists())
        javascript = SPACE_QUESTION_BANK_FILE.read_text(encoding="utf-8")
        for marker in (
            "buildUnique(50, 101",
            "buildUnique(50, 2001",
            "buildUnique(50, 5001",
            "buildUnique(50, 8001",
            "item.commands.includes('F')",
            "composeScenarios = shapes.map",
            "buildUnique(50, 12001",
            "mirror:50",
            "rotate:50",
            "count:50",
            "projection:50",
            "direction:50",
            "compose:50",
            "fold:50",
            "total:350",
        ):
            self.assertIn(marker, javascript)

    def test_served_space_html_wires_all_seven_modes_and_shuffle_bags(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn(f'<script src="{SPACE_QUESTION_BANK_URL}"></script>', html)
        self.assertIn("350문제 풀에서 공간지각과 사고추론 문제 10개", html)
        self.assertIn("drawBankMatrix('mirror'", html)
        self.assertIn("drawBankMatrix('rotate'", html)
        self.assertIn("drawBankMatrix('count'", html)
        self.assertIn("drawBankMatrix('projection'", html)
        self.assertIn("drawBankItem('direction'", html)
        self.assertIn("drawBankItem('compose'", html)
        self.assertIn("drawBankItem('fold'", html)
        self.assertIn("bankBags[name] = shuffle", html)
        self.assertIn("'direction','compose','fold'", html)
        for label in ("🧭 방향 이동", "🧩 조각 합치기", "📄 종이 접기"):
            self.assertIn(label, html)

    def test_reasoning_modes_expose_child_friendly_prompts(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "명령을 모두 따라가면 어디에 도착할까?",
            "두 조각을 합치면 어떤 모양이 될까?",
            "종이를 펼치면 구멍은 어디에 생길까?",
            "먼저 몸의 방향을 돌린 다음",
            "파란 칸과 분홍 칸을 하나의 격자에",
            "접힌 선을 거울이라고 생각하고",
        ):
            self.assertIn(marker, html)

    def test_direction_prompts_are_explicit(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn("90° 반시계 방향으로 돌기", html)
        self.assertIn("90° 시계 방향으로 돌기", html)
        self.assertIn("시작 방향:", html)
        self.assertNotIn("왼쪽으로 돌기", html)
        self.assertNotIn("오른쪽으로 돌기", html)

    def test_count_projection_clarity_guards_and_floor_grid(self) -> None:
        bank = SPACE_QUESTION_BANK_FILE.read_text(encoding="utf-8")
        self.assertIn("is_unambiguous_count_map", bank)
        self.assertIn("is_unambiguous_projection_map", bank)
        html = SPACE_GAME_FILE.read_text(encoding="utf-8")
        self.assertIn("바닥 격자 포함", html)

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
