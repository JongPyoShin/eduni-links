from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.database import connect_database, default_child_profile_id
from portal_app.thinking_pilot import (
    PILOT_VERSION, PILOT_IDS, PLAY_ISSUES, WATER_PARTS,
    pilot_stage, scene_hit, scene_content, update_choice_highlight,
)
from portal_app.thinking_expanded import CONTENT, VISUAL_IDS, VERSION, visual_key, stage_for, simulate, scene_svg
from portal_app.thinking_lab import (
    ProgressConflict,
    load_thinking_missions,
    read_progress,
    recent_thinking_progress,
    thinking_overview,
    CATEGORY_TILES,
    save_choice,
)


class ThinkingLabTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = Path(self.tmp.name) / "thinking.sqlite3"
        self.missions = load_thinking_missions()

    def test_curriculum_has_sixteen_valid_missions_in_eight_categories(self) -> None:
        self.assertEqual(16, len(self.missions))
        self.assertEqual(8, len({item["category"] for item in self.missions.values()}))
        self.assertTrue({"paper_bridge", "playground"}.issubset(self.missions))
        for mission in self.missions.values():
            self.assertEqual(
                ["발견", "정의", "대안", "실험", "성찰"],
                [step["label"] for step in mission["steps"]],
            )
            self.assertTrue(mission["offline_task"])

    def test_catalog_covers_playable_and_backlog_with_source_rights(self) -> None:
        catalog_path = Path(__file__).resolve().parents[1] / "content" / "thinking_catalog.json"
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        self.assertEqual(8, len(catalog["categories"]))
        self.assertEqual(32, len(catalog["items"]))
        self.assertEqual(16, len(catalog["sources"]))
        sources = {source["id"] for source in catalog["sources"]}
        labels = {category["label"] for category in catalog["categories"]}
        self.assertEqual(len(sources), len(catalog["sources"]))
        self.assertTrue(all(source["url"].startswith("https://") for source in catalog["sources"]))
        self.assertTrue(all(source["rights"] and source["terms_url"] for source in catalog["sources"]))
        playable = [item for item in catalog["items"] if item["status"] == "playable"]
        backlog = [item for item in catalog["items"] if item["status"] == "idea_backlog"]
        self.assertEqual(16, len(playable))
        self.assertEqual(16, len(backlog))
        self.assertEqual(set(self.missions), {item["id"] for item in playable})
        self.assertEqual(32, len({item["id"] for item in catalog["items"]}))
        for item in catalog["items"]:
            self.assertIn(item["category"], labels)
            self.assertTrue(item["source_ids"])
            self.assertTrue(set(item["source_ids"]).issubset(sources))
            self.assertEqual((item["age_min"], item["age_max"]), (7, 9))
        for item in playable:
            self.assertEqual(item["category"], self.missions[item["id"]]["category"])

    def test_reject_invalid_and_duplicate_content(self) -> None:
        payload = list(self.missions.values())
        test_file = Path(self.tmp.name) / "missions.json"
        test_file.write_text(json.dumps(payload + [payload[0]], ensure_ascii=False), encoding="utf-8")
        with self.assertRaises(ValueError):
            load_thinking_missions(test_file)
        altered = [dict(payload[0])]
        altered[0]["steps"] = payload[0]["steps"][:-1]
        test_file.write_text(json.dumps(altered, ensure_ascii=False), encoding="utf-8")
        with self.assertRaises(ValueError):
            load_thinking_missions(test_file)

    def test_reopen_then_finish_without_losing_choices(self) -> None:
        before = read_progress("paper_bridge", path=self.db)
        self.assertEqual(0, before["step_index"])
        state = save_choice("paper_bridge", 0, 1, 0, path=self.db)
        self.assertEqual(1, state["step_index"])
        self.assertEqual({"0": 1}, read_progress("paper_bridge", path=self.db)["answers"])
        for step in range(1, 5):
            state = save_choice(
                "paper_bridge", step, 0, state["revision"], path=self.db
            )
        self.assertTrue(state["completed"])
        self.assertEqual(5, state["step_index"])
        self.assertEqual(5, len(state["answers"]))
        self.assertTrue(read_progress("paper_bridge", path=self.db)["completed"])
        with self.assertRaises(ProgressConflict):
            save_choice("paper_bridge", 4, 0, 4, path=self.db)

    def test_stale_tab_cannot_overwrite_saved_step(self) -> None:
        old = read_progress("playground", path=self.db)
        save_choice("playground", 0, 1, old["revision"], path=self.db)
        with self.assertRaises(ProgressConflict):
            save_choice("playground", 0, 0, old["revision"], path=self.db)
        self.assertEqual(1, read_progress("playground", path=self.db)["answers"]["0"])

    def test_selected_option_has_visible_box_and_reselection_clears_previous(self) -> None:
        class FakeButton:
            def __init__(self) -> None:
                self.text = ""
                self.properties = {}
                self.styles = {}

            def set_text(self, value: str) -> None:
                self.text = value

            def props(self, add: str = "", remove: str = "") -> None:
                self.properties = {"add": add, "remove": remove}

            def style(self, add: str = "") -> None:
                self.styles = {"add": add}

        labels = ["첫 번째", "두 번째", "세 번째"]
        buttons = [FakeButton() for _ in labels]
        update_choice_highlight(buttons, labels, 1)
        self.assertEqual("✓ 두 번째", buttons[1].text)
        self.assertIn("unelevated", buttons[1].properties["add"])
        self.assertIn("aria-pressed=true", buttons[1].properties["add"])
        self.assertIn("3px solid", buttons[1].styles["add"])
        self.assertEqual("첫 번째", buttons[0].text)
        self.assertIn("outline", buttons[0].properties["add"])

        update_choice_highlight(buttons, labels, 0)
        self.assertEqual("✓ 첫 번째", buttons[0].text)
        self.assertIn("aria-pressed=true", buttons[0].properties["add"])
        self.assertEqual("두 번째", buttons[1].text)
        self.assertIn("aria-pressed=false", buttons[1].properties["add"])
        self.assertIn("2px solid", buttons[1].styles["add"])
        with self.assertRaises(ValueError):
            update_choice_highlight(buttons, labels, 3)

    def test_two_pilot_scenes_support_touch_and_fallback_choices(self) -> None:
        self.assertEqual({"playground", "water_absorb"}, set(PILOT_IDS))
        self.assertIn("circle", scene_content("playground", 0))
        self.assertIn("rect", scene_content("water_absorb", 1))
        for mission, coords in (
            ("playground", ((140, 224), (445, 150), (623, 220))),
            ("water_absorb", ((210, 194), (505, 137), (629, 220))),
        ):
            for index, (x, y) in enumerate(coords):
                self.assertEqual(index, scene_hit(mission, x, y))
            self.assertIsNone(scene_hit(mission, 5, 5))

    def test_playground_issue_keeps_goal_and_solution_in_same_context(self) -> None:
        for issue_id, issue in enumerate(PLAY_ISSUES):
            answers = {}
            first = pilot_stage("playground", 0, answers)
            self.assertEqual(3, len(first["options"]))
            answers.update({"0": issue_id, "_pilot_v": PILOT_VERSION})
            goal = pilot_stage("playground", 1, answers)
            self.assertEqual(list(issue["goals"]), goal["options"])
            for goal_id, goal_name in enumerate(issue["goals"]):
                answers["1"] = goal_id
                solution = pilot_stage("playground", 2, answers)
                self.assertIn(issue["name"], solution["context"])
                self.assertIn(goal_name, solution["context"])
                self.assertEqual(list(issue["solutions"]), solution["options"])
                for method_id, method_name in enumerate(issue["solutions"]):
                    answers["2"] = method_id
                    observed = pilot_stage("playground", 3, answers)
                    self.assertEqual(
                        list(issue["results_by_goal"][goal_id]), observed["options"]
                    )
                    self.assertIn(method_name, observed["context"])
                    for result_id in range(3):
                        answers["3"] = result_id
                        reflected = pilot_stage("playground", 4, answers)
                        self.assertIn(
                            issue["results_by_goal"][goal_id][result_id],
                            reflected["context"],
                        )

    def test_water_predict_observe_reflect_consistently_for_each_pair(self) -> None:
        for pair_id, (a, b) in enumerate(WATER_PARTS):
            answers = {"0": 0, "1": pair_id, "_pilot_v": PILOT_VERSION}
            stage = pilot_stage("water_absorb", 2, answers)
            self.assertIn("수건" if a == "천수건" else "종이 타월" if a == "종이타월" else a, stage["options"][0])
            self.assertIn("수건" if b == "천수건" else "종이 타월" if b == "종이타월" else b, stage["options"][1])
            for prediction in range(3):
                for observed in range(3):
                    answers["2"] = prediction
                    experiment = pilot_stage("water_absorb", 3, answers)
                    self.assertEqual(3, len(experiment["options"]))
                    answers["3"] = observed
                    reflection = pilot_stage("water_absorb", 4, answers)
                    self.assertIn("예상", reflection["context"])
                    self.assertIn("관찰", reflection["context"])
                    self.assertEqual(3, len(reflection["options"]))

    def test_pilot_needs_confirmed_real_activity_and_resumes_after_reopen(self) -> None:
        for mission_id in sorted(PILOT_IDS):
            with self.subTest(mission=mission_id):
                state = read_progress(mission_id, path=self.db)
                for step in range(3):
                    state = save_choice(
                        mission_id, step, 0, state["revision"], path=self.db,
                    )
                self.assertEqual(PILOT_VERSION, state["answers"]["_pilot_v"])
                with self.assertRaises(ValueError):
                    save_choice(mission_id, 3, 0, state["revision"], path=self.db)
                self.assertEqual(3, read_progress(mission_id, path=self.db)["step_index"])
                state = save_choice(
                    mission_id, 3, 1, state["revision"],
                    path=self.db, pilot_verified=True,
                )
                self.assertEqual(
                    "family_roleplay" if mission_id == "playground" else "hands_on_observation",
                    state["answers"]["_activity_confirmed"],
                )
                resumed = read_progress(mission_id, path=self.db)
                self.assertEqual(4, resumed["step_index"])
                with self.assertRaises(ProgressConflict):
                    save_choice(mission_id, 3, 0, 3, path=self.db, pilot_verified=True)
                state = save_choice(mission_id, 4, 2, resumed["revision"], path=self.db)
                self.assertTrue(state["completed"])
                self.assertTrue(read_progress(mission_id, path=self.db)["completed"])

    def test_previous_format_is_not_silently_reinterpreted(self) -> None:
        current = read_progress("playground", path=self.db)
        self.assertEqual(0, current["step_index"])
        with self.assertRaises(ValueError):
            pilot_stage("playground", 1, {"0": 0})
        # Old progress remains stored and visible; no automatic destructive rewrite.
        from portal_app.thinking_lab import init_thinking_storage
        init_thinking_storage(self.db)
        conn = connect_database(self.db)
        try:
            child = default_child_profile_id(self.db)
            conn.execute(
                """INSERT INTO thinking_mission_progress
                (child_profile_id, mission_id, step_index, answers_json, completed, revision, updated_at)
                VALUES (?, 'playground', 1, ?, 0, 1, ?)""",
                (child, json.dumps({"0": 2}), "2026-11-23T00:00:00+00:00"),
            )
            conn.commit()
        finally:
            conn.close()
        with self.assertRaises(ProgressConflict):
            save_choice("playground", 1, 0, 1, path=self.db)
        self.assertEqual({"0": 2}, read_progress("playground", path=self.db)["answers"])

    def test_visual_catalog_all_fourteen_and_all_paths(self) -> None:
        self.assertEqual(set(self.missions) - set(PILOT_IDS), set(VISUAL_IDS))
        self.assertEqual(14, len(VISUAL_IDS))
        for mid in VISUAL_IDS:
            self.assertIn("<rect", scene_svg(mid))
            for look in range(3):
                for method in range(3):
                    for prediction in range(3):
                        for observed in range(3):
                            answers = {"_visual_v": VERSION, "0": look, "1": method, "2": prediction, "3": observed}
                            stages = [stage_for(mid, step, answers) for step in range(5)]
                            self.assertTrue(all(len(stage["options"]) == 3 for stage in stages))
                            self.assertIn(CONTENT[mid]["goal"], stages[2]["context"])
                            self.assertIn(CONTENT[mid]["methods"][method][1], stages[3]["offline"])
                            self.assertIn(stages[3]["options"][observed], stages[4]["context"])
                            self.assertIn(CONTENT[mid]["look"][look], stages[1]["context"])

    def test_visual_screen_results_and_isolated_legacy_records(self) -> None:
        for mid, expected in (("sorting_cards", [1,0,0]), ("route_debug", [0,1,1]), ("fair_share", [1,0,1])):
            self.assertEqual(expected, [simulate(mid, i)["outcome"] for i in range(3)])
        for mid in VISUAL_IDS:
            old = save_choice(mid, 0, 0, 0, path=self.db)
            state = read_progress(visual_key(mid), path=self.db)
            for step in range(3):
                state = save_choice(mid, step, 0, state["revision"], path=self.db, visual=True)
            with self.assertRaises(ValueError):
                save_choice(mid, 3, 0, state["revision"], path=self.db, visual=True)
            index = simulate(mid, 0)["outcome"] if CONTENT[mid].get("screen") else 0
            if CONTENT[mid].get("screen"):
                with self.assertRaises(ValueError):
                    save_choice(mid, 3, 1-index, state["revision"], path=self.db, visual=True, pilot_verified=True)
            state = save_choice(mid, 3, index, state["revision"], path=self.db, visual=True, pilot_verified=True)
            self.assertEqual(4, read_progress(visual_key(mid), path=self.db)["step_index"])
            with self.assertRaises(ProgressConflict):
                save_choice(mid, 3, index, state["revision"]-1, path=self.db, visual=True, pilot_verified=True)
            state = save_choice(mid, 4, 0, state["revision"], path=self.db, visual=True)
            self.assertTrue(state["completed"])
            self.assertEqual(old, read_progress(mid, path=self.db))

    def test_review_unchanged_keeps_completion_and_revision_all_render_types(self) -> None:
        for mid, visual in (("paper_bridge", False), ("playground", False), ("route_debug", True)):
            key = visual_key(mid) if visual else mid
            state = read_progress(key, path=self.db)
            for step in range(5):
                option = simulate(mid, 0)["outcome"] if visual and step == 3 else 0
                state = save_choice(mid, step, option, state["revision"], path=self.db,
                                    visual=visual, pilot_verified=step == 3)
            self.assertTrue(state["completed"])
            for step in range(5):
                same = save_choice(mid, step, state["answers"][str(step)], state["revision"],
                                   path=self.db, visual=visual, pilot_verified=step == 3, allow_edit=True)
                self.assertEqual(state, same)
            self.assertEqual(state, read_progress(key, path=self.db))

    def test_review_changed_clears_only_suffix_and_observation_all_render_types(self) -> None:
        for mid, visual in (("paper_bridge", False), ("water_absorb", False), ("route_debug", True)):
            key = visual_key(mid) if visual else mid
            state = read_progress(key, path=self.db)
            for step in range(5):
                option = simulate(mid, 0)["outcome"] if visual and step == 3 else 0
                state = save_choice(mid, step, option, state["revision"], path=self.db,
                                    visual=visual, pilot_verified=step == 3)
            with self.assertRaises(ProgressConflict):
                save_choice(mid, 1, 1, state["revision"], path=self.db, visual=visual)
            edited = save_choice(mid, 1, 1, state["revision"], path=self.db, visual=visual, allow_edit=True)
            self.assertEqual({"0": 0, "1": 1}, {k: v for k, v in edited["answers"].items() if k.isdecimal()})
            self.assertEqual(2, edited["step_index"])
            self.assertFalse(edited["completed"])
            self.assertNotIn("_activity_confirmed", edited["answers"])
            self.assertEqual(state["revision"] + 1, edited["revision"])
            with self.assertRaises(ProgressConflict):
                save_choice(mid, 0, 2, state["revision"], path=self.db, visual=visual, allow_edit=True)
            self.assertEqual(edited, read_progress(key, path=self.db))
            predicted = save_choice(mid, 2, 0, edited["revision"], path=self.db, visual=visual)
            if mid in PILOT_IDS or visual:
                with self.assertRaises(ValueError):
                    save_choice(mid, 3, 0, predicted["revision"], path=self.db, visual=visual)
            result = simulate(mid, 1)["outcome"] if visual else 0
            observed = save_choice(mid, 3, result, predicted["revision"], path=self.db,
                                   visual=visual, pilot_verified=True)
            completed = save_choice(mid, 4, 0, observed["revision"], path=self.db, visual=visual)
            changed_final = save_choice(mid, 4, 1, completed["revision"], path=self.db,
                                        visual=visual, allow_edit=True)
            self.assertTrue(changed_final["completed"])
            self.assertEqual(completed["answers"].get("_activity_confirmed"), changed_final["answers"].get("_activity_confirmed"))

    def test_review_legacy_pilot_blocks_reinterpretation_at_first_step(self) -> None:
        read_progress("playground", path=self.db)
        conn = connect_database(self.db)
        try:
            child = default_child_profile_id(self.db)
            conn.execute(
                """INSERT INTO thinking_mission_progress
                (child_profile_id, mission_id, step_index, answers_json, completed, revision, updated_at)
                VALUES (?, 'playground', 1, ?, 0, 1, ?)""",
                (child, json.dumps({"0": 0}), "2026-11-24T00:00:00+00:00"),
            )
            conn.commit()
        finally:
            conn.close()
        with self.assertRaises(ProgressConflict):
            save_choice("playground", 0, 1, 1, path=self.db, allow_edit=True)
        self.assertEqual({"0": 0}, read_progress("playground", path=self.db)["answers"])

    def test_invalid_choice_and_out_of_order_steps_rejected(self) -> None:
        with self.assertRaises(ValueError):
            save_choice("paper_bridge", 0, 999, 0, path=self.db)
        with self.assertRaises(ProgressConflict):
            save_choice("paper_bridge", 2, 0, 0, path=self.db)
        self.assertEqual(0, read_progress("paper_bridge", path=self.db)["step_index"])

    def test_child_profiles_isolated_in_parent_summary(self) -> None:
        first = default_child_profile_id(self.db)
        conn = connect_database(self.db)
        try:
            second = conn.execute(
                "INSERT INTO child_profile (display_name, created_at, active) VALUES (?, ?, 0)",
                ("other", "2026-11-23T00:00:00+00:00"),
            ).lastrowid
            conn.commit()
        finally:
            conn.close()
        save_choice("paper_bridge", 0, 0, 0, path=self.db, child_profile_id=first)
        save_choice("playground", 0, 0, 0, path=self.db, child_profile_id=second)
        self.assertEqual(
            ["paper_bridge"],
            [r["mission_id"] for r in recent_thinking_progress(
                child_profile_id=first, path=self.db
            )],
        )
        self.assertEqual(
            ["playground"],
            [r["mission_id"] for r in recent_thinking_progress(
                child_profile_id=second, path=self.db
            )],
        )

    def test_method_questions_are_specific_and_preserve_choice_order(self) -> None:
        from portal_app.thinking_expanded import METHOD_QUESTIONS
        self.assertEqual(set(VISUAL_IDS), set(METHOD_QUESTIONS))
        for mid in VISUAL_IDS:
            stage = stage_for(mid, 1, {"0": 0, "_visual_v": VERSION})
            self.assertTrue(stage["prompt"].endswith("?"))
            self.assertEqual([method[0] for method in CONTENT[mid]["methods"]], stage["options"])
        self.assertIn("별까지", METHOD_QUESTIONS["route_debug"])
        self.assertIn("자동차 상자", METHOD_QUESTIONS["missing_sign"])

    def test_category_tiles_cover_all_missions_without_changing_ids(self) -> None:
        self.assertEqual(8, len(CATEGORY_TILES))
        self.assertEqual({m["category"] for m in self.missions.values()},
                         {item[1] for item in CATEGORY_TILES})
        self.assertEqual(8, len({item[0] for item in CATEGORY_TILES}))

    def test_overview_prefers_current_format_and_keeps_profiles_separate(self) -> None:
        before, resume, recommended = thinking_overview(self.missions, path=self.db)
        self.assertEqual(16, len(before))
        self.assertIsNone(resume)
        self.assertIn(recommended, self.missions)
        save_choice("paper_bridge", 0, 0, 0, path=self.db)
        states, resume, _ = thinking_overview(self.missions, path=self.db)
        self.assertEqual(0, states["paper_bridge"]["step_index"])
        self.assertIsNone(resume)
        save_choice("paper_bridge", 0, 0, 0, path=self.db, visual=True)
        states, resume, _ = thinking_overview(self.missions, path=self.db)
        self.assertEqual(1, states["paper_bridge"]["step_index"])
        self.assertEqual("paper_bridge", resume)
        conn = connect_database(self.db)
        try:
            second = conn.execute("INSERT INTO child_profile (display_name, created_at, active) VALUES ('other', '2026-11-24', 0)").lastrowid
            conn.commit()
        finally:
            conn.close()
        states, resume, _ = thinking_overview(self.missions, path=self.db, child_profile_id=second)
        self.assertIsNone(resume)
        self.assertTrue(all(s["step_index"] == 0 for s in states.values()))

    def test_thinking_routes_registered_without_replacing_existing_portal(self) -> None:
        for path in ("/portal/thinking", "/portal/thinking/paper_bridge"):
            scope = {"type": "http", "method": "GET", "path": path, "headers": []}
            self.assertTrue(
                any(route.matches(scope)[0] is Match.FULL for route in app.routes), path
            )


if __name__ == "__main__":
    unittest.main()
