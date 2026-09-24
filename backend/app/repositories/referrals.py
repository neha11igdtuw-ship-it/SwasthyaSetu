import uuid

from sqlalchemy import select

from app.models.enums import OPEN_REFERRAL_STATUSES
from app.models.referral import Referral
from app.repositories.base import SyncableRepository


class ReferralRepository(SyncableRepository[Referral]):
    model = Referral

    async def list_open_for_patient(self, patient_id: uuid.UUID) -> list[Referral]:
        stmt = select(Referral).where(
            Referral.patient_id == patient_id,
            Referral.is_deleted.is_(False),
            Referral.status.in_(list(OPEN_REFERRAL_STATUSES)),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
