from __future__ import annotations

import hashlib
import os
import sqlite3
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = APP_ROOT / "data"
DEFAULT_DB_PATH = DATA_DIR / "eduni_portal.sqlite3"

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


def initialize_database(path: Path | None = None) -> Path:
    db_path = path or get_database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
    return db_path


def hash_parent_pin(pin: str, salt: str | None = None) -> str:
    active_salt = salt or os.environ.get("EDUNI_PARENT_PIN_SALT", "")
    return hashlib.sha256(f"{active_salt}:{pin}".encode("utf-8")).hexdigest()


def configured_parent_pin_hash() -> str | None:
    return os.environ.get("EDUNI_PARENT_PIN_HASH")

