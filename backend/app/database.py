"""
GitMind Backend — PostgreSQL database connection pool.

Uses psycopg2's ThreadedConnectionPool so that multiple FastAPI worker
threads can safely share a small pool of database connections rather than
opening/closing one per request.

Usage
-----
    from app.database import get_conn, release_conn, init_db

Call `init_db()` once during application startup to create the required
tables and the vector-like embeddings column.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: pool.ThreadedConnectionPool | None = None


def init_pool() -> None:
    """
    Initialise the connection pool.
    Called once at application startup (lifespan handler in main.py).
    """
    global _pool
    settings = get_settings()
    _pool = pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        dsn=settings.database_url,
    )
    logger.info("PostgreSQL connection pool initialised.")


def close_pool() -> None:
    """Tear down the pool at application shutdown."""
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None
        logger.info("PostgreSQL connection pool closed.")


def get_conn() -> psycopg2.extensions.connection:
    """Check out a connection from the pool (caller must release it)."""
    if _pool is None:
        raise RuntimeError("Database pool has not been initialised. Call init_pool() first.")
    return _pool.getconn()


def release_conn(conn: psycopg2.extensions.connection) -> None:
    """Return a connection to the pool."""
    if _pool is not None:
        _pool.putconn(conn)


@contextmanager
def db_cursor(commit: bool = False) -> Generator[RealDictCursor, None, None]:
    """
    Context manager that yields a psycopg2 RealDictCursor.

    Automatically commits (when *commit=True*) or rolls back on error,
    and always returns the connection to the pool.

    Example
    -------
        with db_cursor(commit=True) as cur:
            cur.execute("INSERT INTO ...", (...))
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        release_conn(conn)


# ---------------------------------------------------------------------------
# Schema bootstrap
# ---------------------------------------------------------------------------

_CREATE_EMBEDDINGS_TABLE = """
CREATE TABLE IF NOT EXISTS issue_embeddings (
    issue_id    TEXT        PRIMARY KEY,
    embedding   FLOAT8[]    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def init_db() -> None:
    """
    Create database tables required by GitMind if they do not already exist.
    Safe to call multiple times (idempotent).
    """
    with db_cursor(commit=True) as cur:
        cur.execute(_CREATE_EMBEDDINGS_TABLE)
    logger.info("Database schema verified / initialised.")
