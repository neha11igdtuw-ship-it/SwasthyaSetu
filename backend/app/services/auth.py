import uuid

from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import EmailNotVerifiedError, UnauthorizedError, ValidationAppError
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
from app.schemas.auth import AdminCreateUser, TokenPair, UserRegister
from app.services.verification import VerificationService

# A precomputed Argon2 hash of a random value. Used to pay the same hashing
# cost on an unknown-email login attempt as on a real one, so response time
# doesn't leak account existence.
_DUMMY_HASH = hash_password(str(uuid.uuid4()))


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    async def _create_user(self, data: UserRegister, *, is_verified: bool) -> User:
        existing = await self.users.get_by_email(data.email)
        if existing:
            raise ValidationAppError(
                "An account with these details already exists. Please sign in instead."
            )
        address = data.address
        user = await self.users.create(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
            phone=data.phone,
            facility_id=data.facility_id,
            is_verified=is_verified,
            address_line=address.address_line if address else None,
            village_area=address.village_area if address else None,
            city_district=address.city_district if address else None,
            state=address.state if address else None,
            pincode=address.pincode if address else None,
            landmark=address.landmark if address else None,
        )
        if data.role == Role.PATIENT:
            await PatientRepository(self.db).create(
                full_name=data.full_name,
                phone=data.phone,
                village=data.village or (address.village_area if address else None),
                preferred_language=data.preferred_language,
                user_id=user.id,
                facility_id=data.facility_id,
            )
        await self.db.commit()
        return user

    async def register(
        self, data: UserRegister, *, background: BackgroundTasks | None = None
    ) -> User:
        """Public self-registration: account starts unverified and a
        verification email is sent. Role/domain/address rules are enforced
        one layer up by the PublicUserRegister schema."""
        user = await self._create_user(data, is_verified=False)
        await VerificationService(self.db).issue(user, background=background)
        return user

    async def create_trusted_user(self, data: UserRegister) -> User:
        """Internal/trusted account creation (test fixtures, seed-adjacent
        flows) that bypasses the public self-registration restrictions and
        marks the account verified immediately. Not exposed over HTTP."""
        return await self._create_user(data, is_verified=True)

    async def admin_create_user(self, data: AdminCreateUser) -> User:
        """POST /auth/users — admin-only provisioning of DOCTOR/ADMIN/etc
        accounts. The admin vouches for the account, so it's created
        pre-verified with no email round trip."""
        existing = await self.users.get_by_email(data.email)
        if existing:
            raise ValidationAppError(
                "An account with these details already exists. Please sign in instead."
            )
        user = await self.users.create(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
            phone=data.phone,
            facility_id=data.facility_id,
            is_verified=True,
        )
        await self.db.commit()
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if user is None:
            verify_password(password, _DUMMY_HASH)
            raise UnauthorizedError("Invalid email or password")
        if not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        if not user.is_verified and get_settings().email_verification_required:
            raise EmailNotVerifiedError("Please verify your email address before signing in.")
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
