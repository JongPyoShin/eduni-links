from __future__ import annotations

import unittest

from portal_app import space_routes


class SpaceDirectionClarityTests(unittest.TestCase):
    def test_direction_problem_states_rotation_degrees_and_start_direction(self) -> None:
        response = space_routes._space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        for marker in (
            "90° 반시계 방향으로 돌기",
            "90° 시계 방향으로 돌기",
            "시작 방향:",
            "회전은 항상 90°씩",
            "앞으로 1칸 이동",
        ):
            self.assertIn(marker, html)
        self.assertNotIn("↶ 왼쪽으로 돌기", html)
        self.assertNotIn("↷ 오른쪽으로 돌기", html)


if __name__ == "__main__":
    unittest.main()
