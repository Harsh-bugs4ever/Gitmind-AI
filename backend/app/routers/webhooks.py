"""
GitMind Backend — POST /api/webhooks/github

Receives GitHub webhook events. On 'issues' events with action 'opened',
calls the embed endpoint internally to store an embedding for the new issue.

Security
--------
If GITHUB_WEBHOOK_SECRET is set, the handler validates the HMAC-SHA256
signature that GitHub sends in the X-Hub-Signature-256 header before
processing the payload. Requests with an invalid signature are rejected
with HTTP 401.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging

import httpx
from fastapi import APIRouter, Header, HTTPException, Request

from app.config import get_settings
from app.models import GitHubWebhookResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# Internal base URL — points to ourselves so we reuse the embed endpoint
_INTERNAL_BASE = "http://localhost:8000"


async def _validate_signature(request: Request, signature_header: str | None) -> None:
    """
    Validate the GitHub HMAC-SHA256 webhook signature.
    Only enforced when GITHUB_WEBHOOK_SECRET is non-empty in settings.
    """
    secret = get_settings().github_webhook_secret
    if not secret:
        # No secret configured — skip validation (useful during development)
        logger.debug("GITHUB_WEBHOOK_SECRET not set; skipping signature validation.")
        return

    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing X-Hub-Signature-256 header.")

    body = await request.body()
    expected_sig = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")


@router.post(
    "/github",
    response_model=GitHubWebhookResponse,
    summary="Receive GitHub webhook events",
)
async def github_webhook(
    request: Request,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
) -> GitHubWebhookResponse:
    """
    Handles GitHub webhook payloads.

    Supported events:
    - ``issues`` / action ``opened``  → calls POST /api/issues/embed internally
    - All other events               → acknowledged and ignored

    The embed call is fire-and-forget via an internal HTTP request so that
    the webhook handler returns quickly (GitHub expects < 10 s response time).
    """
    # 1 — Validate signature (skipped if secret not configured)
    await _validate_signature(request, x_hub_signature_256)

    # 2 — Parse payload
    try:
        body_bytes = await request.body()
        payload = json.loads(body_bytes)
    except (json.JSONDecodeError, Exception) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}") from exc

    event = x_github_event or "unknown"
    action = payload.get("action", "")

    logger.info("Received GitHub webhook: event=%s action=%s", event, action)

    # 3 — React to new issues
    if event == "issues" and action == "opened":
        issue = payload.get("issue", {})
        issue_id = str(issue.get("number", ""))
        title = issue.get("title", "")
        body_text = issue.get("body", "") or ""
        combined_text = f"{title}\n\n{body_text}".strip()

        if issue_id and combined_text:
            try:
                await _trigger_embed(issue_id, combined_text)
                return GitHubWebhookResponse(
                    status="ok",
                    detail=f"Embedding triggered for issue #{issue_id}",
                )
            except Exception as exc:
                # Don't fail the webhook — log and acknowledge
                logger.error("Failed to trigger embed for issue #%s: %s", issue_id, exc)
                return GitHubWebhookResponse(
                    status="ok",
                    detail=f"Acknowledged but embed failed: {exc}",
                )

    # 4 — All other events: acknowledge
    return GitHubWebhookResponse(
        status="ok",
        detail=f"Event '{event}/{action}' received and ignored.",
    )


async def _trigger_embed(issue_id: str, text: str) -> None:
    """
    Fire an internal POST /api/issues/embed request.

    Using an HTTP call rather than calling the function directly keeps the
    webhook handler decoupled from the embed router and ensures the embed
    logic runs through the full FastAPI middleware stack.
    """
    async with httpx.AsyncClient(base_url=_INTERNAL_BASE, timeout=15) as client:
        response = await client.post(
            "/api/issues/embed",
            json={"issue_id": issue_id, "text": text},
        )
        response.raise_for_status()
    logger.info("Embed triggered for issue #%s → %s", issue_id, response.json())
