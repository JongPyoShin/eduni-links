"""Bubble Shooter — Phase 1 integration tests."""
from __future__ import annotations

import importlib
import unittest
from pathlib import Path

APP_MODULE = Path(__file__).resolve().parent.parent / 'app.py'


class BubbleShooterIntegrationTests(unittest.TestCase):
    """Verify that the Bubble Shooter route, shared logic, and key contracts are wired."""

    @classmethod
    def _app_source(cls) -> str:
        return APP_MODULE.read_text(encoding='utf-8')

    def test_bubble_shooter_route_declared(self) -> None:
        src = self._app_source()
        self.assertIn("@ui.page('/bubble-shooter')", src)

    def test_shooter_html_template_exists(self) -> None:
        src = self._app_source()
        self.assertIn('SHOOTER_HTML_TEMPLATE', src)

    def test_load_bubble_questions_function(self) -> None:
        src = self._app_source()
        self.assertIn('def load_bubble_questions()', src)

    def test_after_turn_has_add_bubble_parameter(self) -> None:
        """afterTurn must accept an addBubble parameter to distinguish correct/miss."""
        src = self._app_source()
        self.assertIn('function afterTurn(addBubble)', src)

    def test_correct_hit_no_pressure(self) -> None:
        """Correct hit path must call afterTurn(false)."""
        src = self._app_source()
        self.assertIn('afterTurn(false)', src)

    def test_miss_adds_pressure(self) -> None:
        """Miss path must call afterTurn(true)."""
        src = self._app_source()
        self.assertIn('afterTurn(true)', src)

    def test_generation_counter_for_stale_callback(self) -> None:
        """startGame must increment a generation counter to invalidate old callbacks."""
        src = self._app_source()
        self.assertIn('state.generation', src)

    def test_logic_module_loaded(self) -> None:
        """The shared logic JS file exists and is referenced."""
        logic_file = Path(__file__).resolve().parent.parent / 'portal_app' / 'static_games' / 'eduni_bubble_shooter_logic.js'
        self.assertTrue(logic_file.exists(), f'Logic module not found: {logic_file}')
        content = logic_file.read_text(encoding='utf-8')
        self.assertIn('EDUNIBubbleShooterLogic', content)
        self.assertIn('resolveShot', content)

    def test_existing_bubble_route_untouched(self) -> None:
        """The separate /bubble route must still exist."""
        src = self._app_source()
        self.assertIn("@ui.page('/bubble')", src)

    def test_restart_increments_generation(self) -> None:
        """startGame should increment state.generation."""
        src = self._app_source()
        self.assertIn('state.generation = (state.generation || 0) + 1', src)

    def test_praise_timeout_checks_generation(self) -> None:
        """showPraise timeout must capture and check the generation token."""
        src = self._app_source()
        self.assertIn('const gen = state.generation', src)
        self.assertIn('if (state.generation !== gen) return;', src)


if __name__ == '__main__':
    unittest.main()
