"""
GitMind Backend — Gemini integration helpers.

This module centralizes all AI calls used by chat and release-notes routes.
If GEMINI_API_KEY is not set, functions fall back to safe placeholders so
local development still works.
"""
from __future__ import annotations

import json
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def _call_gemini(prompt: str) -> str:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    url = (
        f"{_API_BASE}/{settings.gemini_model}:generateContent"
        f"?key={settings.gemini_api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2},
    }

    with httpx.Client(timeout=45.0) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")

    content = candidates[0].get("content", {})
    parts = content.get("parts") or []
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    if not text:
        raise RuntimeError("Gemini returned empty text")
    return text


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        lines = stripped.splitlines()
        if lines and lines[0].lower().startswith("json"):
            lines = lines[1:]
        return "\n".join(lines).strip()
    return stripped


def generate_sql(question: str, owner: str, repo: str) -> str:
    """
    Convert natural language into a safe read-only SQL query for Coral.
    Falls back to a deterministic query when Gemini isn't configured.
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY missing; using SQL fallback.")
        return (
            f"SELECT COUNT(*) as count FROM github.issues "
            f"WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'open'"
        )

    prompt = (
        "You are generating SQL for coral sql over GitHub data.\n"
        f"Owner: {owner}\nRepo: {repo}\n"
        f"User question: {question}\n\n"
        "Rules:\n"
        "- Return only one SQL query text.\n"
        "- SELECT only. No INSERT/UPDATE/DELETE/DDL.\n"
        "- Scope query to provided owner and repo.\n"
        "- Prefer github.issues / github.pull_requests tables.\n"
        "- No markdown, no explanation."
    )
    return _strip_code_fences(_call_gemini(prompt))


def summarise_query_result(question: str, sql: str, raw_result: str) -> str:
    """
    Summarize Coral output in plain language.
    Falls back to raw-result echo when Gemini isn't configured.
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY missing; using summary fallback.")
        return (
            f"[PLACEHOLDER — Gemini not connected]\n\n"
            f"Question: {question}\n"
            f"SQL: {sql}\n"
            f"Raw result:\n{raw_result}"
        )

    prompt = (
        "You are an assistant summarizing SQL query results.\n\n"
        f"Question:\n{question}\n\n"
        f"SQL:\n{sql}\n\n"
        f"Raw result:\n{raw_result}\n\n"
        "Return a concise, user-friendly answer in plain text."
    )
    return _call_gemini(prompt)


def generate_release_notes(pr_titles: list[str], owner: str, repo: str) -> str:
    """
    Generate categorized release notes JSON with keys:
    features, bug_fixes, performance, breaking_changes.

    Returns JSON string. Falls back to all titles in 'features' when Gemini
    isn't configured.
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY missing; using release-notes fallback.")
        return json.dumps(
            {
                "features": pr_titles,
                "bug_fixes": [],
                "performance": [],
                "breaking_changes": [],
            }
        )

    titles = "\n".join(f"- {title}" for title in pr_titles)
    prompt = (
        "You are generating release notes from merged pull request titles.\n"
        f"Owner: {owner}\nRepo: {repo}\n\n"
        f"PR titles:\n{titles}\n\n"
        "Return STRICT JSON with this schema:\n"
        "{\n"
        '  "features": string[],\n'
        '  "bug_fixes": string[],\n'
        '  "performance": string[],\n'
        '  "breaking_changes": string[]\n'
        "}\n"
        "No markdown and no additional text."
    )
    result = _strip_code_fences(_call_gemini(prompt))

    # Validate format early; if model drifts, fallback to deterministic output.
    try:
        parsed = json.loads(result)
        for key in ("features", "bug_fixes", "performance", "breaking_changes"):
            parsed.setdefault(key, [])
        return json.dumps(parsed)
    except json.JSONDecodeError:
        logger.warning("Gemini returned non-JSON release notes; using fallback.")
        return json.dumps(
            {
                "features": pr_titles,
                "bug_fixes": [],
                "performance": [],
                "breaking_changes": [],
            }
        )

