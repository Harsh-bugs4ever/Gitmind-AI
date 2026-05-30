"""
GitMind Backend — GET /api/dashboard

API_CONTRACTS.md compatibility endpoint.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Query

from app import coral
from app.models import DashboardResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Dashboard"])

# Fast: single GitHub API call via repos_get — never paginates
_OPEN_ISSUES_SQL = (
    "SELECT open_issues FROM github.repos_get "
    "WHERE owner = '{owner}' AND repo = '{repo}'"
)

# Counts recently-closed merged PRs only (bounded time window prevents full pagination)
_MERGED_PRS_SQL = (
    "SELECT COUNT(*) AS merged_count FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND state = 'closed' AND merged_at IS NOT NULL "
    "AND created_at >= NOW() - INTERVAL '90 days'"
)

# Fast: repo_contributors is a direct paginated list — no heavy COUNT DISTINCT
_CONTRIBUTORS_SQL = (
    "SELECT COUNT(*) AS contributor_count FROM github.repo_contributors "
    "WHERE owner = '{owner}' AND repo = '{repo}'"
)

# Bounded to recently-opened stale PRs only
_STALE_PRS_SQL = (
    "SELECT COUNT(*) AS stale_count FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND state = 'open' "
    "AND created_at < NOW() - INTERVAL '30 days' "
    "AND created_at >= NOW() - INTERVAL '1 year'"
)


def _extract_int(raw: str, key: str, default: int = 0) -> int:
    raw = raw.strip()
    if not raw:
        return default
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list) and parsed:
            parsed = parsed[0]
        if isinstance(parsed, dict):
            if key in parsed:
                return int(parsed[key])
            for v in parsed.values():
                try:
                    return int(v)
                except (TypeError, ValueError):
                    pass
        if isinstance(parsed, (int, float)):
            return int(parsed)
    except Exception:
        pass

    import re

    match = re.search(r"\d+", raw)
    return int(match.group()) if match else default


def _run(sql: str) -> str:
    try:
        return coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _run_safe(sql: str, key: str, default: int = 0) -> int:
    """Run a query and return the int result, or *default* on any error."""
    try:
        return _extract_int(coral.run_query(sql), key, default)
    except coral.CoralError as exc:
        logger.warning("coral metric skipped (returning %d): %s", default, exc)
        return default


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Repository dashboard metrics",
)
async def dashboard(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
) -> DashboardResponse:
    fmt = {"owner": owner, "repo": repo}

    # Each metric is isolated — a timeout returns 0 instead of a 502
    open_issues  = _run_safe(_OPEN_ISSUES_SQL.format(**fmt),   "open_issues")
    merged_prs   = _run_safe(_MERGED_PRS_SQL.format(**fmt),    "merged_count")
    contributors = _run_safe(_CONTRIBUTORS_SQL.format(**fmt),  "contributor_count")
    stale_prs    = _run_safe(_STALE_PRS_SQL.format(**fmt),     "stale_count")

    return DashboardResponse(
        open_issues=open_issues,
        merged_prs=merged_prs,
        contributors=contributors,
        stale_prs=stale_prs,
    )

