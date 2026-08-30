from __future__ import annotations

import unittest

from portal_app.space_routes import _space_game_html


class SpaceDirectionAnswerGuardTests(unittest.TestCase):
    def test_direction_answer_key_uses_destination_only(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn("function directionAnswerKey(row,col)", html)
        self.assertIn(
            "const correctKey=directionAnswerKey(scenario.finalRow,scenario.finalCol);",
            html,
        )
        self.assertIn("key:directionAnswerKey(r,c)", html)
        self.assertIn("html:renderDirectionGrid(r,c,null,true)", html)
        self.assertNotIn("function directionAnswerKey(row,col,direction)", html)

    def test_direction_prompt_explicitly_asks_only_for_destination(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "명령을 모두 따라가면 어디에 도착할까?",
            "마지막으로 도착하는 칸을 고르세요",
            "화살표 방향이 아니라 별(★)의 위치만 확인",
            "돌기 명령은 칸을 이동하지 않습니다",
            "제자리에서 90° 반시계 방향",
            "제자리에서 90° 시계 방향",
        ):
            self.assertIn(marker, html)
        self.assertNotIn("마지막 위치와 방향은?", html)
        self.assertNotIn("마지막 칸과 화살표 방향이 모두 맞는 답", html)

    def test_destination_choices_render_star_without_facing_arrow(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn("renderDirectionGrid(r,c,null,true)", html)
        self.assertIn("does not render destination star", html)
        self.assertIn("must not render a facing arrow", html)
        self.assertIn('fill=\"#7c3aed\"', html)
        self.assertNotIn('${x+17}', html)

    def test_all_50_direction_scenarios_have_destination_ui_audit(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "function solveDirectionScenarioContract(scenario)",
            "function buildDirectionChoicePositions(scenario)",
            "function auditDirectionUiContracts()",
            "window.EDUNI_DIRECTION_UI_AUDIT=report",
            "answerMode:'destination-only'",
            "direction pool ${scenarios.length}/50",
            "three unique destination choices required",
            "correct destination must appear exactly once",
            "✅ 문제은행 470/470 + 방향 도착칸 50/50 검증 통과",
            "⛔ 문제은행/화면 정답 검증 실패 · 문제 출제 차단",
        ):
            self.assertIn(marker, html)

    def test_question_generation_fails_closed_without_direction_ui_audit(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn("const directionUi=window.EDUNI_DIRECTION_UI_AUDIT;", html)
        self.assertIn("directionUi.checked!==50", html)
        self.assertIn("directionUi.total!==50", html)
        self.assertIn("EDUNI direction UI audit did not pass 50/50; gameplay blocked", html)
        self.assertIn("EDUNI direction scenario failed independent solve before rendering", html)
        self.assertIn("EDUNI direction destination choices failed single-answer contract", html)

    def test_internal_solver_still_checks_final_direction(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn(
            "solved.row!==scenario.finalRow || solved.col!==scenario.finalCol || solved.direction!==scenario.finalDirection",
            html,
        )

    def test_reported_screenshot_sequence_finishes_at_right_edge(self) -> None:
        row, col, direction = 2, 2, 1  # center cell, facing right
        dr = (-1, 0, 1, 0)
        dc = (0, 1, 0, -1)
        for command in ("F", "F", "L", "L"):
            if command == "L":
                direction = (direction + 3) % 4
            elif command == "R":
                direction = (direction + 1) % 4
            else:
                row += dr[direction]
                col += dc[direction]
        self.assertEqual((2, 4, 3), (row, col, direction))
        self.assertEqual((2, 4), (row, col))  # child-facing answer is destination only


if __name__ == "__main__":
    unittest.main()
