from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

from portal_app.baduk_endgame_safety import integrate_endgame_safety
from portal_app.baduk_v2_integration import integrate_v2_coach


APP_ROOT = Path(__file__).resolve().parents[1]
STATIC = APP_ROOT / "portal_app" / "static_games"
BADUK_V2_HTML = STATIC / "eduni_baduk_v2.html"
BADUK_COACH_LOGIC = STATIC / "eduni_baduk_coach_logic.js"
BADUK_AI_STRATEGY = STATIC / "eduni_baduk_ai_strategy.js"
BADUK_PERSISTENCE = STATIC / "eduni_baduk_persistence.js"
BADUK_MODULE = APP_ROOT / "portal_app" / "baduk.py"


class BadukEndgameSafetyTests(unittest.TestCase):
    def _integrated(self) -> str:
        source = integrate_v2_coach(
            BADUK_V2_HTML.read_text(encoding="utf-8"),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8"),
            BADUK_AI_STRATEGY.read_text(encoding="utf-8"),
            BADUK_PERSISTENCE.read_text(encoding="utf-8"),
        )
        return integrate_endgame_safety(source)

    def test_route_applies_endgame_safety_after_v2_integration(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("from .baduk_endgame_safety import integrate_endgame_safety", source)
        self.assertIn("source = integrate_endgame_safety(source)", source)

    def test_served_runtime_has_conservative_ai_resignation_path(self) -> None:
        served = self._integrated()
        self.assertIn("let undoHistory=[],aiGeneration=0,aiTimer=null,ruleGuidePanel=null,aiForcedPasses=0;", served)
        self.assertIn("function assessAiNoMove(source)", served)
        self.assertIn("aiForcedPasses>=2", served)
        self.assertIn("maxComebackSwing", served)
        self.assertIn("function finishAiResignation(info)", served)
        self.assertIn("AI 기권 — 흑 승!", served)
        self.assertIn("if(endgame.resign){finishAiResignation(endgame);return}", served)
        self.assertIn("aiForcedPasses=0;playMove", served)

    def test_forced_ai_pass_explains_why_and_warns_about_large_group(self) -> None:
        served = self._integrated()
        self.assertIn("passTurn(source='human',messageOverride=null)", served)
        self.assertIn("AI는 지금 규칙상 둘 수 있는 자리가 없어서 한 수 쉬었어요", served)
        self.assertIn("내 영역을 계속 메우면 한꺼번에 잡힐 수 있어요", served)
        self.assertIn("passTurn('ai',endgame.passMessage)", served)

    def test_large_self_atari_reports_exact_connected_group_size(self) -> None:
        served = self._integrated()
        self.assertIn("const ownGroupSizeAfter=", served)
        self.assertIn("largeSelfAtariRisk", served)
        self.assertIn("연결된 내 돌 ${ownGroupSizeAfter}개의 숨 쉴 곳이 1개만 남아요", served)
        self.assertIn("${ownGroupSizeAfter}개가 한꺼번에 잡힐 수 있어요", served)
        self.assertIn("🚨 큰 돌무리가 위험해요", served)

    def test_coach_off_still_requires_confirmation_for_mass_self_atari(self) -> None:
        served = self._integrated()
        self.assertIn("if(risk.legal&&risk.largeSelfAtariRisk)", served)
        self.assertIn("showCoach(preview,'preview')", served)
        self.assertIn("그래도 두려면 설명을 보고 '여기에 두기'를 눌러 주세요", served)

    def test_rules_explain_not_to_fill_own_territory(self) -> None:
        served = self._integrated()
        self.assertIn("내 집은 끝까지 메우지 않아도 돼요", served)
        self.assertIn("둘 곳이 없으면 한 수 쉬기를 눌러도 돼요", served)

    def test_ai_forced_pass_state_resets_on_undo_restore_and_reset(self) -> None:
        served = self._integrated()
        self.assertIn("invalidateAi('undo');aiForcedPasses=0;board=cloneBoard(s.board)", served)
        self.assertIn("invalidateAi('restore');aiForcedPasses=0;undoHistory=[]", served)
        self.assertIn("invalidateAi('reset');aiForcedPasses=0;undoHistory=[]", served)

    def test_endgame_patch_fails_safe_if_required_marker_drifts(self) -> None:
        integrated = integrate_v2_coach(
            BADUK_V2_HTML.read_text(encoding="utf-8"),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8"),
            BADUK_AI_STRATEGY.read_text(encoding="utf-8"),
            BADUK_PERSISTENCE.read_text(encoding="utf-8"),
        )
        drifted = integrated.replace("function badukRuleGuide()", "function changedRuleGuide()", 1)
        self.assertEqual(integrate_endgame_safety(drifted), drifted)

    def test_final_integrated_javascript_is_syntax_valid(self) -> None:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is not available")
        scripts = re.findall(r"<script>([\s\S]*?)</script>", self._integrated())
        self.assertGreaterEqual(len(scripts), 3)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write("\n".join(scripts))
            path = Path(handle.name)
        try:
            completed = subprocess.run(
                [node, "--check", str(path)],
                cwd=APP_ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(
                completed.returncode,
                0,
                msg=f"Endgame safety integrated JavaScript syntax failed:\n{completed.stdout}\n{completed.stderr}",
            )
        finally:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
