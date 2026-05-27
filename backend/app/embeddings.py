"""
GitMind Backend — Embedding placeholder.

TODO: Replace the stub functions below with real sentence-transformers
      calls once the AI/ML engineer integrates the model.

      Suggested implementation:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")

        def embed(text: str) -> list[float]:
            return _MODEL.encode(text, normalize_embeddings=True).tolist()
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Stub helpers
# ---------------------------------------------------------------------------

def embed(text: str) -> list[float]:
    """
    TODO: Generate a real sentence-transformers embedding.

    Currently returns a fixed-length zero vector (384 dims — matches
    all-MiniLM-L6-v2 output size) so the rest of the API surface works
    end-to-end without the model installed.
    """
    logger.warning("embed() is a placeholder — returning zero vector.")
    return [0.0] * 384


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    TODO: Compute real cosine similarity once embed() returns real vectors.

    Placeholder always returns 0.0 (no match).
    """
    logger.warning("cosine_similarity() is a placeholder — returning 0.0.")
    return 0.0


def find_similar(
    query_embedding: list[float],
    stored: list[tuple[str, list[float]]],
    threshold: float = 0.8,
) -> list[tuple[str, float]]:
    """
    TODO: Compare query_embedding against stored embeddings using cosine
          similarity and return matches above *threshold*.

    Placeholder returns an empty list (no duplicates found).
    """
    logger.warning("find_similar() is a placeholder — returning empty list.")
    return []
