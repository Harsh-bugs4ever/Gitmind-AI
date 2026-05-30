"""
GitMind Backend — Repository stats, trends, and commit endpoints

GET /api/repo/stats    — open issues, PR merge rate, contributors, stale PRs
GET /api/repo/trends   — issue count grouped by week (last 3 months)
GET /api/repo/commits  — paginated commit history for a branch or SHA
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Query

from app import coral
from app.models import RepoStats, RepoTrends, TrendPoint, CommitSummary, CommitPage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/repo", tags=["Repository"])

# ---------------------------------------------------------------------------
# SQL templates
# ---------------------------------------------------------------------------

_OPEN_ISSUES_SQL = (
    "SELECT COUNT(*) AS open_issues FROM github.issues "
    "WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'open'"
)

_MERGED_PRS_SQL = (
    "SELECT COUNT(*) AS merged_count FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'closed' AND merged_at IS NOT NULL"
)

_CLOSED_PRS_SQL = (
    "SELECT COUNT(*) AS closed_count FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}' AND state = 'closed'"
)

_CONTRIBUTORS_SQL = (
    "SELECT COUNT(DISTINCT user__login) AS contributor_count FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}'"
)

# PRs open for > 30 days with no recent update
_STALE_PRS_SQL = (
    "SELECT COUNT(*) AS stale_count FROM github.pulls "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND state = 'open' "
    "AND created_at < NOW() - INTERVAL '30 days'"
)

_TRENDS_SQL = (
    "SELECT DATE_TRUNC('week', created_at)::DATE AS week, COUNT(*) AS issue_count "
    "FROM github.issues "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND created_at >= NOW() - INTERVAL '3 months' "
    "GROUP BY week ORDER BY week ASC"
)

_COMMITS_SQL = (
    "SELECT sha, commit__author__name, commit__author__date, commit__message "
    "FROM github.commits "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND {ref_clause} "
    "LIMIT {limit} OFFSET {offset}"
)

_COMMIT_COUNT_SQL = (
    "SELECT COUNT(*) AS total FROM github.commits "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "AND {ref_clause}"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_int(raw: str, key: str, default: int = 0) -> int:
    """
    Parse an integer value from coral output.

    Tries JSON first (handles both array-of-dicts and bare int),
    then falls back to extracting the first numeric token from plain text.
    """
    raw = raw.strip()
    if not raw:
        return default
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list) and parsed:
            parsed = parsed[0]
        if isinstance(parsed, dict):
            # Accept either the exact key or any numeric value
            if key in parsed:
                return int(parsed[key])
            # Fallback: grab the first int value in the dict
            for v in parsed.values():
                try:
                    return int(v)
                except (TypeError, ValueError):
                    pass
        if isinstance(parsed, (int, float)):
            return int(parsed)
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        pass

    # Plain-text fallback: grab first digit sequence
    import re
    match = re.search(r"\d+", raw)
    return int(match.group()) if match else default


def _run(sql: str) -> str:
    """Run a coral SQL query, raising HTTPException on failure."""
    try:
        return coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /api/repo/stats
# ---------------------------------------------------------------------------

@router.get(
    "/stats",
    response_model=RepoStats,
    summary="Repository health statistics",
)
async def repo_stats(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
) -> RepoStats:
    """
    Runs four coral SQL queries in sequence and returns aggregated stats:
    - open issue count
    - PR merge rate (merged / closed)
    - unique contributor count
    - stale PR count (open > 30 days)
    """
    fmt = {"owner": owner, "repo": repo}

    open_issues = _extract_int(_run(_OPEN_ISSUES_SQL.format(**fmt)), "open_issues")
    merged_count = _extract_int(_run(_MERGED_PRS_SQL.format(**fmt)), "merged_count")
    closed_count = _extract_int(_run(_CLOSED_PRS_SQL.format(**fmt)), "closed_count")
    contributor_count = _extract_int(_run(_CONTRIBUTORS_SQL.format(**fmt)), "contributor_count")
    stale_prs = _extract_int(_run(_STALE_PRS_SQL.format(**fmt)), "stale_count")

    merge_rate = round(merged_count / closed_count, 4) if closed_count > 0 else 0.0

    return RepoStats(
        open_issues=open_issues,
        pr_merge_rate=merge_rate,
        contributor_count=contributor_count,
        stale_prs=stale_prs,
    )


# ---------------------------------------------------------------------------
# GET /api/repo/trends
# ---------------------------------------------------------------------------

@router.get(
    "/trends",
    response_model=RepoTrends,
    summary="Weekly issue creation trends for the last 3 months",
)
async def repo_trends(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
) -> RepoTrends:
    """
    Returns issue count grouped by week for the last 3 months.
    Useful for plotting a sparkline / trend chart in the frontend.
    """
    sql = _TRENDS_SQL.format(owner=owner, repo=repo)
    try:
        # Use an 8-second timeout to prevent blocking the dashboard for large repos.
        raw = coral.run_query(sql, timeout=8)
        trend_points: list[TrendPoint] = _parse_trends(raw)
    except Exception as exc:
        logger.warning(
            "Issue trends query failed or timed out for %s/%s: %s. Returning empty trends.",
            owner, repo, exc
        )
        trend_points = []

    return RepoTrends(owner=owner, repo=repo, trends=trend_points)


def _parse_trends(raw: str) -> list[TrendPoint]:
    """
    Parse coral output into a list of TrendPoint.
    Handles JSON array-of-dicts or newline-separated 'week count' plain text.
    """
    raw = raw.strip()
    if not raw:
        return []

    # Try JSON array
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            points = []
            for row in parsed:
                if isinstance(row, dict):
                    week = str(row.get("week", ""))
                    count = int(row.get("issue_count", 0))
                    if week:
                        points.append(TrendPoint(week=week, issue_count=count))
            return points
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Plain text fallback: "2024-01-01 12"
    import re
    points = []
    for line in raw.splitlines():
        parts = line.strip().split()
        if len(parts) >= 2:
            week = parts[0]
            try:
                count = int(parts[1])
                points.append(TrendPoint(week=week, issue_count=count))
            except ValueError:
                continue
    return points


# ---------------------------------------------------------------------------
# GET /api/repo/commits
# ---------------------------------------------------------------------------

@router.get(
    "/commits",
    response_model=CommitPage,
    summary="Paginated commit history for a branch or SHA",
)
async def repo_commits(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
    ref: str = Query("HEAD", description="Branch name, tag, or full SHA"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(30, ge=1, le=100, description="Commits per page"),
) -> CommitPage:
    """
    Returns a paginated list of commits on *ref* together with the total
    commit count so the caller can compute total pages.

    - Default ref is HEAD (the repository's default branch).
    - page and page_size follow standard 1-based pagination.
    - total lets the frontend compute page count without a second round-trip.
    """
    # The github.commits table has a `ref` column (confirmed via DESCRIBE).
    # Use it to filter by branch/tag; default to the repo's default branch.
    if ref and ref.upper() != "HEAD":
        ref_clause = f"ref = '{ref}'"
    else:
        ref_clause = "1 = 1"  # HEAD = default branch, which is the API default

    fmt = {
        "owner": owner,
        "repo": repo,
        "ref_clause": ref_clause,
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }

    # Running COUNT(*) on commits for large repositories will always time out 
    # because it forces full pagination over the GitHub API. 
    # We will skip the count and provide a generic total (e.g., 999) to keep frontend pagination working.
    total = 999
    raw = _run(_COMMITS_SQL.format(**fmt))
    commits = _parse_commits(raw)

    return CommitPage(
        owner=owner,
        repo=repo,
        ref=ref,
        page=page,
        page_size=page_size,
        total=total,
        commits=commits,
    )


def _parse_commits(raw: str) -> list[CommitSummary]:
    """
    Parse coral output into a list of CommitSummary.
    Handles JSON array-of-dicts or space-separated plain text.

    Coral github.commits columns used:
        sha, commit__author__name, commit__author__date, commit__message

    Plain-text expected format (4 columns, message may contain spaces):
        <sha> <author_name> <date> <message...>
    """
    raw = raw.strip()
    if not raw:
        return []

    # Try JSON array
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            results = []
            for row in parsed:
                if isinstance(row, dict):
                    # Extract date — trim to YYYY-MM-DD if ISO timestamp
                    date_raw = str(row.get("commit__author__date", ""))
                    date_val = date_raw[:10] if len(date_raw) >= 10 else date_raw
                    # Extract message — take first line only
                    msg = str(row.get("commit__message", "")).splitlines()[0]
                    results.append(
                        CommitSummary(
                            sha=str(row.get("sha", ""))[:7],
                            author=str(row.get("commit__author__name", "unknown")),
                            date=date_val,
                            message=msg,
                        )
                    )
            return results
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Plain-text fallback: "abc1234 octocat 2024-03-15 Fix the thing"
    results = []
    for line in raw.splitlines():
        parts = line.strip().split(None, 3)
        if len(parts) >= 3:
            results.append(
                CommitSummary(
                    sha=parts[0][:7],
                    author=parts[1],
                    date=parts[2],
                    message=parts[3] if len(parts) == 4 else "",
                )
            )
    return results