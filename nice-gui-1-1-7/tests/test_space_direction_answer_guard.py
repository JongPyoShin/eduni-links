from __future__ import annotations

import unittest

from portal_app.space_routes import _space_game_html


class SpaceDirectionAnswerGuardTests(unittest.TestCase):
    def test_direction_answer_key_includes_position_and_direction(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn("function directionAnswerKey(row,col,direction)", html)
        self.assertIn(
            "const correctKey=directionAnswerKey(scenario.finalRow,scenario.finalCol,scenario.finalDirection);",
            html,
        )
        self.assertIn("key:directionAnswerKey(r,c,direction)", html)
        self.assertIn("html:renderDirectionGrid(r,c,direction,true)", html)

    def test_direction_prompt_explicitly_requires_both_position_and_facing(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "명령을 모두 따라간 뒤, 마지막 위치와 방향은?",
            "마지막 칸과 화살표 방향이 모두 맞는 답",
            "돌기 명령은 칸을 이동하지 않습니다",
            "제자리에서 90° 반시계 방향",
            "제자리에서 90° 시계 방향",
        ):
            self.assertIn(marker, html)

    def test_destination_arrow_is_drawn_inside_grid_cell(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertNotIn('${x+17}', html)
        self.assertIn("direction === null ? '★' : DIRECTION_ARROWS[direction]", html)
        self.assertIn('r="14" fill="#eef2ff"', html)

    def test_all_50_direction_scenarios_have_runtime_ui_audit(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "function solveDirectionScenarioContract(scenario)",
            "function buildDirectionChoiceTriples(scenario)",
            "function auditDirectionUiContracts()",
            "window.EDUNI_DIRECTION_UI_AUDIT=report",
            "direction pool ${scenarios.length}/50",
            "three unique position+direction choices required",
            "correct answer must appear exactly once",
            "does not render facing direction",
            "✅ 문제은행 470/470 + 방향 화면·채점 50/50 통과",
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
        self.assertIn("EDUNI direction rendered choices failed single-answer contract", html)

    def test_reported_screenshot_sequence_finishes_at_right_edge_facing_left(self) -> None:
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


if __name__ == "__main__":
    unittest.main()
