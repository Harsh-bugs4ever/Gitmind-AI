"""
GitMind — ai/classifier.py
============================
Issue classification using Gemini.

Classifies a GitHub issue into:
  - type  : bug | feature | enhancement | question | documentation | other
  - priority : high | medium | low
  - summary  : one-sentence plain-English summary

Usage (backend can import this for the webhook pipeline):
    from ai.classifier import classify_issue
"""
from __future__ import annotations

import json
import logging
import os

import google.generativeai as genai

logger = logging.getLogger(__name__)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
_MODEL = "gemini-1.5-flash"


def classify_issue(title: str, body: str = "") -> dict:
    """
    Classify a GitHub issue using Gemini.

    Args:
        title : issue title string
        body  : issue body/description (can be empty)

    Returns:
        dict with keys:
            type     : "bug" | "feature" | "enhancement" | "question" | "documentation" | "other"
            priority : "high" | "medium" | "low"
            summary  : one-sentence plain-English summary of the issue

    Example:
        classify_issue("App crashes on login", "Steps to reproduce: tap login button...")
        → {"type": "bug", "priority": "high", "summary": "App crashes when the login button is tapped."}
    """
    combined = f"Title: {title}\n\nDescription:\n{body[:2000]}" if body else f"Title: {title}"

    prompt = f"""You are a GitHub issue triaging assistant.

Analyse this GitHub issue and classify it:

{combined}

Return ONLY a valid JSON object — no markdown, no explanation, no backticks.

Rules:
- type     must be one of: bug, feature, enhancement, question, documentation, other
- priority must be one of: high, medium, low
  - high   = crashes, data loss, security issue, blocking users
  - medium = broken feature, performance problem, UX issue
  - low    = minor cosmetic, typo, nice-to-have
- summary  = one sentence (max 20 words) describing what the issue is about

Required format:
{{
  "type": "bug",
  "priority": "high",
  "summary": "App crashes when the login button is tapped on iOS."
}}"""

    try:
        model = genai.GenerativeModel(_MODEL)
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown fences if model adds them
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(line for line in lines if not line.startswith("```")).strip()

        parsed = json.loads(raw)

        # Validate and sanitise values
        valid_types = {"bug", "feature", "enhancement", "question", "documentation", "other"}
        valid_priorities = {"high", "medium", "low"}

        result = {
            "type":     parsed.get("type", "other") if parsed.get("type") in valid_types else "other",
            "priority": parsed.get("priority", "medium") if parsed.get("priority") in valid_priorities else "medium",
            "summary":  str(parsed.get("summary", title))[:200],
        }

        logger.info("classify_issue OK — type=%s priority=%s", result["type"], result["priority"])
        return result

    except (json.JSONDecodeError, Exception) as exc:
        logger.exception("Gemini classify_issue failed: %s", exc)
        # Safe fallback — never crash the webhook handler
        return {
            "type":     "other",
            "priority": "medium",
            "summary":  title[:200],
        }


# ---------------------------------------------------------------------------
# Quick test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    tests = [
        ("App crashes on login", "Tapping the login button on iOS 17 causes an immediate crash."),
        ("Add dark mode support", "Would be great to have a dark mode toggle in settings."),
        ("Typo in README", "Line 42 says 'recieve' — should be 'receive'."),
        ("How do I reset my password?", ""),
    ]

    for title, body in tests:
        result = classify_issue(title, body)
        print(f"\nTitle  : {title}")
        print(f"Result : {result}")
