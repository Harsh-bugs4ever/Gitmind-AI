"""
GitMind Backend — GET /api/repo/commits

Returns recent commits for a repository via `coral sql`.

Query params
-----------
owner   : GitHub org or user name
repo    : repository name
limit   : max commits to return (default 20, max 100)
"""
from __future__ import annotations

import json
import logging
import re

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app import coral

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/repo", tags=["Repository"])


# ---------------------------------------------------------------------------
# Response model
# ---------------------------------------------------------------------------

class Commit(BaseModel):
    sha: str
    message: str
    author: str
    committed_at: str


class CommitsResponse(BaseModel):
    owner: str
    repo: str
    count: int
    commits: list[Commit]


# ---------------------------------------------------------------------------
# SQL template
# ---------------------------------------------------------------------------

_COMMITS_SQL = (
    "SELECT sha, message, author_login, committed_at "
    "FROM github.commits "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "ORDER BY committed_at DESC "
    "LIMIT {limit}"
)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/commits",
    response_model=CommitsResponse,
    summary="Recent commits for a repository",
)
async def repo_commits(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of commits to return"),
) -> CommitsResponse:
    """
    Fetches the *limit* most recent commits via ``coral sql`` and returns
    them as structured JSON.

    Each commit includes:
    - **sha** — full commit hash
    - **message** — first line of the commit message
    - **author** — GitHub login of the commit author
    - **committed_at** — ISO timestamp
    """
    sql = _COMMITS_SQL.format(owner=owner, repo=repo, limit=limit)

    try:
        raw = coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql failed fetching commits: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    commits = _parse_commits(raw)

    return CommitsResponse(
        owner=owner,
        repo=repo,
        count=len(commits),
        commits=commits,
    )


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

def _parse_commits(raw: str) -> list[Commit]:
    """
    Parse coral output into a list of Commit objects.
    Handles JSON array-of-dicts or plain tab/space-separated text.
    """
    raw = raw.strip()
    if not raw:
        return []

    # --- Try JSON ---
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            commits = []
            for row in parsed:
                if not isinstance(row, dict):
                    continue
                sha = str(row.get("sha", ""))
                message = str(row.get("message", "")).split("\n")[0].strip()
                author = str(row.get("author_login", row.get("author", "")))
                committed_at = str(row.get("committed_at", row.get("timestamp", "")))
                if sha:
                    commits.append(Commit(
                        sha=sha,
                        message=message,
                        author=author,
                        committed_at=committed_at,
                    ))
            return commits
    except (json.JSONDecodeError, TypeError):
        pass

    # --- Plain-text fallback: "sha message author date" separated by tabs or spaces ---
    commits = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = re.split(r"\t| {2,}", line, maxsplit=3)
        if len(parts) >= 1:
            commits.append(Commit(
                sha=parts[0] if len(parts) > 0 else "",
                message=parts[1] if len(parts) > 1 else "",
                author=parts[2] if len(parts) > 2 else "",
                committed_at=parts[3] if len(parts) > 3 else "",
            ))
    return commits
