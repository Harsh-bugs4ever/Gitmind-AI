"""
GitMind — ai/embeddings.py
===========================
Duplicate Issue Detection using sentence-transformers.

Usage (backend imports this):
    from ai.embeddings import embed, find_similar
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Lazy-load model — downloads ~90MB once, then cached automatically
_MODEL = None

def _get_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers model...")
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model ready — 384-dim embeddings.")
    return _MODEL


def embed(text: str) -> list[float]:
    """
    Generate a 384-dim embedding vector for an issue.

    Args:
        text : issue title + body combined
               e.g. "Login crashes on iOS 17 — App freezes when tapping login"

    Returns:
        List of 384 floats (L2-normalised).
        Backend stores this in PostgreSQL pgvector column.
    """
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Cosine similarity between two normalised vectors.
    Returns float in [-1.0, 1.0]. 1.0 = identical, 0.0 = unrelated.
    """
    return sum(x * y for x, y in zip(a, b))


def find_similar(
    query_embedding: list[float],
    stored: list[tuple[str, list[float]]],
    threshold: float = 0.80,
) -> list[tuple[str, float]]:
    """
    Find duplicate/similar issues by comparing embeddings.

    Args:
        query_embedding : embedding of the NEW issue being checked
        stored          : list of (issue_id, embedding) fetched from DB
        threshold       : similarity cutoff — 0.80 = similar, 0.90 = near identical

    Returns:
        List of (issue_id, score) above threshold, sorted highest first.
        Backend uses this to show "possible duplicate" warnings on the UI.
    """
    if not stored:
        return []

    results = []
    for issue_id, stored_vec in stored:
        try:
            score = cosine_similarity(query_embedding, stored_vec)
            if score >= threshold:
                results.append((issue_id, round(score, 4)))
        except Exception as e:
            logger.warning("Skipping issue %s: %s", issue_id, e)

    results.sort(key=lambda x: x[1], reverse=True)
    logger.info("find_similar: %d checked, %d matched (threshold=%.2f)",
                len(stored), len(results), threshold)
    return results


# ── Quick test ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    e1 = embed("App crashes on login")
    e2 = embed("Login button freezes the application")
    e3 = embed("Dark mode not working on settings page")

    stored = [("issue-1", e1), ("issue-3", e3)]
    matches = find_similar(e2, stored)

    print("Similar issues found:")
    for issue_id, score in matches:
        print(f"  {issue_id} — score: {score}")
