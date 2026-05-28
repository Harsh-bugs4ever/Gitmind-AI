"""
GitMind Backend — authentication helpers.

Implements:
- GitHub OAuth code exchange and profile fetch
- HMAC-signed bearer token mint/verify
- FastAPI dependency to protect API routes
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

_bearer = HTTPBearer(auto_error=False)
_STATE_TTL_SECONDS = 600
_TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12h
_state_store: dict[str, int] = {}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _sign(message: bytes, secret: str) -> str:
    return _b64url_encode(hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest())


def mint_access_token(user: dict[str, Any]) -> str:
    settings = get_settings()
    if not settings.auth_secret_key:
        raise RuntimeError("AUTH_SECRET_KEY is not configured")

    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user.get("id")),
        "login": user.get("login", ""),
        "name": user.get("name", ""),
        "avatar_url": user.get("avatar_url", ""),
        "iat": now,
        "exp": now + _TOKEN_TTL_SECONDS,
    }
    head = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{head}.{body}".encode("ascii")
    sig = _sign(signing_input, settings.auth_secret_key)
    return f"{head}.{body}.{sig}"


def verify_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.auth_secret_key:
        raise HTTPException(status_code=500, detail="AUTH_SECRET_KEY is not configured")

    try:
        head, body, sig = token.split(".", 2)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token format") from exc

    signing_input = f"{head}.{body}".encode("ascii")
    expected = _sign(signing_input, settings.auth_secret_key)
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")

    try:
        payload = json.loads(_b64url_decode(body).decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token payload") from exc

    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="Token expired")

    return payload


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return verify_access_token(credentials.credentials)


def create_oauth_state() -> str:
    now = int(time.time())
    # cleanup old entries
    for key, expires in list(_state_store.items()):
        if expires < now:
            _state_store.pop(key, None)
    state = secrets.token_urlsafe(24)
    _state_store[state] = now + _STATE_TTL_SECONDS
    return state


def validate_oauth_state(state: str) -> None:
    expires = _state_store.pop(state, None)
    if not expires or expires < int(time.time()):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")


async def exchange_github_code(code: str) -> str:
    settings = get_settings()
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured")

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
        )
        response.raise_for_status()
        data = response.json()
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail=f"GitHub token exchange failed: {data}")
    return str(token)


async def fetch_github_user(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "gitmind-backend",
            },
        )
        response.raise_for_status()
        return response.json()

