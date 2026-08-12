from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = APP_ROOT / "data" / "jungle_progress.sqlite3"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def database_connection(db_path: Path = DEFAULT_DB_PATH):
    """Commit or roll back and always close the SQLite handle."""
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_jungle_storage(db_path: Path = DEFAULT_DB_PATH) -> None:
    with database_connection(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jungle_bird_collection (
                bird_id TEXT PRIMARY KEY,
                bird_name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                rarity TEXT NOT NULL,
                rarity_label TEXT NOT NULL,
                stars TEXT NOT NULL,
                capture_count INTEGER NOT NULL DEFAULT 0,
                first_captured_at TEXT NOT NULL,
                last_captured_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jungle_capture_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bird_id TEXT NOT NULL,
                bird_name TEXT NOT NULL,
                rarity TEXT NOT NULL,
                question_id TEXT NOT NULL,
                question_subject TEXT NOT NULL,
                captured_at TEXT NOT NULL
            )
            """
        )


def record_capture(
    bird_info: dict[str, Any],
    question: dict[str, Any],
    db_path: Path = DEFAULT_DB_PATH,
) -> int:
    init_jungle_storage(db_path)
    now = utc_now()
    bird_id = str(bird_info["id"])
    with database_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO jungle_bird_collection (
                bird_id, bird_name, emoji, rarity, rarity_label, stars,
                capture_count, first_captured_at, last_captured_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(bird_id) DO UPDATE SET
                bird_name = excluded.bird_name,
                emoji = excluded.emoji,
                rarity = excluded.rarity,
                rarity_label = excluded.rarity_label,
                stars = excluded.stars,
                capture_count = jungle_bird_collection.capture_count + 1,
                last_captured_at = excluded.last_captured_at
            """,
            (
                bird_id,
                str(bird_info["name"]),
                str(bird_info["emoji"]),
                str(bird_info["rarity"]),
                str(bird_info["rarity_label"]),
                str(bird_info["stars"]),
                now,
                now,
            ),
        )
        conn.execute(
            """
            INSERT INTO jungle_capture_history (
                bird_id, bird_name, rarity, question_id, question_subject, captured_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                bird_id,
                str(bird_info["name"]),
                str(bird_info["rarity"]),
                str(question["id"]),
                str(question["subject"]),
                now,
            ),
        )
        row = conn.execute(
            "SELECT capture_count FROM jungle_bird_collection WHERE bird_id = ?",
            (bird_id,),
        ).fetchone()
    return int(row["capture_count"])


def load_collection(db_path: Path = DEFAULT_DB_PATH) -> list[dict[str, str | int]]:
    init_jungle_storage(db_path)
    with database_connection(db_path) as conn:
        rows = conn.execute(
            """
            SELECT bird_id, bird_name, emoji, rarity, rarity_label, stars,
                   capture_count, first_captured_at, last_captured_at
              FROM jungle_bird_collection
             ORDER BY last_captured_at ASC, bird_name ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def count_total_captures(db_path: Path = DEFAULT_DB_PATH) -> int:
    init_jungle_storage(db_path)
    with database_connection(db_path) as conn:
        row = conn.execute("SELECT COALESCE(SUM(capture_count), 0) AS total FROM jungle_bird_collection").fetchone()
    return int(row["total"])


def clear_jungle_storage(db_path: Path = DEFAULT_DB_PATH) -> None:
    init_jungle_storage(db_path)
    with database_connection(db_path) as conn:
        conn.execute("DELETE FROM jungle_capture_history")
        conn.execute("DELETE FROM jungle_bird_collection")
