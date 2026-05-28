"""
GitMind Backend — POST /api/chat

Accepts a natural-language question about a GitHub repo, converts it to SQL
<<<<<<< HEAD
via Gemini, runs it through `coral sql`, then summarises the
result (placeholder).
=======
via Gemini, runs it through `coral sql`, then summarises the result.
>>>>>>> ff6d417 (Done AI work)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app import coral, gemini
from app import coral, gemini
from app.models import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse, summary="Ask a natural-language question about a repo")
async def chat(body: ChatRequest) -> ChatResponse:
    """
    1. Convert *question* → SQL using Gemini.
    1. Convert *question* → SQL using Gemini.
    2. Execute the SQL with `coral sql`.
    3. Summarise the raw result using Gemini.
    3. Summarise the raw result using Gemini.
    4. Return the answer + the generated SQL for transparency.
    """
    # Step 1 — generate SQL
    # Step 1 — generate SQL
    try:
        sql = gemini.generate_sql(body.question, body.owner, body.repo)
        sql = gemini.generate_sql(body.question, body.owner, body.repo)
    except Exception as exc:
        logger.exception("SQL generation failed")
        raise HTTPException(status_code=500, detail=f"SQL generation error: {exc}") from exc

    # Step 2 — run via coral
    try:
        raw_result = coral.run_query(sql)
    except coral.CoralError as exc:
        logger.error("coral sql failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Step 3 — summarise result
    # Step 3 — summarise result
    try:
        answer = gemini.summarise_query_result(body.question, sql, raw_result)
        answer = gemini.summarise_query_result(body.question, sql, raw_result)
    except Exception as exc:
        logger.exception("Result summarisation failed")
        raise HTTPException(status_code=500, detail=f"Summarisation error: {exc}") from exc

    return ChatResponse(answer=answer, sql=sql)
