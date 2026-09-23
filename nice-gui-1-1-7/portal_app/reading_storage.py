from __future__ import annotations

from contextlib import contextmanager
import os
from pathlib import Path
from typing import Any, Iterator

from .database import database_connection, initialize_database


SQLITE_READING_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS reading_record (
  id INTEGER PRIMARY KEY,
  child_profile_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  read_date TEXT NOT NULL,
  reading_mode TEXT NOT NULL DEFAULT 'together',
  rating INTEGER NOT NULL DEFAULT 4,
  child_comment TEXT NOT NULL DEFAULT '',
  favorite_part TEXT NOT NULL DEFAULT '',
  parent_note TEXT NOT NULL DEFAULT '',
  cover_filename TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(child_profile_id) REFERENCES child_profile(id)
);

CREATE INDEX IF NOT EXISTS idx_reading_record_child_date
ON reading_record(child_profile_id, read_date DESC, id DESC);
"""

POSTGRES_READING_SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS reading_record (
      id BIGSERIAL PRIMARY KEY,
      child_profile_id BIGINT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      read_date TEXT NOT NULL,
      reading_mode TEXT NOT NULL DEFAULT 'together',
      rating INTEGER NOT NULL DEFAULT 4,
      child_comment TEXT NOT NULL DEFAULT '',
      favorite_part TEXT NOT NULL DEFAULT '',
      parent_note TEXT NOT NULL DEFAULT '',
      cover_filename TEXT,
      created_at TEXT NOT NULL
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_reading_record_child_date
    ON reading_record(child_profile_id, read_date DESC, id DESC)
    """,
)


def reading_uses_postgres(path: Path | None = None) -> bool:
    """Use PostgreSQL only for the runtime reading journal.

    Passing an explicit SQLite path keeps unit tests and local isolated tooling
    independent from a running PostgreSQL server.
    """

    if path is not None:
        return False
    return bool(
        os.environ.get("EDUNI_READING_DATABASE_URL")
        or os.environ.get("EDUNI_READING_DB_HOST")
    )


class _PostgresCompatConnection:
    """Small compatibility wrapper for the journal's existing qmark SQL."""

    def __init__(self, conn: Any) -> None:
        self._conn = conn

    def execute(self, sql: str, parameters: tuple[Any, ...] | list[Any] | None = None):
        translated = sql.replace("?", "%s")
        return self._conn.execute(translated, parameters or ())


def _connect_postgres():
    try:
        import psycopg
    except ImportError as exc:  # pragma: no cover - only possible in a broken image
        raise RuntimeError(
            "PostgreSQL reading storage is configured but psycopg is not installed"
        ) from exc

    database_url = os.environ.get("EDUNI_READING_DATABASE_URL")
    if database_url:
        return psycopg.connect(database_url, connect_timeout=5)

    host = os.environ.get("EDUNI_READING_DB_HOST")
    if not host:
        raise RuntimeError("EDUNI_READING_DB_HOST is required for PostgreSQL reading storage")

    return psycopg.connect(
        host=host,
        port=int(os.environ.get("EDUNI_READING_DB_PORT", "5432")),
        dbname=os.environ.get("EDUNI_READING_DB_NAME", "eduni"),
        user=os.environ.get("EDUNI_READING_DB_USER", "eduni"),
        password=os.environ.get("EDUNI_READING_DB_PASSWORD", ""),
        connect_timeout=5,
    )


@contextmanager
def reading_database_connection(path: Path | None = None) -> Iterator[Any]:
    if not reading_uses_postgres(path):
        with database_connection(path) as conn:
            yield conn
        return

    conn = _connect_postgres()
    try:
        yield _PostgresCompatConnection(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_reading_journal_schema(path: Path | None = None) -> None:
    if not reading_uses_postgres(path):
        initialize_database(path)
        with database_connection(path) as conn:
            conn.executescript(SQLITE_READING_SCHEMA_SQL)
        return

    with reading_database_connection(path) as conn:
        for statement in POSTGRES_READING_SCHEMA_STATEMENTS:
            conn.execute(statement)
