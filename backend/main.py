"""
GitMind Backend — FastAPI application entry point.

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Or via the convenience script:
    python main.py
"""
from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import close_pool, init_db, init_pool
from app.models import HealthResponse
from app.auth import require_auth
from app.routers import auth, chat, dashboard, issues, release_notes, releases, repo, webhooks

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Manage resources that must outlive individual requests."""
    logger.info("GitMind backend starting up…")
    try:
        init_pool()
        init_db()
        logger.info("Database ready.")
    except Exception as exc:
        logger.warning(
            "Database initialisation failed (%s). "
            "Endpoints requiring the DB will return errors until it is available.",
            exc,
        )
    yield  # ← application is running here
    logger.info("GitMind backend shutting down…")
    close_pool()


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title="GitMind API",
        description=(
            "AI-powered GitHub repository intelligence platform.\n\n"
            "Provides natural-language Q&A, duplicate issue detection, "
            "release note generation, repository statistics, and trend analysis."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # --- CORS ---
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://gitmind.netlify.app"],   # Specific origins needed for credentials
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Routers ---
    application.include_router(auth.router)
    application.include_router(chat.router, dependencies=[Depends(require_auth)])
    application.include_router(issues.router, dependencies=[Depends(require_auth)])
    application.include_router(releases.router, dependencies=[Depends(require_auth)])
    application.include_router(release_notes.router, dependencies=[Depends(require_auth)])
    application.include_router(dashboard.router, dependencies=[Depends(require_auth)])
    application.include_router(repo.router, dependencies=[Depends(require_auth)])
    application.include_router(webhooks.router, dependencies=[Depends(require_auth)])

    # --- Health check ---
    @application.get(
        "/health",
        response_model=HealthResponse,
        tags=["Health"],
        summary="Server liveness probe",
    )
    async def health() -> HealthResponse:
        """Returns ``{ "status": "ok" }`` if the server is running."""
        return HealthResponse(status="ok")

    return application


app = create_app()


# ---------------------------------------------------------------------------
# Dev-server convenience
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info",
    )