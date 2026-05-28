"""
GitMind Backend — GET /api/releases/generate

Fetches merged PR titles via coral sql, sends them to Gemini,
and returns structured release notes split into categories.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Query

from app import coral, gemini
from app.models import ReleaseNotes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/releases", tags=["Releases"])

# SQL to fetch merged PR titles from the last 90 days
_MERGED_PRS_SQL = (
    "SELECT title FROM github.pull_requests "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND state = 'closed' AND merged_at IS NOT NULL "
    "AND merged_at >= NOW() - INTERVAL '90 days' "
    "ORDER BY merged_at DESC"
)


@router.get(
    "/generate",
    response_model=ReleaseNotes,
    summary="Generate categorised release notes from merged PRs",
)
async def generate_release_notes(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
) -> ReleaseNotes:
    """
    1. Fetch merged PR titles via ``coral sql``.
    2. Send titles to Gemini for categorisation.
    3. Parse the JSON response into a structured ReleaseNotes object.
    """
    sql = _MERGED_PRS_SQL.format(owner=owner, repo=repo)

    # Step 1 — fetch merged PRs via coral
    try:
        raw = coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql failed fetching PRs: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Parse PR titles from coral output
    # Coral may return JSON array or newline-separated text; handle both.
    pr_titles: list[str] = _parse_pr_titles(raw)

    if not pr_titles:
        return ReleaseNotes(raw="No merged PRs found in the last 90 days.")

    # Step 2 — send to Gemini for categorisation
    try:
        notes_json_str = gemini.generate_release_notes(pr_titles, owner, repo)
    except Exception as exc:
        logger.exception("Gemini release notes generation failed")
        raise HTTPException(status_code=500, detail=f"AI error: {exc}") from exc

    # Step 3 — parse the JSON Gemini returns
    try:
        notes_dict = json.loads(notes_json_str)
    except json.JSONDecodeError:
        logger.warning("Gemini response was not valid JSON; storing as raw.")
        notes_dict = {}

    return ReleaseNotes(
        features=notes_dict.get("features", []),
        bug_fixes=notes_dict.get("bug_fixes", []),
        performance=notes_dict.get("performance", []),
        breaking_changes=notes_dict.get("breaking_changes", []),
        raw=notes_json_str,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _parse_pr_titles(raw: str) -> list[str]:
    """
    Best-effort parser that handles both JSON array output and plain-text
    newline-separated output from coral.
    """
    raw = raw.strip()
    if not raw:
        return []

    # Try JSON first
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            # Each item might be a string or a dict with a "title" key
            titles = []
            for item in parsed:
                if isinstance(item, str):
                    titles.append(item)
                elif isinstance(item, dict) and "title" in item:
                    titles.append(item["title"])
            return titles
    except json.JSONDecodeError:
        pass

    # Fall back to newline-separated plain text
    return [line.strip() for line in raw.splitlines() if line.strip()]
