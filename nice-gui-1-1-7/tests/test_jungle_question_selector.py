from __future__ import annotations

import sys
import unittest
from types import SimpleNamespace

from portal_app.jungle_question_selector import BIRDS, load_jungle_birds, load_jungle_questions, remember_question, select_question


class ClassList:
    def __init__(self, owner):
        self.owner = owner
        self.values = set()

    def __call__(self, value=None, add=None, remove=None):
        if value:
            self.values.update(str(value).split())
        if remove:
            for cls in str(remove).split():
                self.values.discard(cls)
        if add:
            self.values.update(str(add).split())
        return self.owner


class FakeElement:
    def __init__(self, kind, text="", on_click=None):
        self.kind = kind
        self.text = text
        self.label = text
        self.on_click = on_click
        self.visible = True
        self.children = []
        self.classes = ClassList(self)

    def props(self, _value):
        return self

    def set_text(self, text):
        self.text = text
        self.label = text
        return self

    def set_visibility(self, visible):
        self.visible = visible
        return self

    def clear(self):
        self.children.clear()
        return self

    def __enter__(self):
        fake_ui.contexts.append(self)
        return self

    def __exit__(self, *_args):
        fake_ui.contexts.pop()
        return False


class FakeUI:
    def __init__(self):
        self.created = []
        self.contexts = []

    def _add(self, element):
        self.created.append(element)
        if self.contexts:
            self.contexts[-1].children.append(element)
        return element

    def add_head_html(self, _html):
        return None

    def element(self, tag):
        return self._add(FakeElement(tag))

    def label(self, text=""):
        return self._add(FakeElement("label", text))

    def button(self, text, on_click=None):
        return self._add(FakeElement("button", text, on_click))

    def row(self):
        return self._add(FakeElement("row"))


fake_ui = FakeUI()


class JungleQuestionSelectorTests(unittest.TestCase):
    def test_loads_bird_catalog_with_rarity(self) -> None:
        birds = load_jungle_birds()
        self.assertEqual(13, len(birds))
        self.assertEqual(13, len(BIRDS))
        rarity_counts = {rarity: 0 for rarity in {"common", "rare", "legendary"}}
        for bird in birds:
            rarity_counts[bird["rarity"]] += 1
            self.assertTrue(bird["id"])
            self.assertTrue(bird["emoji"])
            self.assertTrue(bird["name"])
            self.assertTrue(bird["rarity_label"])
            self.assertTrue(bird["stars"])
            self.assertTrue(bird["description"])
            self.assertTrue(bird["asset_key"])
        self.assertEqual({"common": 5, "rare": 5, "legendary": 3}, rarity_counts)

    def test_loads_required_subject_samples(self) -> None:
        questions = load_jungle_questions()
        subjects = {question["subject"] for question in questions}
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
        selected = select_question(questions, "legend.starlight_owl", {"legend.starlight_owl": ["only"]})
        self.assertEqual("only", selected["id"])

    def test_remember_question_keeps_session_history_short(self) -> None:
        history: dict[str, list[str]] = {}
        for index in range(12):
            remember_question(history, "bird.duck", f"q-{index}")
        self.assertEqual([f"q-{index}" for index in range(4, 12)], history["bird.duck"])

    def test_jungle_correct_answer_is_counted_once_and_cargo_groups_persisted_duplicates(self) -> None:
        fake_ui.created.clear()
        fake_ui.contexts.clear()
        sys.modules["nicegui"] = SimpleNamespace(ui=fake_ui)

        import portal_app.jungle_expedition as jungle_expedition

        pigeon = dict(BIRDS[2])
        question = {
            "id": "test-q",
            "subject": "영어",
            "difficulty": "basic",
            "prompt": "bird의 뜻은?",
            "choices": ["새", "물고기", "고양이"],
            "answer": "새",
            "hint": "정글에서 찾는 동물이야.",
        }
        captures: list[dict[str, object]] = []

        def fake_record_capture(bird_info, _question):
            captures.append(dict(bird_info))
            return len(captures)

        def fake_count_total_captures():
            return len(captures)

        def fake_load_collection():
            if not captures:
                return []
            return [{
                "bird_id": pigeon["id"],
                "emoji": pigeon["emoji"],
                "bird_name": pigeon["name"],
                "rarity": pigeon["rarity"],
                "rarity_label": pigeon["rarity_label"],
                "stars": pigeon["stars"],
                "capture_count": len(captures),
            }]

        jungle_expedition.choose_bird = lambda: dict(pigeon)
        jungle_expedition.load_jungle_questions = lambda: [question]
        jungle_expedition.select_question = lambda _questions, _bird_id, _recent: dict(question)
        jungle_expedition.record_capture = fake_record_capture
        jungle_expedition.count_total_captures = fake_count_total_captures
        jungle_expedition.load_collection = fake_load_collection
        jungle_expedition.render_jungle_expedition()

        def visible_buttons(label):
            return [element for element in fake_ui.created if element.kind == "button" and element.visible and element.label == label]

        def click(label):
            matches = visible_buttons(label)
            self.assertTrue(matches, f"missing visible button: {label}")
            matches[-1].on_click()

        def visible_texts():
            return [element.text for element in fake_ui.created if element.visible and element.text]

        click("전진")
        bird = [element for element in fake_ui.created if "bird" in element.classes.values][-1]
        bird.on_click()
        click("새")
        click("새")
        self.assertTrue(any("전체 1마리" in text for text in visible_texts()))
        self.assertTrue(any("흔한 새" in text for text in visible_texts()))
        self.assertFalse(any("전체 2마리" in text for text in visible_texts()))

        click("탐험 계속")
        bird.on_click()
        click("물고기")
        self.assertTrue(any("아직 아니야" in text for text in visible_texts()))
        click("새")
        self.assertTrue(any("전체 2마리" in text for text in visible_texts()))

        click("탐험 계속")
        bird.on_click()
        click("새")
        self.assertTrue(any("전체 3마리" in text for text in visible_texts()))

        click("짐칸")
        cargo_texts = visible_texts()
        self.assertTrue(any("저장된 수집 수: 3마리 · 종류: 1종" in text for text in cargo_texts))
        self.assertTrue(any("비둘기 ★ x 3개" in text for text in cargo_texts))
        self.assertFalse(any("비둘기 ★, 🕊️ 비둘기 ★" in text for text in cargo_texts))

        click("닫기")
        self.assertTrue(any("전진 중" in text for text in visible_texts()))


if __name__ == "__main__":
    unittest.main()
