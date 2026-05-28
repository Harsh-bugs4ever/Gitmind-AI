"""
GitMind — ai/nl_to_sql.py
==========================
Natural Language to SQL using Gemini.

Usage (backend imports this):
    from ai.nl_to_sql import generate_sql, summarise_results
"""
from __future__ import annotations

import logging
import os

import google.generativeai as genai

logger = logging.getLogger(__name__)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash-lite"

_CORAL_SCHEMA = """
Tables available in Coral (SQL over GitHub):
- github.issues        : number, title, body, state, labels, author, created_at, closed_at
- github.pull_requests : number, title, body, state, author, created_at, merged_at, base_branch
- github.commits       : sha, message, author, committed_at, additions, deletions
- github.contributors  : username, total_commits, issues_opened, prs_merged

Always filter with: WHERE owner = '<owner>' AND repo = '<repo>'
"""


def generate_sql(question: str, owner: str, repo: str) -> str:
    """
    Convert plain English question into a Coral SQL query.

    Args:
        question : e.g. "What bugs were fixed last week?"
        owner    : GitHub org/user e.g. "facebook"
        repo     : repo name e.g. "react"

    Returns:
        SQL string — backend passes this to coral.run_query()
    """
    prompt = f"""You are a SQL expert for a GitHub analytics platform.

{_CORAL_SCHEMA}

Rules:
1. Return ONLY the raw SQL — no explanation, no markdown, no backticks.
2. Always filter: WHERE owner = '{owner}' AND repo = '{repo}'.
3. PostgreSQL-compatible SQL only.
4. "last week"  → created_at >= NOW() - INTERVAL '7 days'
5. "last month" → created_at >= NOW() - INTERVAL '30 days'
6. Add LIMIT 20 unless the query is COUNT or aggregation.
7. If question cannot be answered from schema, return exactly: UNSUPPORTED_QUERY
8. Never use DROP, DELETE, INSERT, UPDATE, ALTER, TRUNCATE.

Question: {question}"""

    model = genai.GenerativeModel(MODEL)
    response = model.generate_content(prompt)
    sql = response.text.strip()

    # Strip accidental markdown fences
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(l for l in lines if not l.startswith("```")).strip()

    # Safety check
    forbidden = ["DROP ", "DELETE ", "TRUNCATE ", "INSERT ", "UPDATE ", "ALTER "]
    if any(kw in sql.upper() for kw in forbidden):
        logger.warning("Blocked unsafe SQL from Gemini.")
        return f"SELECT 1 -- blocked unsafe query for {owner}/{repo}"

    logger.info("generate_sql OK: %s", question[:60])
    return sql


def summarise_results(question: str, sql: str, raw_result: str) -> str:
    """
    Turn raw SQL results into a plain-English answer for the chat UI.

    Args:
        question   : original user question
        sql        : SQL that was run
        raw_result : string output from coral.run_query()

    Returns:
        1-3 sentence human-readable answer.
    """
    if not raw_result or raw_result.strip() in ("", "[]", "null"):
        return "No data found for your question."

    trimmed = raw_result[:3000] + ("..." if len(raw_result) > 3000 else "")

    prompt = (
        f'User asked: "{question}"\n\n'
        f"SQL used: {sql}\n\n"
        f"Database result:\n{trimmed}\n\n"
        "Write a clear 1-3 sentence plain-English answer. "
        "Do not mention SQL. Speak as if answering directly about the repository."
    )

    model = genai.GenerativeModel(MODEL)
    response = model.generate_content(prompt)
    return response.text.strip()


# ── Quick test ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        "What bugs were fixed last week?",
        "Who is the most active contributor?",
        "How many open issues are there?",
        "What PRs are stale?",
    ]
    for q in tests:
        print(f"\nQ: {q}")
        print(f"SQL: {generate_sql(q, 'facebook', 'react')}")
