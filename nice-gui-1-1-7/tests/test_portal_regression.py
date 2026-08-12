from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.content_loader import load_activities
from portal_app.database import (
    complete_activity_session,
    connect_database,
    default_child_profile_id,
    hash_parent_pin,
    start_activity_session,
    verify_parent_pin,
)
from portal_app.pattern_train import PATTERN_TRAIN_ACTIVITY_ID, build_pattern_train_result_summary
from portal_app.registry import WORLDS, get_world
from portal_app.routes import activity_launch_path, parent_activity_sessions, register_pages


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class PortalRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        register_pages()

    def test_portal_routes_are_registered_and_smoke_match(self) -> None:
        for path in ("/portal", "/portal/world/math", "/portal/activity/math.pattern_train.001", "/portal/parent"):
            route = route_for(path)
            self.assertIsNotNone(route, path)
            assert route is not None
            self.assertTrue(callable(route.endpoint))

    def test_every_registered_world_has_a_matching_portal_route(self) -> None:
        for world in WORLDS:
            self.assertIs(get_world(world.id), world)
            self.assertIsNotNone(route_for(f"/portal/world/{world.id}"), world.id)

    def test_unknown_world_is_not_registered_and_uses_the_generic_world_route(self) -> None:
        self.assertIsNone(get_world("not-a-world"))
        self.assertIsNotNone(route_for("/portal/world/not-a-world"))

    def test_every_enabled_activity_has_a_live_launch_path(self) -> None:
        for activity in load_activities():
            launch_path = activity_launch_path(activity)
            self.assertIsNotNone(route_for(launch_path), f"{activity.id}: {launch_path}")

    def test_pattern_train_uses_the_canonical_activity_route(self) -> None:
        activities = {activity.id: activity for activity in load_activities()}
        pattern_train = activities[PATTERN_TRAIN_ACTIVITY_ID]
        launch_path = activity_launch_path(pattern_train)
        self.assertEqual(f"/portal/activity/{PATTERN_TRAIN_ACTIVITY_ID}", launch_path)
        self.assertEqual("pattern_sequence", pattern_train.activity_type)
        self.assertIsNotNone(route_for(launch_path))

    def test_pattern_train_completion_persists_after_database_reload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "portal.sqlite3"
            profile_id = default_child_profile_id(db_path)
            session_id = start_activity_session(
                PATTERN_TRAIN_ACTIVITY_ID, "normal", db_path, child_profile_id=profile_id
            )
            summary = build_pattern_train_result_summary(
                correct_answers=15,
                first_try_correct_answers=14,
                total_questions=15,
                retry_count=1,
                hint_count=2,
                levels_completed=3,
            )
            complete_activity_session(
                session_id,
                score=summary["score"],
                result_summary=summary,
                hint_count=summary["hint_count"],
                retry_count=summary["retry_count"],
                path=db_path,
            )

            sessions = parent_activity_sessions(path=db_path)
            self.assertEqual(1, len(sessions))
            self.assertEqual(session_id, sessions[0]["id"])
            self.assertEqual(profile_id, sessions[0]["child_profile_id"])
            self.assertEqual("completed", sessions[0]["status"])
            self.assertEqual(93, sessions[0]["result_summary"]["score"])

    def test_parent_summary_scopes_to_active_default_child(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "portal.sqlite3"
            active_profile_id = default_child_profile_id(db_path)
            conn = connect_database(db_path)
            try:
                other_profile_id = int(
                    conn.execute(
                        "INSERT INTO child_profile (display_name, created_at, active) VALUES (?, ?, 0)",
                        ("Other learner", "2026-08-12T00:00:00+00:00"),
                    ).lastrowid
                )
                conn.commit()
            finally:
                conn.close()

            for profile_id, score in ((active_profile_id, 93), (other_profile_id, 60)):
                session_id = start_activity_session(
                    PATTERN_TRAIN_ACTIVITY_ID, "normal", db_path, child_profile_id=profile_id
                )
                complete_activity_session(session_id, score=score, result_summary={}, path=db_path)

            sessions = parent_activity_sessions(path=db_path)
            self.assertEqual([active_profile_id], [session["child_profile_id"] for session in sessions])
            self.assertEqual(93, sessions[0]["result_summary"]["score"])

    def test_parent_pin_contract_still_accepts_only_the_matching_pin(self) -> None:
        stored_hash = hash_parent_pin("1234", salt=b"0123456789abcdef")
        self.assertTrue(verify_parent_pin("1234", stored_hash))
        self.assertFalse(verify_parent_pin("0000", stored_hash))


if __name__ == "__main__":
    unittest.main()
