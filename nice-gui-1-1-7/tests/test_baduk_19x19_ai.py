from pathlib import Path
import shutil
import subprocess
import unittest

from portal_app.baduk_v2_integration import integrate_v2_coach


APP_ROOT = Path(__file__).resolve().parents[1]
STATIC = APP_ROOT / "portal_app" / "static_games"
BADUK_V2_HTML = STATIC / "eduni_baduk_v2.html"
BADUK_COACH_LOGIC = STATIC / "eduni_baduk_coach_logic.js"
BADUK_AI_STRATEGY = STATIC / "eduni_baduk_ai_strategy.js"
BADUK_MODULE = APP_ROOT / "portal_app" / "baduk.py"
BADUK_AI_NODE_TEST = APP_ROOT / "tests" / "baduk_19x19_ai.test.mjs"


class Baduk19x19AiTests(unittest.TestCase):
    def _served_source(self) -> str:
        return integrate_v2_coach(
            BADUK_V2_HTML.read_text(encoding="utf-8"),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8"),
            BADUK_AI_STRATEGY.read_text(encoding="utf-8"),
        )

    def test_runtime_injects_shared_19x19_strategy(self) -> None:
        served = self._served_source()
        self.assertIn("root.EDUNIBadukAiStrategy", served)
        self.assertIn("EDUNIBadukAiStrategy.expandCandidates", served)
        self.assertIn("EDUNIBadukAiStrategy.scoreMove", served)
        self.assertIn("spread:strategic.spread", served)
        self.assertIn("opening:strategic.opening", served)

    def test_strategy_is_only_applied_to_19x19_runtime(self) -> None:
        served = self._served_source()
        self.assertIn("boardSize===19&&window.EDUNIBadukAiStrategy", served)
        self.assertIn("if(boardSize===19&&window.EDUNIBadukAiStrategy)", served)

    def test_baduk_route_loads_strategy_asset(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn('_BADUK_AI_STRATEGY_JS = "eduni_baduk_ai_strategy.js"', source)
        self.assertIn("strategy_path", source)
        self.assertIn("integrate_v2_coach(source, logic_script, strategy_script)", source)

    def test_19x19_strategy_node_regressions(self) -> None:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is not available")
        completed = subprocess.run(
            [node, "--test", str(BADUK_AI_NODE_TEST)],
            cwd=APP_ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(
            completed.returncode,
            0,
            msg=f"19x19 Baduk AI tests failed:\n{completed.stdout}\n{completed.stderr}",
        )
        self.assertIn("# fail 0", completed.stdout)
        self.assertIn("# tests 6", completed.stdout)


if __name__ == "__main__":
    unittest.main()
