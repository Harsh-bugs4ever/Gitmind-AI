"""
GitMind Backend - Gemini integration.

This module powers the AI-backed backend flows:
- convert natural-language questions into Coral SQL
- summarise Coral query results
- categorise pull requests into release notes
"""
from __future__ import annotations

import json
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)

_CORAL_SCHEMA = """
You are writing SQL for Coral, a tool that runs SQL over GitHub data.
Table: github.issues        - columns: owner, repo, number, title, body, state, labels, author, created_at, closed_at
Table: github.pull_requests - columns: owner, repo, number, title, body, state, author, created_at, merged_at, base_branch
Table: github.commits       - columns: owner, repo, sha, message, author, committed_at, additions, deletions
Table: github.contributors  - columns: owner, repo, username, total_commits, issues_opened, prs_merged

Always filter by repo using: WHERE owner = '<owner>' AND repo = '<repo>'
"""


def _generate_content(prompt: str) -> str:
    """Generate text with Gemini or raise a clear runtime error."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")

    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError(
            "google-genai is not installed. Install backend dependencies first."
        ) from exc

    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )

    text = getattr(response, "text", None)
    if not text:
        raise RuntimeError("Gemini returned an empty response.")

    return text.strip()


def generate_sql(question: str, owner: str, repo: str) -> str:
    """Convert a natural-language question into a Coral SQL query."""
    prompt = f"""You are a SQL expert for a GitHub analytics platform.

{_CORAL_SCHEMA}

Rules:
1. Return ONLY the SQL query - no explanation, no markdown, no backticks.
2. Always include WHERE owner = '{owner}' AND repo = '{repo}'.
3. Use PostgreSQL-compatible SQL.
4. For "last week":  created_at >= NOW() - INTERVAL '7 days'
5. For "last month": created_at >= NOW() - INTERVAL '30 days'
6. Always add LIMIT 20 unless the query is a COUNT or aggregation.
7. If the question cannot be answered from the schema, return exactly: UNSUPPORTED_QUERY
8. Never use DROP, DELETE, INSERT, UPDATE, ALTER, TRUNCATE.

Question: {question}"""

    sql = _generate_content(prompt)

    # Strip accidental markdown fences
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(l for l in lines if not l.startswith("```")).strip()

    # Safety: block mutating statements
    forbidden = ["DROP ", "DELETE ", "TRUNCATE ", "INSERT ", "UPDATE ", "ALTER "]
    if any(kw in sql.upper() for kw in forbidden):
        logger.warning("Gemini generated a forbidden SQL statement; rejecting it.")
        return f"SELECT 1 -- blocked unsafe query for {owner}/{repo}"

    logger.info("generate_sql OK for '%s'", question[:60])
    return sql


def summarise_query_result(question: str, sql: str, raw_result: str) -> str:
    """Turn raw Coral SQL output into a plain-English answer."""
    if not raw_result or raw_result.strip() in ("", "[]", "null"):
        return "No data found for your question."

    # Trim large results to stay within token limits
    trimmed = raw_result[:3000] + ("..." if len(raw_result) > 3000 else "")

    prompt = (
        f'A user asked: "{question}"\n\n'
        f"We ran this SQL: {sql}\n\n"
        f"The database returned:\n{trimmed}\n\n"
        "Write a clear, concise 1-3 sentence plain-English answer. "
        "Do not mention SQL or technical details. "
        "Speak directly as if answering a question about the repository."
    )

    summary = _generate_content(prompt)

    logger.info("summarise_query_result OK")
    return summary


def generate_release_notes(pr_titles: list[str], owner: str, repo: str) -> str:
    """Categorise merged PR titles into release-note sections."""
    if not pr_titles:
        return json.dumps({
            "features": [],
            "bug_fixes": [],
            "performance": [],
            "breaking_changes": [],
        })

    titles_text = "\n".join(f"- {t}" for t in pr_titles[:50])  # cap at 50 PRs

    prompt = f"""You are writing release notes for the GitHub repository {owner}/{repo}.

Here are the merged pull request titles:
{titles_text}

Categorise each PR into one group:
- features: new functionality or enhancements
- bug_fixes: fixes to existing functionality
- performance: speed, memory, or efficiency improvements
- breaking_changes: changes that break backward compatibility

Rules:
1. Return ONLY a valid JSON object - no markdown, no backticks, no explanation.
2. Each group is a list of short, user-friendly strings (rewrite PR titles to be readable).
3. Every PR must appear in exactly one group.
4. Empty groups use an empty list [].

Return this exact JSON format:
{{
  "features": ["..."],
  "bug_fixes": ["..."],
  "performance": ["..."],
  "breaking_changes": ["..."]
}}"""

    raw = _generate_content(prompt)

    # Strip accidental markdown fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(l for l in lines if not l.startswith("```")).strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()

    # Validate JSON before returning
    try:
        json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Gemini returned non-JSON for release notes; using fallback.")
        return json.dumps({
            "features": pr_titles,
            "bug_fixes": [],
            "performance": [],
            "breaking_changes": [],
        })

    logger.info("generate_release_notes OK - %d PRs categorised", len(pr_titles))
    return raw
