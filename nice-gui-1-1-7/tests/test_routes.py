from __future__ import annotations

import unittest
from pathlib import Path

from portal_app.registry import WORLDS, get_world

APP_ROOT = Path(__file__).resolve().parents[1]


class RouteFoundationTests(unittest.TestCase):
    def test_world_registry_has_phase0_worlds(self) -> None:
        self.assertEqual(8, len(WORLDS))
        self.assertIsNotNone(get_world("math"))

    def test_existing_game_routes_are_still_declared(self) -> None:
        app_source = (APP_ROOT / "app.py").read_text(encoding="utf-8")
        self.assertIn("@ui.page('/')", app_source)
        self.assertIn("@ui.page('/bubble')", app_source)
        self.assertIn("@ui.page('/bubble-shooter')", app_source)

    def test_eduni_host_environment_variable_is_supported(self) -> None:
        app_source = (APP_ROOT / "app.py").read_text(encoding="utf-8")
        self.assertIn("EDUNI_HOST", app_source)
        self.assertIn("'127.0.0.1'", app_source)

    def test_portal_routes_module_declares_phase0_routes(self) -> None:
        route_source = (APP_ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('@ui.page("/portal")', route_source)
        self.assertIn('@ui.page("/portal/world/{world_id}")', route_source)
        self.assertIn('@ui.page("/portal/parent")', route_source)

    def test_jungle_expedition_phase_c3_route_is_declared(self) -> None:
        route_source = (APP_ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        jungle_source = (APP_ROOT / "portal_app" / "jungle_expedition.py").read_text(encoding="utf-8")
        self.assertIn("JUNGLE_EXPEDITION_ACTIVITY_ID", route_source)
        self.assertIn("jungle.expedition.001", jungle_source)
        self.assertIn("정글 대탐험", jungle_source)
        self.assertIn("Phase C-3", jungle_source)
        self.assertIn("전진", jungle_source)
        self.assertIn("짐칸", jungle_source)
        self.assertIn("도감", jungle_source)
        self.assertIn("새 도감", jungle_source)
        self.assertNotIn('ui.button("정지"', jungle_source)
        self.assertIn("select_question", jungle_source)
        self.assertIn("format_bird_badge", jungle_source)
        self.assertIn("format_codex_summary", jungle_source)
        self.assertIn("format_codex_items", jungle_source)
        self.assertIn("load_collection", jungle_source)
        self.assertIn("record_capture", jungle_source)
        self.assertIn("힌트", jungle_source)
        self.assertIn("탐험 계속", jungle_source)
        self.assertIn("포획 성공", jungle_source)
        self.assertIn('stage.classes(add="is-moving")', jungle_source)
        self.assertIn("question_card.set_visibility(False)", jungle_source)


if __name__ == "__main__":
    unittest.main()
