from __future__ import annotations

import unittest

from nicegui import app
from starlette.routing import Match

from portal_app.space_quality_guard import SPACE_SPATIAL_GUARD_FILE, SPACE_SPATIAL_GUARD_URL
from portal_app.space_routes import _space_game_html


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class SpaceQualityGuardTests(unittest.TestCase):
    def test_spatial_guard_route_and_file_exist(self) -> None:
        self.assertTrue(SPACE_SPATIAL_GUARD_FILE.exists())
        route = route_for(SPACE_SPATIAL_GUARD_URL)
        self.assertIsNotNone(route)

    def test_spatial_guard_rejects_same_projection_column(self) -> None:
        javascript = SPACE_SPATIAL_GUARD_FILE.read_text(encoding="utf-8")
        for marker in (
            "hasProjectedColumnCollision",
            "const projectedColumn = c - r",
            "hasSolidTwoByTwo",
            "isVisuallyUnambiguousMap",
            "refill(bank.countMaps, 50",
            "refill(bank.projectionMaps, 50",
            "collisionRule:'unique c-r projection column'",
        ):
            self.assertIn(marker, javascript)

    def test_spatial_guard_keeps_both_pools_at_50(self) -> None:
        javascript = SPACE_SPATIAL_GUARD_FILE.read_text(encoding="utf-8")
        self.assertIn("count:bank.countMaps.length", javascript)
        self.assertIn("projection:bank.projectionMaps.length", javascript)
        self.assertIn("if (filtered.length !== count)", javascript)

    def test_served_html_loads_guard_before_logic_bank(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        question_index = html.index('/space-question-bank.js')
        guard_index = html.index(SPACE_SPATIAL_GUARD_URL)
        logic_index = html.index('/space-logic-bank.js')
        self.assertLess(question_index, guard_index)
        self.assertLess(guard_index, logic_index)

    def test_existing_modes_have_detailed_task_and_rule_copy(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        for marker in (
            "세로 거울에 비친 뒤의 모양을 고르세요",
            "도형 전체를 오른쪽, 즉 시계 방향으로",
            "바닥의 서로 다른 칸은 서로 다른 기둥입니다",
            "바로 위에서 내려다봤을 때 보이는 바닥 모양",
            "파란 조각과 분홍 조각을 같은 4×4 격자",
            "종이를 정확히 반으로 한 번 접고",
        ):
            self.assertIn(marker, html)

    def test_cube_modes_show_floor-grid_intent(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        self.assertIn("바닥 3×3 격자의 칸을 기준으로 기둥을 구분해요.", html)
        self.assertIn("바닥 3×3 격자에서 블록이 놓인 칸만 찾아요.", html)


if __name__ == "__main__":
    unittest.main()
