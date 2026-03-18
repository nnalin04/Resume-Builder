"""
Application configuration — validated on startup via pydantic-settings.
All values come from environment variables (or .env file).
Missing required values raise a clear error at boot time.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── AI ──────────────────────────────────────────────────────────────────
    gemini_api_key: str = ""

    # ── Auth ────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    google_client_id: str = ""
    google_client_secret: str = ""

    # ── Cashfree ─────────────────────────────────────────────────────────────
    cashfree_app_id: str = ""
    cashfree_secret_key: str = ""
    cashfree_env: str = "sandbox"          # sandbox | production
    cashfree_webhook_url: str = ""

    # ── App ──────────────────────────────────────────────────────────────────
    frontend_origin: str = "http://localhost:5173"
    database_url: str = "sqlite:///./resume_builder.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
