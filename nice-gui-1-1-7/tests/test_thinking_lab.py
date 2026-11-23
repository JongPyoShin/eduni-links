from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.database import connect_database, default_child_profile_id
from portal_app.thinking_lab import (
    ProgressConflict,
    load_thinking_missions,
    read_progress,
    recent_thinking_progress,
    save_choice,
)


class ThinkingLabTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = Path(self.tmp.name) / "thinking.sqlite3"
        self.missions = load_thinking_missions()

    def test_curriculum_has_two_valid_five_stage_missions(self) -> None:
        self.assertEqual({"paper_bridge", "playground"}, set(self.missions))
        for mission in self.missions.values():
            self.assertEqual(
                ["발견", "정의", "대안", "실험", "성찰"],
                [step["label"] for step in mission["steps"]],
            )
            self.assertTrue(mission["offline_task"])

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
        self.assertEqual({"0": 1}, read_progress("playground", path=self.db)["answers"])

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

    def test_thinking_routes_registered_without_replacing_existing_portal(self) -> None:
        for path in ("/portal/thinking", "/portal/thinking/paper_bridge"):
            scope = {"type": "http", "method": "GET", "path": path, "headers": []}
            self.assertTrue(
                any(route.matches(scope)[0] is Match.FULL for route in app.routes), path
            )


if __name__ == "__main__":
    unittest.main()
