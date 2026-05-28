"""
GitMind Backend — Application configuration.

Loads environment variables from a .env file using python-dotenv and exposes
them as a typed Settings object via pydantic-settings.

All fields have safe defaults so the server starts even without a .env file.
Fill in the real values in .env before enabling the AI/ML features.
"""
from __future__ import annotations

from functools import lru_cache

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Application-wide settings pulled from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- AI keys (optional until Gemini / sentence-transformers are wired up) ---
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    github_token: str = Field(default="", description="GitHub Personal Access Token")
    github_webhook_secret: str = Field(default="", description="HMAC secret for GitHub webhooks")

    # --- Database (defaults to local dev DB) ---
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/gitmind",
        description="PostgreSQL connection string",
    )

    # --- Server ---
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton for the process lifetime)."""
    return Settings()
