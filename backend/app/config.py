from __future__ import annotations
from functools import lru_cache
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Auth & OAuth ---
    auth_secret_key: str = Field(default="supersecretkey-change-in-prod", description="Secret key for JWT minting")
    github_client_id: str = Field(default="", description="GitHub OAuth Client ID")
    github_client_secret: str = Field(default="", description="GitHub OAuth Client Secret")
    github_redirect_uri: str = Field(default="http://localhost:8000/auth/github/callback", description="GitHub OAuth Redirect URI")
    frontend_auth_success_url: str = Field(default="http://localhost:5173/auth/callback", description="URL to redirect to on frontend after auth")

    # --- AI keys (optional until Gemini / sentence-transformers are wired up) ---
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    github_token: str = Field(default="", description="GitHub Personal Access Token")
    github_webhook_secret: str = Field(default="", description="HMAC secret for GitHub webhooks")

    # --- Database (defaults to local dev DB) ---
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/gitmind"
    )
    
    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
