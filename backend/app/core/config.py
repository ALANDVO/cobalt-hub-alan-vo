"""Application configuration using pydantic-settings."""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Cobalt Hub"
    app_version: str = "1.0.1"
    debug: bool = False
    environment: str = "development"

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # Database
    database_url: str = "sqlite+aiosqlite:///./cobalt_hub.db"

    # Authentication (OIDC/Keycloak)
    oidc_enabled: bool = True
    oidc_issuer_url: str = "http://127.0.0.1:8080/realms/cobalt-hub"
    oidc_client_id: str = "cobalt-hub-backend"
    oidc_client_secret: str = ""
    oidc_audience: str = "cobalt-hub-api"
    oidc_jwks_url: str = "http://127.0.0.1:8080/realms/cobalt-hub/protocol/openid-connect/certs"

    # LLM Configuration (optional, for opt-in explanations)
    llm_api_key: Optional[str] = None
    llm_provider: str = "openai-compatible"
    llm_model: str = "gpt-4o-mini"
    llm_base_url: Optional[str] = None
    llm_timeout: float = 30.0

    # CORS
    cors_origins: list[str] = ["http://127.0.0.1:5173", "http://localhost:5173"]

    # Demo mode (local-only, explicitly enabled)
    demo_mode: bool = False
    demo_user_id: str = "demo-user"
    demo_user_roles: list[str] = ["viewer", "operator"]


def get_settings() -> Settings:
    """Get settings instance."""
    return Settings()