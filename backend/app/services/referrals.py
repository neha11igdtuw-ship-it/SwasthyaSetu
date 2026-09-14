import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationAppError
from app.models.enums import REFERRAL_TRANSITIONS, ReferralStatus
from app.models.referral import Referral
from app.repositories.referrals import ReferralRepository
from app.schemas.referral import ReferralCreate


class ReferralService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReferralRepository(db)

    async def create(self, data: ReferralCreate, created_by_id: uuid.UUID | None) -> Referral:
        referral = await self.repo.create(
            patient_id=data.patient_id,
            from_facility_id=data.from_facility_id,
            to_facility_id=data.to_facility_id,
            reason=data.reason,
            specialty_needed=data.specialty_needed,
            urgency=data.urgency,
            notes=data.notes,
            status=ReferralStatus.CREATED,
            created_by_id=created_by_id,
        )
        await self.db.commit()
        return referral

    async def transition(
        self,
        referral_id: uuid.UUID,
        base_version: int,
        new_status: ReferralStatus,
        notes: str | None,
    ) -> Referral:
        referral = await self.repo.get_or_404(referral_id)
        allowed = REFERRAL_TRANSITIONS.get(referral.status, set())
        if new_status not in allowed:
            raise ValidationAppError(
                f"Cannot transition referral from {referral.status.value} to {new_status.value}",
                details={"allowed_next_states": [s.value for s in allowed]},
            )
        changes = {"status": new_status}
        if notes is not None:
            changes["notes"] = notes
        referral = await self.repo.apply_update(referral_id, base_version, changes)
        await self.db.commit()
        return referral
