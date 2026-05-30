"""
GitMind Backend - Embeddings
Real duplicate issue detection using sentence-transformers.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model ready - 384-dim vectors.")
    return _MODEL


def embed(text: str) -> list[float]:
    """
    Generate a 384-dimensional embedding vector for the given text.

    Args:
        text: issue title + body combined string

    Returns:
        list of 384 floats stored in PostgreSQL issue_embeddings table.
    """
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Compute cosine similarity between two L2-normalised vectors.
    Returns float in [-1.0, 1.0]. 1.0 = identical, 0.0 = unrelated.
    """
    if len(a) != len(b):
        raise ValueError(f"Vector length mismatch: {len(a)} vs {len(b)}")
    return sum(x * y for x, y in zip(a, b))


def find_similar(
    query_embedding: list[float],
    stored: list[tuple[str, list[float]]],
    threshold: float = 0.8,
) -> list[tuple[str, float]]:
    """
    Compare query_embedding against all stored issue embeddings.
    Returns issues with cosine similarity >= threshold, sorted by score desc.

    Args:
        query_embedding: embedding of the new issue being checked
        stored: list of (issue_id, embedding_vector) from the DB
        threshold: minimum similarity to flag as duplicate (0.0-1.0)

    Returns:
        List of (issue_id, similarity_score) for matches above threshold,
        sorted highest score first.
    """
    if not stored:
        return []

    results = []
    for issue_id, stored_vec in stored:
        try:
            score = cosine_similarity(query_embedding, stored_vec)
            if score >= threshold:
                results.append((issue_id, round(score, 4)))
        except (ValueError, TypeError) as e:
            logger.warning("Skipping issue %s due to embedding error: %s", issue_id, e)
            continue

    results.sort(key=lambda x: x[1], reverse=True)
    logger.info(
        "find_similar: checked %d stored issues, found %d matches (threshold=%.2f)",
        len(stored), len(results), threshold,
    )
    return results
