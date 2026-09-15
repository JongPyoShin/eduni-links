from pathlib import Path
import shutil
import subprocess
import unittest


APP_ROOT = Path(__file__).resolve().parents[1]
PORTAL_APP = APP_ROOT / "portal_app"
BADUK_MODULE = PORTAL_APP / "baduk.py"
BADUK_HTML = PORTAL_APP / "static_games" / "eduni_baduk.html"
BADUK_COACH_LOGIC = PORTAL_APP / "static_games" / "eduni_baduk_coach_logic.js"
BADUK_COACH_UI = PORTAL_APP / "static_games" / "eduni_baduk_coach.js"
BADUK_COACH_NODE_TEST = APP_ROOT / "tests" / "baduk_coach_logic.test.mjs"


class BadukGameTests(unittest.TestCase):
    def test_baduk_route_extension_is_registered(self) -> None:
        package_source = (PORTAL_APP / "__init__.py").read_text(encoding="utf-8")
        route_source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("from . import baduk as _baduk", package_source)
        self.assertIn('@app.get("/baduk"', route_source)
        self.assertIn('@app.get("/baduk/"', route_source)
        self.assertIn('EDUNI_BADUK_URL = "/baduk"', route_source)

    def test_baduk_portal_card_is_injected_after_omok(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("routes.EDUNI_OMOK_URL", source)
        self.assertIn('"바둑"', source)
        self.assertIn('"AI 대국"', source)
        self.assertIn("EDUNI_BADUK_URL", source)
        self.assertIn("icon=icon, accent=accent", source)

    def test_baduk_static_game_contains_core_engine_and_controls(self) -> None:
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

    def test_baduk_beginner_coach_assets_and_runtime_hooks_exist(self) -> None:
        self.assertTrue(BADUK_COACH_LOGIC.exists())
        self.assertTrue(BADUK_COACH_UI.exists())
        module_source = BADUK_MODULE.read_text(encoding="utf-8")
        logic_source = BADUK_COACH_LOGIC.read_text(encoding="utf-8")
        ui_source = BADUK_COACH_UI.read_text(encoding="utf-8")

        for marker in (
            "_inject_beginner_coach",
            "move.aiAnalysis",
            "components:",
            "getState: coachState",
            "playHumanMove",
            "EDUNIBadukCoach?.isEnabled",
        ):
            self.assertIn(marker, module_source)

        for marker in (
            "analyzeMove",
            "strongestAiReason",
            "occupied",
            "suicide",
            "self_atari_risk",
            "capturedStones",
            "opponentAtariGroups",
            "rescuedOwnGroups",
            "connectedOwnGroups",
            "sourceUnchanged",
        ):
            self.assertIn(marker, logic_source)

        for marker in (
            "초보자 코치",
            "코치 ON",
            "여기에 두기",
            "baduk-coach-overlay",
            "baduk-coach-mini",
            "AI는 왜 여기에 뒀을까?",
            "이 수로 바뀐 점",
            "규칙상",
        ):
            self.assertIn(marker, ui_source)

    def test_baduk_coach_logic_node_regressions(self) -> None:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is not available")
        completed = subprocess.run(
            [node, "--test", str(BADUK_COACH_NODE_TEST)],
            cwd=APP_ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(
            completed.returncode,
            0,
            msg=f"Node coach regression tests failed:\n{completed.stdout}\n{completed.stderr}",
        )
        self.assertIn("# fail 0", completed.stdout)

    def test_baduk_has_no_external_runtime_dependency(self) -> None:
        sources = [
            BADUK_HTML.read_text(encoding="utf-8").lower(),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8").lower(),
            BADUK_COACH_UI.read_text(encoding="utf-8").lower(),
        ]
        joined = "\n".join(sources)
        self.assertNotIn("<script src=", joined)
        self.assertNotIn("https://", joined)
        self.assertNotIn("http://", joined)


if __name__ == "__main__":
    unittest.main()
