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

_OPEN_ISSUES_SQL = (
    "SELECT COUNT(*) AS open_issues FROM github.issues "
    "WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'open'"
)

_MERGED_PRS_SQL = (
    "SELECT COUNT(*) AS merged_count FROM github.pull_requests "
    "WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'closed' AND merged_at IS NOT NULL"
)

_CONTRIBUTORS_SQL = (
    "SELECT COUNT(DISTINCT user_login) AS contributor_count FROM github.pull_requests "
    "WHERE owner = '{owner}' AND repo = '{repo}'"
)

_STALE_PRS_SQL = (
    "SELECT COUNT(*) AS stale_count FROM github.pull_requests "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND state = 'open' "
    "AND created_at < NOW() - INTERVAL '30 days'"
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

    open_issues = _extract_int(_run(_OPEN_ISSUES_SQL.format(**fmt)), "open_issues")
    merged_prs = _extract_int(_run(_MERGED_PRS_SQL.format(**fmt)), "merged_count")
    contributors = _extract_int(_run(_CONTRIBUTORS_SQL.format(**fmt)), "contributor_count")
    stale_prs = _extract_int(_run(_STALE_PRS_SQL.format(**fmt)), "stale_count")

    return DashboardResponse(
        open_issues=open_issues,
        merged_prs=merged_prs,
        contributors=contributors,
        stale_prs=stale_prs,
    )

