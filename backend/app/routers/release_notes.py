"""
GitMind Backend — POST /api/release-notes

API_CONTRACTS.md compatibility endpoint.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app import coral, gemini
from app.models import ReleaseNotesRequest, ReleaseNotesResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/release-notes", tags=["Release Notes"])

_MERGED_PRS_SQL = (
    "SELECT title FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND state = 'closed' AND merged_at IS NOT NULL "
    "LIMIT 50"
)


@router.post(
    "",
    response_model=ReleaseNotesResponse,
    summary="Generate release notes for a repo",
)
async def release_notes(body: ReleaseNotesRequest) -> ReleaseNotesResponse:
    """
    1. Fetch merged PR titles via Coral.
    2. Ask Gemini to generate release notes.
    3. Return a single `notes` string (per API_CONTRACTS.md).
    """
    sql = _MERGED_PRS_SQL.format(owner=body.owner, repo=body.repo)
    try:
        raw = coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql failed fetching PRs: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Best-effort: accept JSON list of dicts/strings or plain text lines.
    pr_titles: list[str] = []
    raw = raw.strip()
    if raw:
        try:
            import json

            parsed = json.loads(raw)
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, str) and item.strip():
                        pr_titles.append(item.strip())
                    elif isinstance(item, dict) and "title" in item and str(item["title"]).strip():
                        pr_titles.append(str(item["title"]).strip())
        except Exception:
            pr_titles = [line.strip() for line in raw.splitlines() if line.strip()]

    if not pr_titles:
        return ReleaseNotesResponse(notes="No merged PRs found in the last 90 days.")

    try:
        notes = gemini.generate_release_notes(pr_titles, body.owner, body.repo)
    except Exception as exc:
        logger.exception("Release notes generation failed")
        raise HTTPException(status_code=500, detail=f"AI error: {exc}") from exc

    return ReleaseNotesResponse(notes=notes)

