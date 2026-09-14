"""Application settings loaded from environment variables / .env file.

Never log the values of secrets held here (JWT_SECRET_KEY, DB password, etc).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    postgres_user: str = "swasthyasetu"
    postgres_password: str = "change_me"
    postgres_db: str = "swasthyasetu"
    postgres_host: str = "localhost"
    postgres_port: int = 55432

    database_url: str = ""
    test_database_url: str = ""

    jwt_secret_key: str = "insecure-dev-secret-change-me-32bytes-min!"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    cors_origins: str = "http://localhost:3000"

    # Gemini API key for the AI-assisted symptom summary pipeline. Never log
    # this value. Left empty in dev/test — the summarize endpoint returns a
    # structured error (not a crash) when it's unset.
    gemini_api_key: str = ""

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
