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

    def test_portal_routes_module_declares_phase0_routes(self) -> None:
        route_source = (APP_ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('@ui.page("/portal")', route_source)
        self.assertIn('@ui.page("/portal/world/{world_id}")', route_source)
        self.assertIn('@ui.page("/portal/parent")', route_source)


if __name__ == "__main__":
    unittest.main()
