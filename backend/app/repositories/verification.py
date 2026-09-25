import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import EmailVerificationToken


class VerificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, *, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> EmailVerificationToken:
        token = EmailVerificationToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.db.add(token)
        await self.db.flush()
        return token

    async def get_active_by_hash(self, token_hash: str) -> EmailVerificationToken | None:
        result = await self.db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.used_at.is_(None),
                EmailVerificationToken.expires_at > datetime.utcnow(),
            )
        )
        return result.scalar_one_or_none()

    async def get_latest_for_user(self, user_id: uuid.UUID) -> EmailVerificationToken | None:
        result = await self.db.execute(
            select(EmailVerificationToken)
            .where(EmailVerificationToken.user_id == user_id)
            .order_by(EmailVerificationToken.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def invalidate_all_for_user(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(EmailVerificationToken)
            .where(EmailVerificationToken.user_id == user_id, EmailVerificationToken.used_at.is_(None))
            .values(used_at=datetime.utcnow())
        )
