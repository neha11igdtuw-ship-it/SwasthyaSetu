"""Application settings loaded from environment variables / .env file.

Never log the values of secrets held here (JWT_SECRET_KEY, DB password,
SMTP_PASSWORD, etc).
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

    # Base URL of the frontend, used to build email verification links.
    frontend_base_url: str = "http://localhost:3000"

    # Outgoing verification email is sent via Resend's HTTPS API (not raw
    # SMTP) — hosts like Railway/Render block outbound SMTP ports (25/465/587)
    # on their network, which makes smtplib unusable there regardless of
    # credentials. Never log resend_api_key.
    resend_api_key: str = ""

    # Legacy SMTP settings, kept as a fallback for local/dev environments
    # where outbound SMTP isn't blocked. Never log smtp_password. When
    # nothing is configured, EmailService logs a dev-only verification link
    # instead of sending.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "SwasthyaSetu"

    email_verification_ttl_hours: int = 24
    email_verification_resend_cooldown_seconds: int = 60

    # Comma-separated, case-insensitive allow-lists of email domains per
    # role. Empty = no restriction (falls back to generic email validation).
    allowed_email_domains_patient: str = ""
    allowed_email_domains_health_worker: str = ""
    allowed_email_domains_doctor: str = ""
    allowed_email_domains_admin: str = ""
    allowed_email_domains_facility_admin: str = ""
    allowed_email_domains_facility_staff: str = ""

    rate_limit_enabled: bool = True

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            # Hosting providers (Railway, Supabase, Heroku-style) hand out a
            # plain postgresql:// or postgres:// URL. SQLAlchemy's async
            # engine needs the asyncpg dialect spelled out explicitly.
            if self.database_url.startswith("postgres://"):
                return "postgresql+asyncpg://" + self.database_url[len("postgres://") :]
            if self.database_url.startswith("postgresql://"):
                return "postgresql+asyncpg://" + self.database_url[len("postgresql://") :]
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_email_domains(self) -> dict[str, set[str]]:
        """Role value (string) -> set of allowed lowercase email domains."""
        raw = {
            "PATIENT": self.allowed_email_domains_patient,
            "HEALTH_WORKER": self.allowed_email_domains_health_worker,
            "DOCTOR": self.allowed_email_domains_doctor,
            "ADMIN": self.allowed_email_domains_admin,
            "FACILITY_ADMIN": self.allowed_email_domains_facility_admin,
            "FACILITY_STAFF": self.allowed_email_domains_facility_staff,
        }
        return {
            role: {d.strip().lower() for d in value.split(",") if d.strip()}
            for role, value in raw.items()
        }

    @property
    def resend_configured(self) -> bool:
        return bool(self.resend_api_key and self.smtp_from_email)

    @property
    def smtp_configured(self) -> bool:
        return bool(
            self.smtp_host and self.smtp_username and self.smtp_password and self.smtp_from_email
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
