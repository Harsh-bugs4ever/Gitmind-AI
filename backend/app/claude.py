"""
GitMind Backend — Claude API placeholder.

TODO: Replace the stub functions below with real Anthropic SDK calls once
      the API key is configured and the AI/ML engineer wires this up.

      Suggested implementation pattern:
        import anthropic
        _CLIENT = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        MODEL = "claude-sonnet-4-20250514"
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stub helpers
# ---------------------------------------------------------------------------

def generate_sql(question: str, owner: str, repo: str) -> str:
    """
    TODO: Call Claude to convert a natural-language question into a Coral SQL
          query scoped to owner/repo.

    Placeholder returns a safe, read-only example query so downstream coral
    execution still exercises the full code path.
    """
    logger.warning("generate_sql() is a placeholder — returning example SQL.")
    return (
        f"SELECT COUNT(*) as count FROM github.issues "
        f"WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'open'"
    )


def summarise_query_result(question: str, sql: str, raw_result: str) -> str:
    """
    TODO: Call Claude to interpret the raw coral output and produce a
          human-readable answer.

    Placeholder echoes back the raw result wrapped in a stub message.
    """
    logger.warning("summarise_query_result() is a placeholder — returning raw result.")
    return (
        f"[PLACEHOLDER — Claude not connected]\n\n"
        f"Question: {question}\n"
        f"SQL: {sql}\n"
        f"Raw result:\n{raw_result}"
    )


def generate_release_notes(pr_titles: list[str], owner: str, repo: str) -> str:
    """
    TODO: Call Claude to categorise merged PR titles into Features, Bug Fixes,
          Performance, and Breaking Changes, returning a JSON string.

    Placeholder dumps all titles under 'features' so the JSON parser in the
    releases router can exercise the full parsing path.
    """
    import json
    logger.warning("generate_release_notes() is a placeholder — bucketing all PRs as features.")
    return json.dumps(
        {
            "features": pr_titles,
            "bug_fixes": [],
            "performance": [],
            "breaking_changes": [],
        }
    )
