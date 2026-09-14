import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import UnauthorizedError, ValidationAppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.enums import Role
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.repositories.users import UserRepository
from app.schemas.auth import TokenPair, UserRegister


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    async def register(self, data: UserRegister) -> User:
        existing = await self.users.get_by_email(data.email)
        if existing:
            raise ValidationAppError("A user with this email already exists")
        user = await self.users.create(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
            phone=data.phone,
            facility_id=data.facility_id,
        )
        if data.role == Role.PATIENT:
            await PatientRepository(self.db).create(
                full_name=data.full_name,
                phone=data.phone,
                village=data.village,
                preferred_language=data.preferred_language,
                user_id=user.id,
                facility_id=data.facility_id,
            )
        await self.db.commit()
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        return user

    @staticmethod
    def issue_tokens(user: User) -> TokenPair:
        claims = {"sub": str(user.id), "role": user.role.value}
        return TokenPair(
            access_token=create_access_token(claims),
            refresh_token=create_refresh_token(claims),
        )

    async def refresh(self, refresh_token: str) -> TokenPair:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid or expired refresh token")
        try:
            user_id = uuid.UUID(payload["sub"])
        except (KeyError, ValueError, TypeError) as exc:
            raise UnauthorizedError("Invalid or expired refresh token") from exc
        user = await self.users.get(user_id)
        if user is None or not user.is_active:
            raise UnauthorizedError("User not found or inactive")
        return self.issue_tokens(user)
