from __future__ import annotations

import unittest

from nicegui import app
from starlette.routing import Match

from portal_app.space_logic_reasoning import SPACE_LOGIC_BANK_FILE, SPACE_LOGIC_BANK_URL
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
            SPACE_LOGIC_BANK_URL,
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

    def test_spatial_question_bank_keeps_350_validated_configurations(self) -> None:
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
            "is_unambiguous_count_map",
            "is_unambiguous_projection_map",
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

    def test_logic_bank_adds_120_solver_validated_questions(self) -> None:
        self.assertTrue(SPACE_LOGIC_BANK_FILE.exists())
        javascript = SPACE_LOGIC_BANK_FILE.read_text(encoding="utf-8")
        for marker in (
            "solveSequenceScenario",
            "validateSequenceScenario",
            "solveConditionScenario",
            "validateConditionScenario",
            "solvePathScenario",
            "validatePathScenario",
            "buildValidated(\n    40,\n    21001",
            "buildValidated(\n    40,\n    26001",
            "buildValidated(\n    40,\n    31001",
            "sequence:40",
            "condition:40",
            "pathlogic:40",
            "total:120",
        ):
            self.assertIn(marker, javascript)

    def test_served_space_html_wires_all_ten_modes_and_470_pool(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn(f'<script src="{SPACE_QUESTION_BANK_URL}"></script>', html)
        self.assertIn(f'<script src="{SPACE_LOGIC_BANK_URL}"></script>', html)
        self.assertIn("470문제 풀에서 공간지각·규칙·조건·길찾기 문제 10개", html)
        self.assertIn("drawBankMatrix('mirror'", html)
        self.assertIn("drawBankMatrix('rotate'", html)
        self.assertIn("drawBankMatrix('count'", html)
        self.assertIn("drawBankMatrix('projection'", html)
        self.assertIn("drawBankItem('direction'", html)
        self.assertIn("drawBankItem('compose'", html)
        self.assertIn("drawBankItem('fold'", html)
        self.assertIn("drawBankItem('sequence'", html)
        self.assertIn("drawBankItem('condition'", html)
        self.assertIn("drawBankItem('pathlogic'", html)
        self.assertIn("'sequence','condition','pathlogic'", html)
        self.assertIn("shuffle(allTypes).slice(0,8)", html)
        for label in (
            "🧭 방향 이동",
            "🧩 조각 합치기",
            "📄 종이 접기",
            "🧠 규칙 추론",
            "🔐 조건 배치",
            "🗺️ 조건 길찾기",
        ):
            self.assertIn(label, html)

    def test_question_contract_requires_one_exact_answer_and_problem_id(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn("function validateQuestionContract(question)", html)
        self.assertIn("new Set(keys).size!==3", html)
        self.assertIn("filter((key) => key===String(question.correctKey)).length!==1", html)
        self.assertIn("function stampQuestion(type, question)", html)
        self.assertIn("state.question.questionId", html)
        self.assertIn("EDUNI could not build a single-answer question", html)

    def test_new_logic_prompts_explain_task_and_rules(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "다음에 올 그림은 무엇일까?",
            "세 조건을 모두 만족하는 줄은?",
            "규칙을 모두 지키며 갈 수 있는 보물은?",
            "해야 할 일:",
            "조건 하나만 맞는 답이 아니라",
            "열쇠를 먼저 얻어야 합니다",
            "반드시 문을 실제로 통과한 뒤",
        ):
            self.assertIn(marker, html)

    def test_direction_prompts_are_explicit(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn("90° 반시계 방향으로 돌기", html)
        self.assertIn("90° 시계 방향으로 돌기", html)
        self.assertIn("시작 방향", html)
        self.assertIn("앞으로 1칸 이동", html)
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
