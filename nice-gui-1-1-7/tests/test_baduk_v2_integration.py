from pathlib import Path
import unittest

from portal_app.baduk_v2_integration import integrate_v2_coach


APP_ROOT = Path(__file__).resolve().parents[1]
STATIC = APP_ROOT / "portal_app" / "static_games"
BADUK_V2_HTML = STATIC / "eduni_baduk_v2.html"
BADUK_COACH_LOGIC = STATIC / "eduni_baduk_coach_logic.js"
BADUK_MODULE = APP_ROOT / "portal_app" / "baduk.py"


class BadukV2IntegrationTests(unittest.TestCase):
    def test_served_v2_delegates_to_shared_tested_coach_logic(self) -> None:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        logic = BADUK_COACH_LOGIC.read_text(encoding="utf-8")

        served = integrate_v2_coach(source, logic)

        self.assertNotEqual(served, source)
        self.assertIn("root.EDUNIBadukCoachLogic = {create};", served)
        self.assertIn("sharedCoachLogic().analyzeMove", served)
        self.assertIn("sharedCoachLogic().strongestAiReason", served)
        self.assertNotIn(
            "function analyzeMove(source,row,col,color,koState=null){const result=tryMove",
            served,
        )

    def test_local_two_player_move_shows_observed_board_change_not_intent(self) -> None:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        logic = BADUK_COACH_LOGIC.read_text(encoding="utf-8")

        served = integrate_v2_coach(source, logic)

        self.assertIn("kind==='local'", served)
        self.assertIn("이 수로 바뀐 점", served)
        self.assertIn("mode==='local'&&source==='human'", served)
        self.assertIn("localMoveSummary(analysis)", served)
        self.assertIn("이 수로 내 돌", served)
        self.assertIn("상대 돌 두 무리가 연결됐어요", served)
        self.assertNotIn("사람이 여기 둔 이유", served)

    def test_v2_integration_keeps_level_specific_coach_detail(self) -> None:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        logic = BADUK_COACH_LOGIC.read_text(encoding="utf-8")

        served = integrate_v2_coach(source, logic)

        self.assertIn("levelId==='intermediate'", served)
        self.assertIn("levelId==='standard'", served)
        self.assertIn("현재 활로", served)
        self.assertIn("상대 단수 그룹", served)

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
