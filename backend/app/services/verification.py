import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import ValidationAppError
from app.models.user import User
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.services.email import EmailService


def _hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


class VerificationService:
    def __init__(self, db: AsyncSession, emailer: EmailService | None = None):
        self.db = db
        self.tokens = VerificationRepository(db)
        self.users = UserRepository(db)
        self.emailer = emailer or EmailService()

    async def issue(self, user: User, *, background: BackgroundTasks | None = None) -> None:
        settings = get_settings()
        await self.tokens.invalidate_all_for_user(user.id)
        raw_token = secrets.token_urlsafe(32)
        await self.tokens.create(
            user_id=user.id,
            token_hash=_hash(raw_token),
            expires_at=datetime.utcnow() + timedelta(hours=settings.email_verification_ttl_hours),
        )
        await self.db.commit()

        verify_url = f"{settings.frontend_base_url}/verify-email?token={raw_token}"

        def _send() -> None:
            self.emailer.send_verification_email(to=user.email, full_name=user.full_name, verify_url=verify_url)

        if background is not None:
            background.add_task(_send)
        else:
            _send()

    async def consume(self, raw_token: str) -> User:
        token = await self.tokens.get_active_by_hash(_hash(raw_token))
        if token is None:
            raise ValidationAppError("This verification link is invalid or has expired")
        user = await self.users.get(token.user_id)
        if user is None:
            raise ValidationAppError("This verification link is invalid or has expired")
        token.used_at = datetime.utcnow()
        user.is_verified = True
        await self.db.commit()
        return user

    async def resend(self, email: str, *, background: BackgroundTasks | None = None) -> None:
        """Always completes silently (no enumeration of which emails exist
        or are already verified) — callers should return a generic 202."""
        settings = get_settings()
        user = await self.users.get_by_email(email.strip().lower())
        if user is None or user.is_verified:
            return
        latest = await self.tokens.get_latest_for_user(user.id)
        if latest is not None:
            age = (datetime.utcnow() - latest.created_at).total_seconds()
            if age < settings.email_verification_resend_cooldown_seconds:
                return
        await self.issue(user, background=background)
