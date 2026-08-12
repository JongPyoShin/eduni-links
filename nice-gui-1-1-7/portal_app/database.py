from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

APP_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = APP_ROOT / "data"
DEFAULT_DB_PATH = DATA_DIR / "eduni_portal.sqlite3"
PIN_ALGORITHM = "pbkdf2_sha256"
PIN_ITERATIONS = 260000

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS child_profile (
  id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS activity_session (
  id INTEGER PRIMARY KEY,
  child_profile_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  hint_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  result_summary_json TEXT,
  FOREIGN KEY(child_profile_id) REFERENCES child_profile(id)
);

CREATE TABLE IF NOT EXISTS process_badge_event (
  id INTEGER PRIMARY KEY,
  activity_session_id INTEGER NOT NULL,
  badge_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(activity_session_id) REFERENCES activity_session(id)
);

CREATE TABLE IF NOT EXISTS parent_settings (
  id INTEGER PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  daily_screen_minutes INTEGER NOT NULL DEFAULT 20,
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
"""


def get_database_path() -> Path:
    configured = os.environ.get("EDUNI_PORTAL_DB")
    return Path(configured) if configured else DEFAULT_DB_PATH


def connect_database(path: Path | None = None) -> sqlite3.Connection:
    db_path = path or get_database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def database_connection(path: Path | None = None):
    conn = connect_database(path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize_database(path: Path | None = None) -> Path:
    db_path = path or get_database_path()
    with database_connection(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
    return db_path


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def default_child_profile_id(path: Path | None = None) -> int:
    """Return the local default profile used until profile selection is added."""
    initialize_database(path)
    with database_connection(path) as conn:
        row = conn.execute(
            "SELECT id FROM child_profile WHERE active = 1 ORDER BY id LIMIT 1"
        ).fetchone()
        if row is not None:
            return int(row[0])
        cursor = conn.execute(
            "INSERT INTO child_profile (display_name, created_at, active) VALUES (?, ?, 1)",
            ("EDUNI learner", utc_now()),
        )
        return int(cursor.lastrowid)


def start_activity_session(
    activity_id: str,
    difficulty: str,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
) -> int:
    """Create one Portal activity session for the selected child profile."""
    profile_id = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with database_connection(path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO activity_session (child_profile_id, activity_id, difficulty, started_at)
            VALUES (?, ?, ?, ?)
            """,
            (profile_id, activity_id, difficulty, utc_now()),
        )
        return int(cursor.lastrowid)


def complete_activity_session(
    session_id: int,
    *,
    score: int,
    result_summary: dict[str, Any],
    hint_count: int = 0,
    retry_count: int = 0,
    path: Path | None = None,
) -> None:
    """Persist the terminal result for an existing activity session exactly once."""
    with database_connection(path) as conn:
        cursor = conn.execute(
            """
            UPDATE activity_session
               SET completed_at = ?, completed = 1, hint_count = ?, retry_count = ?,
                   result_summary_json = ?
             WHERE id = ? AND completed = 0
            """,
            (
                utc_now(), hint_count, retry_count,
                json.dumps({"score": score, **result_summary}, ensure_ascii=False, sort_keys=True),
                session_id,
            ),
        )
        if cursor.rowcount != 1:
            raise ValueError(f"activity session {session_id} cannot be completed")


def latest_completed_activity_session(
    activity_id: str,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
) -> dict[str, Any] | None:
    """Return the latest completed session, optionally scoped to one child profile."""
    initialize_database(path)
    where_clause = "activity_id = ? AND completed = 1"
    parameters: list[Any] = [activity_id]
    if child_profile_id is not None:
        where_clause += " AND child_profile_id = ?"
        parameters.append(child_profile_id)
    with database_connection(path) as conn:
        row = conn.execute(
            f"""
            SELECT id, child_profile_id, activity_id, difficulty, started_at, completed_at,
                   completed, hint_count, retry_count, result_summary_json
              FROM activity_session
             WHERE {where_clause}
             ORDER BY completed_at DESC, id DESC
             LIMIT 1
            """,
            parameters,
        ).fetchone()
    return activity_session_from_row(row) if row is not None else None


def recent_activity_sessions(
    limit: int = 10,
    path: Path | None = None,
    *,
    child_profile_id: int | None = None,
) -> list[dict[str, Any]]:
    """Return recent sessions for one child, or all children when explicitly desired."""
    if limit < 1:
        raise ValueError("limit must be positive")
    initialize_database(path)
    where_clause = ""
    parameters: list[Any] = []
    if child_profile_id is not None:
        where_clause = "WHERE child_profile_id = ?"
        parameters.append(child_profile_id)
    parameters.append(limit)
    with database_connection(path) as conn:
        rows = conn.execute(
            f"""
            SELECT id, child_profile_id, activity_id, difficulty, started_at, completed_at,
                   completed, hint_count, retry_count, result_summary_json
              FROM activity_session
             {where_clause}
             ORDER BY COALESCE(completed_at, started_at) DESC, id DESC
             LIMIT ?
            """,
            parameters,
        ).fetchall()
    return [activity_session_from_row(row) for row in rows]


def activity_session_from_row(row: sqlite3.Row | tuple[Any, ...]) -> dict[str, Any]:
    summary_json = row[9]
    summary = json.loads(summary_json) if summary_json else {}
    return {
        "id": int(row[0]),
        "child_profile_id": int(row[1]),
        "activity_id": str(row[2]),
        "difficulty": str(row[3]),
        "started_at": str(row[4]),
        "completed_at": str(row[5]) if row[5] is not None else None,
        "status": "completed" if bool(row[6]) else "in_progress",
        "hint_count": int(row[7]),
        "retry_count": int(row[8]),
        "result_summary": summary,
    }


def hash_parent_pin(pin: str, salt: bytes | None = None, iterations: int = PIN_ITERATIONS) -> str:
    if not pin:
        raise ValueError("pin is required")
    active_salt = salt if salt is not None else secrets.token_bytes(16)
    if not active_salt:
        raise ValueError("salt is required")
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), active_salt, iterations)
    return f"{PIN_ALGORITHM}${iterations}${active_salt.hex()}${digest.hex()}"


def verify_parent_pin(pin: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = stored_hash.split("$", 3)
        if algorithm != PIN_ALGORITHM:
            return False
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        actual = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, iterations)
    except (TypeError, ValueError):
        return False
    return hmac.compare_digest(actual, expected)


def configured_parent_pin_hash() -> str | None:
    return os.environ.get("EDUNI_PARENT_PIN_HASH")
