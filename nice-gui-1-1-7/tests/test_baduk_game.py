from pathlib import Path
import shutil
import subprocess
import unittest

from portal_app.baduk_v2_integration import integrate_v2_coach


APP_ROOT = Path(__file__).resolve().parents[1]
PORTAL_APP = APP_ROOT / "portal_app"
BADUK_MODULE = PORTAL_APP / "baduk.py"
BADUK_HTML = PORTAL_APP / "static_games" / "eduni_baduk.html"
BADUK_V2_HTML = PORTAL_APP / "static_games" / "eduni_baduk_v2.html"
BADUK_COACH_LOGIC = PORTAL_APP / "static_games" / "eduni_baduk_coach_logic.js"
BADUK_COACH_UI = PORTAL_APP / "static_games" / "eduni_baduk_coach.js"
BADUK_AI_STRATEGY = PORTAL_APP / "static_games" / "eduni_baduk_ai_strategy.js"
BADUK_PERSISTENCE = PORTAL_APP / "static_games" / "eduni_baduk_persistence.js"
BADUK_COACH_NODE_TEST = APP_ROOT / "tests" / "baduk_coach_logic.test.mjs"
BADUK_LEVEL_NODE_TEST = APP_ROOT / "tests" / "baduk_board_levels.test.mjs"


class BadukGameTests(unittest.TestCase):
    def _served_v2_source(self) -> str:
        return integrate_v2_coach(
            BADUK_V2_HTML.read_text(encoding="utf-8"),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8"),
            BADUK_AI_STRATEGY.read_text(encoding="utf-8"),
            BADUK_PERSISTENCE.read_text(encoding="utf-8"),
        )

    def test_baduk_route_extension_is_registered(self) -> None:
        package_source = (PORTAL_APP / "__init__.py").read_text(encoding="utf-8")
        route_source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("from . import baduk as _baduk", package_source)
        self.assertIn('@app.get("/baduk"', route_source)
        self.assertIn('@app.get("/baduk/"', route_source)
        self.assertIn('EDUNI_BADUK_URL = "/baduk"', route_source)
        self.assertIn('_BADUK_HTML = "eduni_baduk_v2.html"', route_source)

    def test_baduk_portal_card_is_injected_after_omok(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("routes.EDUNI_OMOK_URL", source)
        self.assertIn('"바둑"', source)
        self.assertIn('"AI 대국"', source)
        self.assertIn("EDUNI_BADUK_URL", source)
        self.assertIn("icon=icon, accent=accent", source)
        self.assertIn("9×9부터 19×19까지", source)

    def test_baduk_phase1_static_game_is_preserved_as_fallback(self) -> None:
        self.assertTrue(BADUK_HTML.exists())
        source = BADUK_HTML.read_text(encoding="utf-8")
        for marker in (
            "EDUNI 바둑",
            "const SIZE = 9",
            "function groupAt",
            "function tryMove",
            "function scoreBoard",
            "function aiPickMove",
            "previousPosition",
            "consecutivePasses",
            "자충수",
            "패 때문에",
            "window.EDUNIBadukEngine",
            'href="/portal"',
        ):
            self.assertIn(marker, source)

    def test_baduk_level_based_game_contains_three_board_presets(self) -> None:
        self.assertTrue(BADUK_V2_HTML.exists())
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        for marker in (
            "초급 · 9×9",
            "중급 · 13×13",
            "정규 · 19×19",
            "beginner:{id:'beginner'",
            "intermediate:{id:'intermediate'",
            "standard:{id:'standard'",
            "starPointsForSize",
            "boardSize",
            "aiCandidateMoves",
            "get SIZE(){return boardSize}",
            "setLevel:id=>",
            "실시간 바둑 코치",
            "AI는 왜 여기에 뒀을까?",
        ):
            self.assertIn(marker, source)
        self.assertNotIn("const SIZE = 9", source)

    def test_baduk_v2_shared_coach_runtime_and_legacy_fallback_assets_exist(self) -> None:
        # The legacy Phase-1 coach files remain as a fallback, while the active
        # level-based route is integrated through the shared v2 runtime.
        self.assertTrue(BADUK_COACH_LOGIC.exists())
        self.assertTrue(BADUK_COACH_UI.exists())
        module_source = BADUK_MODULE.read_text(encoding="utf-8")
        logic_source = BADUK_COACH_LOGIC.read_text(encoding="utf-8")
        served = self._served_v2_source()

        self.assertIn("from .baduk_v2_integration import integrate_v2_coach", module_source)
        self.assertIn(
            "integrate_v2_coach(source, logic_script, strategy_script, persistence_script)",
            module_source,
        )
        self.assertIn("def _inject_beginner_coach", module_source)

        for marker in (
            "analyzeMove",
            "analyzeAiDanger",
            "suggestHint",
            "ruleGuide",
            "strongestAiReason",
            "capturedStones",
            "opponentAtariGroups",
            "rescuedOwnGroups",
            "connectedOwnGroups",
            "sourceUnchanged",
        ):
            self.assertIn(marker, logic_source)

        for marker in (
            "sharedCoachLogic().analyzeMove",
            "sharedCoachLogic().analyzeAiDanger",
            "sharedCoachLogic().suggestHint",
            "sharedCoachLogic().ruleGuide",
            'id="undo"',
            'id="hint" type="button">힌트</button>',
            'id="rulesHelp" type="button">규칙 보기</button>',
            "const token=++aiGeneration",
            "undo:undoMove",
        ):
            self.assertIn(marker, served)

    def _run_node_test(self, test_path: Path) -> str:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is not available")
        completed = subprocess.run(
            [node, "--test", str(test_path)],
            cwd=APP_ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(
            completed.returncode,
            0,
            msg=f"Node Baduk regression tests failed:\n{completed.stdout}\n{completed.stderr}",
        )
        # TAP summary text differs across Node versions/terminals. The process
        # exit code is authoritative for `node --test`; avoid stale formatting
        # assertions such as `# fail 0`.
        self.assertNotIn("not ok", completed.stdout.lower())
        return completed.stdout

    def test_baduk_coach_logic_node_regressions(self) -> None:
        self._run_node_test(BADUK_COACH_NODE_TEST)

    def test_baduk_board_level_node_regressions(self) -> None:
        self._run_node_test(BADUK_LEVEL_NODE_TEST)

    def test_baduk_has_no_external_runtime_dependency(self) -> None:
        sources = [
            BADUK_HTML.read_text(encoding="utf-8").lower(),
            BADUK_V2_HTML.read_text(encoding="utf-8").lower(),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8").lower(),
            BADUK_COACH_UI.read_text(encoding="utf-8").lower(),
        ]
        joined = "\n".join(sources)
        self.assertNotIn("<script src=", joined)
        self.assertNotIn("https://", joined)
        self.assertNotIn("http://", joined)


if __name__ == "__main__":
    unittest.main()
