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
BADUK_AI_STRATEGY = STATIC / "eduni_baduk_ai_strategy.js"
BADUK_PERSISTENCE = STATIC / "eduni_baduk_persistence.js"
BADUK_MODULE = APP_ROOT / "portal_app" / "baduk.py"


class BadukV2IntegrationTests(unittest.TestCase):
    def _served_source(self) -> str:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        logic = BADUK_COACH_LOGIC.read_text(encoding="utf-8")
        strategy = BADUK_AI_STRATEGY.read_text(encoding="utf-8")
        persistence = BADUK_PERSISTENCE.read_text(encoding="utf-8")
        return integrate_v2_coach(source, logic, strategy, persistence)

    def test_served_v2_delegates_to_shared_tested_coach_logic(self) -> None:
        source = BADUK_V2_HTML.read_text(encoding="utf-8")
        served = self._served_source()

        self.assertNotEqual(served, source)
        self.assertIn("root.EDUNIBadukCoachLogic = {create};", served)
        self.assertIn("sharedCoachLogic().analyzeMove", served)
        self.assertIn("sharedCoachLogic().analyzeAiDanger", served)
        self.assertIn("sharedCoachLogic().suggestHint", served)
        self.assertIn("sharedCoachLogic().ruleGuide", served)
        self.assertIn("sharedCoachLogic().strongestAiReason", served)
        self.assertNotIn(
            "function analyzeMove(source,row,col,color,koState=null){const result=tryMove",
            served,
        )

    def test_ai_post_move_uses_shared_danger_analysis_exactly_once(self) -> None:
        served = self._served_source()

        needle = "const danger=analyzeAiDanger(beforeBoard,board,{row,col});"
        self.assertEqual(served.count(needle), 1)
        self.assertIn("AI는 왜 여기 뒀을까?", served)
        self.assertIn("숨 쉴 곳 1개", served)
        self.assertIn("source==='ai'&&aiMeta", served)

    def test_local_two_player_move_shows_observed_board_change_not_intent(self) -> None:
        served = self._served_source()

        self.assertIn("kind==='local'", served)
        self.assertIn("이 수로 바뀐 점", served)
        self.assertIn("mode==='local'&&source==='human'", served)
        self.assertIn("localMoveSummary(analysis)", served)
        self.assertIn("상대 돌 두 무리가 연결됐어요", served)
        self.assertNotIn("사람이 여기 둔 이유", served)

    def test_v2_integration_keeps_level_specific_coach_detail(self) -> None:
        served = self._served_source()

        self.assertIn("levelId==='intermediate'", served)
        self.assertIn("levelId==='standard'", served)
        self.assertIn("현재 활로", served)
        self.assertIn("상대 단수 그룹", served)

    def test_undo_button_and_decision_snapshots_are_wired(self) -> None:
        served = self._served_source()

        self.assertIn('id="undo"', served)
        self.assertIn("undo:undoMove", served)
        self.assertIn("recordUndoSnapshot(mode==='ai'?'decision':'action')", served)
        self.assertIn("undoHistory.length>240", served)
        self.assertIn("한 수 전으로 돌아왔어요. 다시 생각해 볼까요?", served)

    def test_contextual_hint_button_uses_shared_hint_logic(self) -> None:
        served = self._served_source()

        self.assertIn('id="hint" type="button">힌트</button>', served)
        self.assertIn("function showHint()", served)
        self.assertIn("const hint=suggestHint(board,currentPlayer,previousPosition)", served)
        self.assertIn("sharedCoachLogic().suggestHint", served)
        self.assertIn("노란 표시가 힌트 자리예요", served)
        self.assertIn("document.getElementById('hint').addEventListener('click',showHint)", served)

    def test_rule_guide_button_and_beginner_explanations_are_wired(self) -> None:
        served = self._served_source()

        self.assertIn('id="rulesHelp" type="button">규칙 보기</button>', served)
        self.assertIn("sharedCoachLogic().ruleGuide", served)
        self.assertIn("function toggleRulesHelp()", served)
        self.assertIn("📘 바둑 기본 규칙", served)
        self.assertIn("처음에는 숨 쉴 곳과 잡기 규칙만 기억해도 충분해요.", served)
        self.assertIn("document.getElementById('rulesHelp')?.addEventListener('click',toggleRulesHelp)", served)

    def test_ai_schedule_uses_generation_guard_and_pointer_self_heal(self) -> None:
        served = self._served_source()

        self.assertIn("const token=++aiGeneration", served)
        self.assertIn("if(token!==aiGeneration)return", served)
        self.assertIn("invalidateAi('undo')", served)
        self.assertIn("invalidateAi('reset')", served)
        self.assertIn("AI 차례가 이어지고 있어요. 곧 둘게요.", served)
        self.assertIn("scheduleAi();return}const p=pointFromEvent", served)

    def test_pass_participates_in_history_and_saves_restored_state(self) -> None:
        served = self._served_source()

        self.assertIn("if(source==='human')recordUndoSnapshot(mode==='ai'?'decision':'action')", served)
        self.assertIn("consecutivePasses=s.consecutivePasses", served)
        self.assertIn("saveCurrentGame();updateUndoButton();if(consecutivePasses>=2)", served)
        self.assertIn("saveCurrentGame();updateUndoButton();return true", served)

    def test_persistence_restore_invalidates_old_ai_and_does_not_restore_undo_history(self) -> None:
        served = self._served_source()

        self.assertIn("invalidateAi('restore');undoHistory=[];updateUndoButton();", served)
        self.assertIn("s.mode==='ai'&&s.currentPlayer===2", served)
        self.assertIn("scheduleAi()", served)
        self.assertIn("window.EDUNIBadukPersistence.save", served)

    def test_integrated_scripts_are_valid_javascript(self) -> None:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is not available")
        scripts = re.findall(r"<script>([\s\S]*?)</script>", self._served_source())
        self.assertGreaterEqual(len(scripts), 3)
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
        self.assertIn("source = integrate_v2_coach(source, logic_script, strategy_script, persistence_script)", module_source)


if __name__ == "__main__":
    unittest.main()