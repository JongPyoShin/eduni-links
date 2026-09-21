"""Bubble Shooter — Phase 1 + Phase 2 integration tests."""
from __future__ import annotations

import importlib
import json
import unittest
from pathlib import Path

APP_MODULE = Path(__file__).resolve().parent.parent / 'app.py'
SHARED_DIR = Path(__file__).resolve().parent.parent.parent / 'shared'
CANONICAL_DATA = SHARED_DIR / 'bubble_shooter_questions.json'
RULE_CONTRACT = SHARED_DIR / 'bubble_shooter_rule_contract_cases.json'


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
        self.assertIn('isGenerationValid', src)

    def test_shooter_html_injects_shared_logic_script(self) -> None:
        """shooter_html() must inject the shared logic JS as a script tag."""
        from app import shooter_html
        html = shooter_html()
        self.assertIn('id="eduni-shooter-logic"', html)
        self.assertIn('EDUNIBubbleShooterLogic', html)
        self.assertIn('resolveShot', html)

    def test_generated_html_has_logic_before_inline(self) -> None:
        """Shared logic script must appear before the inline game script."""
        from app import shooter_html
        html = shooter_html()
        logic_pos = html.find('id="eduni-shooter-logic"')
        inline_pos = html.find('const L = window.EDUNIBubbleShooterLogic')
        self.assertGreater(logic_pos, -1, 'shared logic script tag not found')
        self.assertGreater(inline_pos, -1, 'inline L reference not found')
        self.assertLess(logic_pos, inline_pos, 'shared logic must load before inline script')

    def test_inline_runtime_uses_shared_resolve_shot(self) -> None:
        """Inline handleHit must call EDUNIBubbleShooterLogic.resolveShot."""
        src = self._app_source()
        self.assertIn('L.resolveShot', src)
        self.assertIn('L.selectTarget', src)
        self.assertIn('L.isDanger', src)
        self.assertIn('L.pointerToCss', src)

    def test_logic_module_not_duplicated(self) -> None:
        """The inline code must not duplicate shared decision logic; it delegates via L."""
        src = self._app_source()
        self.assertIn('L ? L.resolveShot', src)
        self.assertIn('L ? L.selectTarget', src)
        self.assertIn('L ? L.isDanger', src)
        self.assertIn('L ? L.pointerToCss', src)


class CanonicalDatasetTests(unittest.TestCase):
    """Phase 2: Verify canonical question dataset exists and is valid."""

    @classmethod
    def _app_source(cls) -> str:
        return APP_MODULE.read_text(encoding='utf-8')

    def test_canonical_file_exists(self) -> None:
        self.assertTrue(CANONICAL_DATA.exists(), f'Canonical data not found: {CANONICAL_DATA}')

    def test_canonical_schema_version(self) -> None:
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        self.assertEqual(data.get('schemaVersion'), 1)

    def test_canonical_questions_non_empty(self) -> None:
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        questions = data.get('questions', [])
        self.assertGreater(len(questions), 0, 'Canonical dataset has no questions')

    def test_canonical_entries_have_required_fields(self) -> None:
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        for q in data['questions']:
            self.assertTrue(q.get('hanja'), f'Missing hanja in entry: {q}')
            self.assertTrue(q.get('reading'), f'Missing reading in entry: {q}')

    def test_canonical_no_duplicate_hanja(self) -> None:
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        hanjas = [q['hanja'] for q in data['questions']]
        self.assertEqual(len(hanjas), len(set(hanjas)), 'Duplicate hanja found in canonical dataset')

    def test_rule_contract_file_exists(self) -> None:
        self.assertTrue(RULE_CONTRACT.exists(), f'Rule contract not found: {RULE_CONTRACT}')

    def test_rule_contract_has_cases(self) -> None:
        data = json.loads(RULE_CONTRACT.read_text(encoding='utf-8'))
        cases = data.get('cases', [])
        self.assertGreaterEqual(len(cases), 10, 'Rule contract needs at least 10 cases')

    def test_rule_contract_categories_covered(self) -> None:
        data = json.loads(RULE_CONTRACT.read_text(encoding='utf-8'))
        categories = {c['category'] for c in data['cases']}
        required = {'shot_resolution', 'danger', 'generation', 'target_selection'}
        self.assertTrue(required.issubset(categories), f'Missing categories: {required - categories}')

    def test_load_canonical_questions_function_exists(self) -> None:
        src = self._app_source()
        self.assertIn('def _load_canonical_questions()', src)

    def test_load_bubble_questions_uses_canonical(self) -> None:
        src = self._app_source()
        self.assertIn('canonical = _load_canonical_questions()', src)

    def test_served_html_contains_canonical_data(self) -> None:
        """The served Bubble Shooter page must contain data from the canonical source."""
        from app import shooter_html
        html = shooter_html()
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        first_q = data['questions'][0]
        self.assertIn(first_q['hanja'], html, 'First canonical hanja not found in served HTML')
        self.assertIn(first_q['reading'], html, 'First canonical reading not found in served HTML')


class DockerPackagingTests(unittest.TestCase):
    """Verify the Docker image packages canonical data at the expected container path."""

    def test_canonical_path_matches_container_layout(self) -> None:
        """app.py canonical path must resolve to /shared/... under Docker WORKDIR=/app."""
        src = APP_MODULE.read_text(encoding='utf-8')
        self.assertIn("Path(__file__).parent.parent / 'shared' / 'bubble_shooter_questions.json'",
                       src, 'Canonical path must resolve to /shared/ from /app/app.py')

    def test_dockerfile_packages_shared(self) -> None:
        """Dockerfile must COPY shared/ to /shared so the runtime path is valid."""
        dockerfile = Path(__file__).resolve().parent.parent / 'Dockerfile'
        content = dockerfile.read_text(encoding='utf-8')
        self.assertIn('COPY shared /shared', content,
                       'Dockerfile must contain COPY shared /shared')

    def test_canonical_json_exists_in_repo(self) -> None:
        """Canonical JSON must exist in the repository shared/ directory."""
        self.assertTrue(CANONICAL_DATA.exists(),
                        f'Canonical data not found: {CANONICAL_DATA}')

    def test_canonical_json_schema_version(self) -> None:
        """Canonical JSON must have schemaVersion = 1."""
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        self.assertEqual(data.get('schemaVersion'), 1, 'schemaVersion must be 1')

    def test_canonical_question_count(self) -> None:
        """Canonical JSON must contain exactly 122 questions."""
        data = json.loads(CANONICAL_DATA.read_text(encoding='utf-8'))
        self.assertEqual(len(data.get('questions', [])), 122,
                         'Canonical dataset must have 122 questions')

    def test_no_duplicate_canonical_source(self) -> None:
        """No second manually maintained canonical source should exist in nice-gui-1-1-7."""
        nice_dir = Path(__file__).resolve().parent.parent
        # Check there's no bubble_shooter_questions.json inside nice-gui-1-1-7 itself
        local_copy = nice_dir / 'bubble_shooter_questions.json'
        self.assertFalse(local_copy.exists(),
                         'Local copy of canonical data must not exist in nice-gui-1-1-7')


if __name__ == '__main__':
    unittest.main()
