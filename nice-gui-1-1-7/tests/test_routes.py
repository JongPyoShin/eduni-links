from __future__ import annotations

import unittest
from pathlib import Path
from types import SimpleNamespace

from portal_app.registry import WORLDS, get_world
from portal_app.routes import JUNGLE_EXPEDITION_ACTIVITY_ID, activity_launch_path, eduni_jungle_game

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

    def test_jungle_activity_uses_the_canonical_static_route(self) -> None:
        response = eduni_jungle_game()
        self.assertEqual("/jungle", activity_launch_path(SimpleNamespace(id=JUNGLE_EXPEDITION_ACTIVITY_ID)))
        self.assertEqual(200, response.status_code)
        self.assertIn(b"EDUNI Jungle Adventure", response.body)

    def test_canonical_jungle_page_keeps_mobile_safe_area_and_pointer_contract(self) -> None:
        body = eduni_jungle_game().body.decode("utf-8")
        self.assertIn("viewport-fit=cover", body)
        self.assertIn("env(safe-area-inset-bottom)", body)
        self.assertIn("touch-action: none", body)
        self.assertIn("pointercancel", body)

    def test_jungle_question_card_polish_is_declared(self) -> None:
        jungle_source = (APP_ROOT / "portal_app" / "jungle_expedition.py").read_text(encoding="utf-8")
        self.assertIn("jungle-question-prompt", jungle_source)
        self.assertIn("font-size: 20px", jungle_source)
        self.assertIn("font-size: 21px", jungle_source)
        self.assertIn("question_title.set_text", jungle_source)
        self.assertNotIn('{question["subject"]} 문제', jungle_source)
        self.assertIn("hint_button.set_visibility(True)", jungle_source)
        self.assertIn("hint_button.set_visibility(False)", jungle_source)


if __name__ == "__main__":
    unittest.main()
