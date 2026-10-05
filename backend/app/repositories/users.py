import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import Role
from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_patients_by_phone(self, phone: str) -> list[User]:
        result = await self.db.execute(
            select(User).where(
                User.phone == phone, User.role == Role.PATIENT, User.is_active.is_(True)
            )
        )
        return list(result.scalars().all())

    async def list_by_facility_and_role(self, facility_id: uuid.UUID, role) -> list[User]:
        result = await self.db.execute(
            select(User).where(
                User.facility_id == facility_id, User.role == role, User.is_active.is_(True)
            )
        )
        return list(result.scalars().all())

    async def create(self, **kwargs) -> User:
        user = User(**kwargs)
        self.db.add(user)
        await self.db.flush()
        return user
