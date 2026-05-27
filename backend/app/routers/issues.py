"""
GitMind Backend — Issues endpoints

POST /api/issues/embed          — store an embedding for an issue
POST /api/issues/check-duplicate — find semantically similar issues
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app import embeddings
from app.database import db_cursor
from app.models import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    DuplicateMatch,
    EmbedRequest,
    EmbedResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/issues", tags=["Issues"])


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
