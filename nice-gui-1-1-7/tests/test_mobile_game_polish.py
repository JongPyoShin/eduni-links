from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

from app import bubble_html, shooter_html


APP_ROOT = Path(__file__).resolve().parents[1]


class LinkMobileContractTests(unittest.TestCase):
    def test_mobile_layout_uses_bottom_dock_instead_of_sidebar_column(self) -> None:
        source = (APP_ROOT / "portal_app" / "static_games" / "eduni_link.html").read_text(encoding="utf-8")
        self.assertIn("@media (max-width: 720px), (max-height: 480px)", source)
        self.assertIn("grid-template-columns: minmax(0, 1fr)", source)
        self.assertIn("grid-template-rows: minmax(0, 1fr) auto", source)
        self.assertIn('id="moreBtn"', source)
        self.assertIn("$('moreBtn').addEventListener('click', showMoreActions)", source)

    def test_existing_actions_and_board_resize_contract_remain_available(self) -> None:
        source = (APP_ROOT / "portal_app" / "static_games" / "eduni_link.html").read_text(encoding="utf-8")
        for action_id in ("pauseBtn", "hintBtn", "shuffleBtn", "codexBtn", "parentBtn", "newBtn", "soundBtn"):
            self.assertIn(f'id="{action_id}"', source)
            self.assertIn(f"$('{action_id}').addEventListener('click'", source)
        self.assertIn("function resizeBoardAndCanvas()", source)
        self.assertIn("orientationchange", source)
        self.assertIn("Math.max(1, Math.floor(Math.min(", source)
        self.assertNotIn("Math.max(28, tile)", source)


class BubbleMobileContractTests(unittest.TestCase):
    def test_route_is_full_bleed_and_keeps_game_controls(self) -> None:
        source = (APP_ROOT / "app.py").read_text(encoding="utf-8")
        self.assertIn("@ui.page('/bubble')", source)
        self.assertIn("width=device-width, initial-scale=1, viewport-fit=cover", source)
        html = bubble_html()
        for element_id in ("bubble-root", "bubbleStatus", "questionText", "bubbleField", "feedbackPanel", "soundButton", "restartButton", "answerNextButton"):
            self.assertIn(f'id="{element_id}"', html)
        self.assertIn("position: fixed", html)
        self.assertIn("field.clientWidth", html)
        self.assertIn("field.clientHeight", html)
        self.assertNotIn("html, body, #app, .nicegui-content", html)

    def test_rendered_canonical_questions_have_valid_answer_choices(self) -> None:
        html = bubble_html()
        match = re.search(r"const questions = (\[.*?\]);\s*const totalRounds", html, re.DOTALL)
        self.assertIsNotNone(match, "bubble question data was not embedded")
        questions = json.loads(match.group(1))
        self.assertGreaterEqual(len(questions), 10)
        for question in questions:
            choices = question["choices"]
            answer_index = question["answerIndex"]
            self.assertGreaterEqual(len(choices), 3)
            self.assertLess(answer_index, len(choices))
            self.assertEqual(question["answerLabel"], choices[answer_index])


class ShooterMobileContractTests(unittest.TestCase):
    def test_modern_target_hud_canvas_and_controls_remain_wired(self) -> None:
        source = (APP_ROOT / "app.py").read_text(encoding="utf-8")
        self.assertIn("@ui.page('/bubble-shooter')", source)
        html = shooter_html()
        for element_id in ("hanja-shooter-root", "shooterTarget", "shooterStatus", "shooterScore", "shooterProgress", "shooterCanvas", "shooterSoundButton", "shooterRestartButton", "shooterAnswerOverlay", "shooterNextButton"):
            self.assertIn(f'id="{element_id}"', html)
        self.assertIn("grid-template-rows: auto auto minmax(0, 1fr) auto", html)
        self.assertIn("viewport-fit=cover", source)
        self.assertIn("id=\"eduni-shooter-logic\"", html)
        self.assertIn("const sourceQuestions = __QUESTIONS_JSON__.filter(q => q.target && q.answerLabel)", source)
        canonical = json.loads((APP_ROOT.parent / "shared" / "bubble_shooter_questions.json").read_text(encoding="utf-8"))
        self.assertIn(canonical["questions"][0]["hanja"], html)

    def test_canvas_uses_css_pixel_geometry_at_short_viewports(self) -> None:
        html = shooter_html()
        self.assertIn("state.width = Math.max(1, rect.width)", html)
        self.assertIn("state.height = Math.max(1, rect.height)", html)
        self.assertNotIn("state.height = Math.max(480, rect.height)", html)
        self.assertIn("L.pointerToCss(event, rect)", html)


if __name__ == "__main__":
    unittest.main()
