"""
GitMind Backend — Embeddings (AI/ML Engineer file)
===================================================
Drop this file into:  backend/app/embeddings.py

This replaces the placeholder stubs with real sentence-transformers calls.
The backend guy's routers already import and call these 3 functions — no
changes needed on his side.

Dependencies:
    pip install sentence-transformers

The model (~90MB) is downloaded on first run and cached automatically.
"""
from __future__ import annotations

import logging
import math

logger = logging.getLogger(__name__)

# ── Lazy-load the model (only downloaded once, cached by sentence-transformers)
_MODEL = None

def _get_model():
    global _MODEL
    if _MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformers model all-MiniLM-L6-v2...")
            _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Model loaded OK — 384-dim embeddings ready.")
        except ImportError:
            logger.error(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )
            raise
    return _MODEL


# ---------------------------------------------------------------------------
# 1. embed  —  called by routers/issues.py
# ---------------------------------------------------------------------------

def embed(text: str) -> list[float]:
    """
    Generate a 384-dimensional embedding vector for the given text.

    Args:
        text : issue title + body, e.g. "Login crashes on iOS 17"

    Returns:
        A list of 384 floats (L2-normalised).
        The issues router stores this in PostgreSQL and later fetches
        all vectors for similarity comparison.
    """
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


# ---------------------------------------------------------------------------
# 2. cosine_similarity  —  utility (used internally by find_similar)
# ---------------------------------------------------------------------------

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Since embed() returns L2-normalised vectors, this is just the dot product.

    Returns a float in [-1.0, 1.0].
    1.0 = identical, 0.0 = unrelated, -1.0 = opposite.
    """
    if len(a) != len(b):
        raise ValueError(f"Vector length mismatch: {len(a)} vs {len(b)}")

    # Dot product (works because both vectors are already normalised)
    dot = sum(x * y for x, y in zip(a, b))
    return dot


# ---------------------------------------------------------------------------
# 3. find_similar  —  called by routers/issues.py
# ---------------------------------------------------------------------------

def find_similar(
    query_embedding: list[float],
    stored: list[tuple[str, list[float]]],
    threshold: float = 0.8,
) -> list[tuple[str, float]]:
    """
    Compare query_embedding against all stored issue embeddings.
    Returns issues with cosine similarity >= threshold, sorted by score desc.

    Args:
        query_embedding : embedding of the new issue being checked
        stored          : list of (issue_id, embedding_vector) from the DB
        threshold       : minimum similarity to flag as duplicate (0.0–1.0)
                          0.8 = very similar, 0.9 = nearly identical

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

    # Sort by similarity descending (most similar first)
    results.sort(key=lambda x: x[1], reverse=True)

    logger.info(
        "find_similar: checked %d stored issues, found %d matches (threshold=%.2f)",
        len(stored), len(results), threshold,
    )
    return results
