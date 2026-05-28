"""
GitMind Backend — authentication endpoints.

Public endpoints:
- GET /auth/github/login
- GET /auth/github/callback

Protected endpoint:
- GET /auth/me
"""
from __future__ import annotations

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse

from app.auth import (
    create_oauth_state,
    exchange_github_code,
    fetch_github_user,
    mint_access_token,
    require_auth,
    validate_oauth_state,
)
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/github/login", summary="Start GitHub OAuth login")
async def github_login() -> RedirectResponse:
    settings = get_settings()
    state = create_oauth_state()
    query = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_redirect_uri,
            "scope": "read:user user:email",
            "state": state,
        }
    )
    url = f"https://github.com/login/oauth/authorize?{query}"
    return RedirectResponse(url=url, status_code=302)


@router.get("/github/callback", summary="Handle GitHub OAuth callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    validate_oauth_state(state)
    access_token = await exchange_github_code(code)
    user = await fetch_github_user(access_token)
    token = mint_access_token(user)
    settings = get_settings()
    query = urlencode({"token": token})
    return RedirectResponse(
        url=f"{settings.frontend_auth_success_url}?{query}",
        status_code=302,
    )


@router.get("/me", summary="Get current authenticated user")
async def me(current_user: dict = Depends(require_auth)) -> dict:
    return {"user": current_user}

