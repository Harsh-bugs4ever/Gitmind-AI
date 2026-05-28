"""
GitMind Backend — Issues endpoints

GET  /api/issues               — list issues + (optional) duplicate pairs
POST /api/issues/embed          — store an embedding for an issue
POST /api/issues/check-duplicate — find semantically similar issues
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Query

from app import embeddings
from app import coral
from app.database import db_cursor
from app.models import (
    IssuesDuplicatePair,
    IssuesListResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    DuplicateMatch,
    EmbedRequest,
    EmbedResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/issues", tags=["Issues"])


# ---------------------------------------------------------------------------
# GET /api/issues
# ---------------------------------------------------------------------------

_ISSUES_SQL = (
    "SELECT number, title, state, created_at, updated_at "
    "FROM github.issues "
    "WHERE owner = '{owner}' AND repo = '{repo}' "
    "ORDER BY created_at DESC "
    "LIMIT {limit}"
)


@router.get(
    "",
    response_model=IssuesListResponse,
    summary="List issues and potential duplicates",
)
async def list_issues(
    owner: str = Query(..., description="GitHub org or user"),
    repo: str = Query(..., description="GitHub repository name"),
    limit: int = Query(50, ge=1, le=200, description="Max issues to return"),
) -> IssuesListResponse:
    """
    Contract endpoint used by the frontend.

    - Returns `issues` as the raw rows from Coral (best-effort JSON parse).
    - Returns `duplicates` as an empty list for now (placeholder), since the
      embedding-based duplicate detection flow lives in `/api/issues/*`.
    """
    sql = _ISSUES_SQL.format(owner=owner, repo=repo, limit=limit)
    try:
        raw = coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql failed fetching issues: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    raw = raw.strip()
    issues: list[object]
    if not raw:
        issues = []
    else:
        try:
            parsed = json.loads(raw)
            issues = parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            # Fallback: return plain-text lines when Coral output isn't JSON.
            issues = [{"raw": line} for line in raw.splitlines() if line.strip()]

    return IssuesListResponse(issues=issues, duplicates=[])


# ---------------------------------------------------------------------------
# POST /api/issues/embed
# ---------------------------------------------------------------------------

@router.post(
    "/embed",
    response_model=EmbedResponse,
    summary="Generate and store an embedding for an issue",
)
async def embed_issue(body: EmbedRequest) -> EmbedResponse:
    """
    1. Generate an embedding for *text* (placeholder today — returns zero vector).
    2. Upsert the embedding into the ``issue_embeddings`` table.
    """
    # Step 1 — embed (placeholder)
    vector = embeddings.embed(body.text)

    # Step 2 — upsert into PostgreSQL
    try:
        with db_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO issue_embeddings (issue_id, embedding)
                VALUES (%s, %s)
                ON CONFLICT (issue_id)
                DO UPDATE SET embedding = EXCLUDED.embedding,
                              created_at = NOW()
                """,
                (body.issue_id, vector),
            )
    except Exception as exc:
        logger.exception("Failed to store embedding for issue %s", body.issue_id)
        raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

    return EmbedResponse(issue_id=body.issue_id, stored=True, dimensions=len(vector))


# ---------------------------------------------------------------------------
# POST /api/issues/check-duplicate
# ---------------------------------------------------------------------------

@router.post(
    "/check-duplicate",
    response_model=DuplicateCheckResponse,
    summary="Check whether an issue text is similar to existing issues",
)
async def check_duplicate(body: DuplicateCheckRequest) -> DuplicateCheckResponse:
    """
    1. Generate an embedding for the incoming *text* (placeholder).
    2. Fetch all stored embeddings from PostgreSQL.
    3. Compute cosine similarity (placeholder) and return matches ≥ 0.8.

    Note: For large repos, consider batching the DB fetch or using
    pgvector for native approximate nearest-neighbour search.
    """
    # Step 1 — embed incoming text (placeholder)
    query_vec = embeddings.embed(body.text)

    # Step 2 — fetch all stored embeddings
    try:
        with db_cursor() as cur:
            cur.execute("SELECT issue_id, embedding FROM issue_embeddings")
            rows = cur.fetchall()
    except Exception as exc:
        logger.exception("Failed to fetch embeddings from database")
        raise HTTPException(status_code=500, detail=f"Database error: {exc}") from exc

    stored = [(row["issue_id"], row["embedding"]) for row in rows]

    # Step 3 — find similar (placeholder returns empty list)
    similar = embeddings.find_similar(query_vec, stored, threshold=0.8)

    matches = [DuplicateMatch(issue_id=issue_id, similarity=sim) for issue_id, sim in similar]
    return DuplicateCheckResponse(matches=matches)
