import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError, UnauthorizedError
from app.models.enums import Role
from app.models.user import User
from app.models.verification import PhoneOtp
from app.repositories.users import UserRepository


def _code_hash(phone: str, code: str) -> str:
    secret = get_settings().jwt_secret_key
    return hmac.new(secret.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


async def _send_sms(phone: str, code: str) -> None:
    settings = get_settings()
    if not settings.phone_otp_sms_configured:
        raise ServiceUnavailableError("Mobile sign-in is not configured. Please contact support.")
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                data={
                    "From": settings.twilio_from_number,
                    "To": f"+91{phone}",
                    "Body": f"Your SwasthyaSetu sign-in code is {code}. It expires in {settings.phone_otp_ttl_minutes} minutes.",
                },
            )
            response.raise_for_status()
    except (httpx.HTTPError, ValueError) as exc:
        raise ServiceUnavailableError(
            "We could not send a code right now. Please try again."
        ) from exc


class PhoneOtpService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)

    async def request(self, phone: str) -> tuple[str | None, str]:
        settings = get_settings()
        dev_delivery = (
            settings.environment.lower() == "development"
            and settings.phone_otp_allow_development_code
            and not settings.phone_otp_sms_configured
        )
        if not settings.phone_otp_sms_configured and not dev_delivery:
            raise ServiceUnavailableError(
                "Mobile sign-in is not configured. Please contact support."
            )

        users = await self.users.get_patients_by_phone(phone)
        if len(users) != 1:
            return None, "If this number has a patient account, a sign-in code will be sent."

        user = users[0]
        code = f"{secrets.randbelow(1_000_000):06d}"
        now = datetime.utcnow()
        await self.db.execute(
            delete(PhoneOtp).where(PhoneOtp.created_at < now - timedelta(days=30))
        )
        previous = await self.db.execute(
            select(PhoneOtp).where(
                PhoneOtp.user_id == user.id,
                PhoneOtp.used_at.is_(None),
            )
        )
        for row in previous.scalars():
            row.used_at = now
        otp = PhoneOtp(
            user_id=user.id,
            phone=phone,
            code_hash=_code_hash(phone, code),
            expires_at=now + timedelta(minutes=settings.phone_otp_ttl_minutes),
        )
        self.db.add(otp)
        await self.db.commit()

        if dev_delivery:
            return code, "Enter the sign-in code shown here."
        try:
            await _send_sms(phone, code)
        except ServiceUnavailableError:
            otp.used_at = datetime.utcnow()
            await self.db.commit()
            raise
        return None, "If this number has a patient account, a sign-in code will be sent."

    async def verify(self, phone: str, code: str) -> User:
        result = await self.db.execute(
            select(PhoneOtp)
            .where(
                PhoneOtp.phone == phone,
                PhoneOtp.used_at.is_(None),
                PhoneOtp.expires_at > datetime.utcnow(),
                PhoneOtp.attempts < 5,
            )
            .order_by(PhoneOtp.created_at.desc())
        )
        otp = result.scalars().first()
        if otp is None:
            raise UnauthorizedError("The code is invalid or expired. Request a new code.")

        otp.attempts += 1
        if not hmac.compare_digest(otp.code_hash, _code_hash(phone, code)):
            await self.db.commit()
            raise UnauthorizedError("The code is invalid or expired. Request a new code.")

        user = await self.db.get(User, otp.user_id)
        if user is None or not user.is_active or user.role != Role.PATIENT or user.phone != phone:
            otp.used_at = datetime.utcnow()
            await self.db.commit()
            raise UnauthorizedError("The code is invalid or expired. Request a new code.")

        otp.used_at = datetime.utcnow()
        user.is_verified = True
        await self.db.commit()
        return user
