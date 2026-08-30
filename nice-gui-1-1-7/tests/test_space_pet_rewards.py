from __future__ import annotations

import unittest

from portal_app.space_routes import _space_game_html


class SpacePetRewardsTests(unittest.TestCase):
    def served_html(self) -> str:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        return response.body.decode("utf-8")

    def test_pet_wallet_and_pet_house_are_visible(self) -> None:
        html = self.served_html()
        for marker in (
            'id="petBarBtn"',
            'id="pointBalance"',
            'id="petOverlay"',
            'id="petChoosePanel"',
            'data-pet-species="dog"',
            'data-pet-species="cat"',
            'data-pet-species="rabbit"',
            'id="petFeedBtn"',
            'id="petPlayBtn"',
            'id="petResultBtn"',
            "🐾 펫 돌보기",
        ):
            self.assertIn(marker, html)

    def test_points_are_local_only_and_have_expected_economy(self) -> None:
        html = self.served_html()
        for marker in (
            "const POINTS_KEY='eduniSpacePointsV1'",
            "const PET_KEY='eduniSpacePetV1'",
            "storage:'localStorage-only'",
            "firstTryPoints:10",
            "retryPoints:5",
            "feedCost:20",
            "playCost:30",
            "state.attempts===1 ? 10 : 5",
            "🍎 먹이 주기<br>20P",
            "🎾 같이 놀기<br>30P",
        ):
            self.assertIn(marker, html)

    def test_points_are_awarded_once_inside_correct_branch_only(self) -> None:
        html = self.served_html()
        start = html.index("function choose(key,button)")
        end = html.index("function nextQuestion()", start)
        choose = html[start:end]
        correct_branch = choose.index("if (key===state.question.correctKey)")
        award = choose.index("EDUNI_PET_REWARDS.award")
        first_wrong = choose.index("button.classList.add('wrong')")
        self.assertLess(correct_branch, award)
        self.assertLess(award, first_wrong)
        self.assertEqual(1, choose.count("EDUNI_PET_REWARDS.award"))
        self.assertIn("if (state.resolved || button.disabled) return", choose)

    def test_first_try_and_retry_feedback_show_earned_points(self) -> None:
        html = self.served_html()
        for marker in (
            "const pointText=earnedPoints ? ` · 🪙 +${earnedPoints}P` : ''",
            "정답! 한눈에 잘 찾았어! 🌟",
            "맞았어! 다시 생각해서 찾아냈네! 🌟",
        ):
            self.assertIn(marker, html)

    def test_pet_has_four_growth_stages(self) -> None:
        html = self.served_html()
        for marker in (
            "{min:0,next:3,label:'1단계 · 꼬물이'}",
            "{min:3,next:8,label:'2단계 · 아기 펫'}",
            "{min:8,next:15,label:'3단계 · 쑥쑥 크는 펫'}",
            "{min:15,next:null,label:'4단계 · 멋진 어른 펫'}",
            "pet.care+=config.care",
            "kind==='feed'",
            "cost:20,care:1",
            "cost:30,care:2",
        ):
            self.assertIn(marker, html)

    def test_each_run_resets_only_session_points_not_persistent_wallet(self) -> None:
        html = self.served_html()
        start = html.index("function startGame()")
        section = html[start : html.index("function loadQuestion()", start)]
        self.assertIn("EDUNI_PET_REWARDS?.startRun()", section)
        self.assertNotIn("localStorage.removeItem", section)
        self.assertIn("sessionPoints=0", html)
        self.assertIn("writePoints(readPoints()+earned)", html)

    def test_result_reports_points_earned_in_run(self) -> None:
        html = self.served_html()
        self.assertIn("window.EDUNI_PET_REWARDS?.runSummary()", html)
        self.assertIn("이번 탐험에서 🪙 ${sessionPoints}P를 모았어!", html)


if __name__ == "__main__":
    unittest.main()
