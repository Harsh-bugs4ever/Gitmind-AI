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

    # AI
    gemini_api_key: str = Field(default="")
    gemini_model: str = Field(default="gemini-2.5-flash")
    
    # GitHub
    github_token: str = Field(default="")
    github_webhook_secret: str = Field(default="")
    github_client_id: str = Field(default="")
    github_client_secret: str = Field(default="")
    github_redirect_uri: str = Field(default="")
    
    # Auth
    auth_secret_key: str = Field(default="changeme-use-a-real-secret")
    
    # Frontend
    frontend_auth_success_url: str = Field(default="http://localhost:5173/auth/callback")
    
    # Database
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/gitmind"
    )
    
    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
