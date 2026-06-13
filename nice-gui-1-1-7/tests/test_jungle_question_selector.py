from __future__ import annotations

import unittest

from portal_app.jungle_question_selector import BIRDS, load_jungle_questions, remember_question, select_question


class JungleQuestionSelectorTests(unittest.TestCase):
    def test_loads_required_subject_samples(self) -> None:
        questions = load_jungle_questions()
        subjects = {question["subject"] for question in questions}
        self.assertEqual(6, len(BIRDS))
        self.assertEqual(20, len(questions))
        self.assertEqual({"한자 7~6급", "구구단", "영어", "과학"}, subjects)
        for question in questions:
            self.assertEqual(3, len(question["choices"]))
            self.assertIn(question["answer"], question["choices"])
            self.assertTrue(question["hint"])

    def test_recent_questions_are_avoided_when_possible(self) -> None:
        questions = [
            {"id": "old", "subject": "영어", "difficulty": "basic", "prompt": "old", "choices": ["a", "b", "c"], "answer": "a", "hint": "h"},
            {"id": "new", "subject": "영어", "difficulty": "basic", "prompt": "new", "choices": ["a", "b", "c"], "answer": "a", "hint": "h"},
        ]
        selected = select_question(questions, "bird.sparrow", {"bird.sparrow": ["old"]})
        self.assertEqual("new", selected["id"])

    def test_recent_questions_fall_back_when_pool_is_small(self) -> None:
        questions = [
            {"id": "only", "subject": "과학", "difficulty": "basic", "prompt": "only", "choices": ["a", "b", "c"], "answer": "a", "hint": "h"}
        ]
        selected = select_question(questions, "bird.owl", {"bird.owl": ["only"]})
        self.assertEqual("only", selected["id"])

    def test_remember_question_keeps_session_history_short(self) -> None:
        history: dict[str, list[str]] = {}
        for index in range(12):
            remember_question(history, "bird.duck", f"q-{index}")
        self.assertEqual([f"q-{index}" for index in range(4, 12)], history["bird.duck"])


if __name__ == "__main__":
    unittest.main()
