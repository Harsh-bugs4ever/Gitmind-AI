"""
GitMind Backend — app/embeddings.py
=====================================
Real duplicate issue detection using sentence-transformers.

Drop this file into: backend/app/embeddings.py  (replaces the stub)
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy model load — downloads ~90 MB on first call, then cached on disk
# ---------------------------------------------------------------------------

_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)…")
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model ready — 384-dim vectors.")
    return _MODEL


# ---------------------------------------------------------------------------
# Public API — called by routers/issues.py
# ---------------------------------------------------------------------------

def embed(text: str) -> list[float]:
    """
    Generate a 384-dim L2-normalised embedding vector for an issue.

    Args:
        text : issue title + body combined string

    Returns:
        list of 384 floats — stored in PostgreSQL issue_embeddings table.
    """
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Dot product of two L2-normalised vectors = cosine similarity.
    Returns float in [-1.0, 1.0].  1.0 = identical, 0.0 = unrelated.
    """
    return sum(x * y for x, y in zip(a, b))


def find_similar(
    query_embedding: list[float],
    stored: list[tuple[str, list[float]]],
    threshold: float = 0.8,
) -> list[tuple[str, float]]:
    """
    Find issues whose embeddings are above the similarity threshold.

    Args:
        query_embedding : embedding of the new issue being checked
        stored          : list of (issue_id, embedding) rows from PostgreSQL
        threshold       : cosine similarity cutoff (default 0.8)

    Returns:
        List of (issue_id, score) sorted highest-first — only above threshold.
        routers/issues.py wraps these into DuplicateMatch objects.
    """
    if not stored:
        return []

    results = []
    for issue_id, stored_vec in stored:
        try:
            score = cosine_similarity(query_embedding, stored_vec)
            if score >= threshold:
                results.append((issue_id, round(score, 4)))
        except Exception as exc:
            logger.warning("Skipping issue %s during similarity check: %s", issue_id, exc)

    results.sort(key=lambda x: x[1], reverse=True)
    logger.info(
        "find_similar: %d stored checked, %d matched at threshold=%.2f",
        len(stored), len(results), threshold,
    )
    return results
