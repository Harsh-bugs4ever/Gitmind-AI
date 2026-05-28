"""
GitMind Backend — Coral CLI subprocess wrapper.

All GitHub data queries flow through `coral sql <query>`, which is the
Coral CLI tool that exposes GitHub data as a queryable SQL surface.

Design decisions
----------------
* We raise `CoralError` (a subclass of RuntimeError) so callers can catch
  it specifically and return a clean HTTP 502 / 500 rather than a generic
  unhandled exception.
* stdout is captured as the result; stderr is included in the exception
  message on non-zero exit codes.
* A configurable `timeout` (default 30 s) prevents runaway child processes
  from blocking the FastAPI event loop indefinitely.
"""
from __future__ import annotations

import json
import logging
import subprocess
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 30  # seconds


class CoralError(RuntimeError):
    """Raised when the `coral sql` subprocess exits with a non-zero code."""


def run_query(sql: str, timeout: int = _DEFAULT_TIMEOUT) -> str:
    """
    Execute *sql* via `coral sql` and return the raw stdout as a string.

    Parameters
    ----------
    sql:
        The SQL statement to run against the Coral GitHub data source.
    timeout:
        Maximum seconds to wait for the subprocess. Defaults to 30.

    Returns
    -------
    str
        Raw stdout from the coral process (may be plain text, JSON, CSV …).

    Raises
    ------
    CoralError
        If coral exits with a non-zero return code or the process times out.
    """
    logger.debug("Running coral sql query: %s", sql)
    try:
        result = subprocess.run(
            ["coral", "sql", sql],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise CoralError(f"coral sql timed out after {timeout}s for query: {sql!r}") from exc
    except FileNotFoundError as exc:
        raise CoralError(
            "coral binary not found. Make sure Coral CLI is installed and on your PATH."
        ) from exc

    if result.returncode != 0:
        raise CoralError(
            f"coral sql exited with code {result.returncode}.\n"
            f"STDOUT: {result.stdout.strip()}\n"
            f"STDERR: {result.stderr.strip()}"
        )

    logger.debug("coral sql result: %s", result.stdout[:200])
    return result.stdout


def run_query_json(sql: str, timeout: int = _DEFAULT_TIMEOUT) -> Any:
    """
    Execute *sql* and parse the stdout as JSON.

    Useful when the Coral source returns JSON-encoded rows.

    Raises
    ------
    CoralError
        On subprocess failure.
    json.JSONDecodeError
        If stdout is not valid JSON.
    """
    raw = run_query(sql, timeout=timeout)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Return the raw string wrapped in a dict so callers have something
        # sensible to work with even when the output is plain text.
        return {"raw": raw}
