from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

from portal_app.baduk_v2_integration import integrate_v2_coach


APP_ROOT = Path(__file__).resolve().parents[1]
STATIC = APP_ROOT / "portal_app" / "static_games"
BADUK_V2_HTML = STATIC / "eduni_baduk_v2.html"
BADUK_COACH_LOGIC = STATIC / "eduni_baduk_coach_logic.js"
BADUK_MODULE = APP_ROOT / "portal_app" / "baduk.py"


class BadukV2IntegrationTests(unittest.TestCase):
    def _served_source(self) -> str:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        logic = BADUK_COACH_LOGIC.read_text(encoding="utf-8")
        return integrate_v2_coach(source, logic)

    def test_served_v2_delegates_to_shared_tested_coach_logic(self) -> None:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        served = self._served_source()

        self.assertNotEqual(served, source)
        self.assertIn("root.EDUNIBadukCoachLogic = {create};", served)
        self.assertIn("sharedCoachLogic().analyzeMove", served)
        self.assertIn("sharedCoachLogic().strongestAiReason", served)
        self.assertNotIn(
            "function analyzeMove(source,row,col,color,koState=null){const result=tryMove",
            served,
        )

    def test_local_two_player_move_shows_observed_board_change_not_intent(self) -> None:
        served = self._served_source()

        self.assertIn("kind==='local'", served)
        self.assertIn("이 수로 바뀐 점", served)
        self.assertIn("mode==='local'&&source==='human'", served)
        self.assertIn("localMoveSummary(analysis)", served)
        self.assertIn("이 수로 내 돌", served)
        self.assertIn("상대 돌 두 무리가 연결됐어요", served)
        self.assertNotIn("사람이 여기 둔 이유", served)

    def test_v2_integration_keeps_level_specific_coach_detail(self) -> None:
        served = self._served_source()

        self.assertIn("levelId==='intermediate'", served)
        self.assertIn("levelId==='standard'", served)
        self.assertIn("현재 활로", served)
        self.assertIn("상대 단수 그룹", served)

    def test_integrated_scripts_are_valid_javascript(self) -> None:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is not available")
        scripts = re.findall(r"<script>([\s\S]*?)</script>", self._served_source())
        self.assertGreaterEqual(len(scripts), 2)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write("\n".join(scripts))
            script_path = Path(handle.name)
        try:
            completed = subprocess.run(
                [node, "--check", str(script_path)],
                cwd=APP_ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(
                completed.returncode,
                0,
                msg=f"Integrated Baduk JavaScript syntax check failed:\n{completed.stdout}\n{completed.stderr}",
            )
        finally:
            script_path.unlink(missing_ok=True)

    def test_integration_fails_safe_when_source_markers_drift(self) -> None:
        source = "<html><body><script>console.log('changed')</script></body></html>"
        logic = BADUK_COACH_LOGIC.read_text(encoding="utf-8")
        self.assertEqual(integrate_v2_coach(source, logic), source)

    def test_baduk_route_uses_v2_integration_layer(self) -> None:
        module_source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("from .baduk_v2_integration import integrate_v2_coach", module_source)
        self.assertIn("source = integrate_v2_coach(source, logic_script)", module_source)


if __name__ == "__main__":
    unittest.main()
