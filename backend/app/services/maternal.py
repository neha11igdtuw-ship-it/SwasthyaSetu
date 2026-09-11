import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ReferralStatus
from app.models.maternal import Encounter, Screening
from app.models.referral import Referral
from app.repositories.maternal import ScreeningRepository
from app.repositories.referrals import ReferralRepository
from app.schemas.maternal import ScreeningCreate


class ScreeningService:
    """Screenings can optionally spawn a referral in the same transaction,
    linked back via Referral.screening_id."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.screening_repo = ScreeningRepository(db)
        self.referral_repo = ReferralRepository(db)

    async def create(
        self, data: ScreeningCreate, encounter: Encounter, created_by_id: uuid.UUID | None
    ) -> tuple[Screening, Referral | None]:
        screening = await self.screening_repo.create(
            encounter_id=data.encounter_id,
            screening_type=data.screening_type,
            result=data.result,
            risk_level=data.risk_level,
            notes=data.notes,
        )
        referral: Referral | None = None
        if data.create_referral:
            referral = await self.referral_repo.create(
                patient_id=encounter.patient_id,
                from_facility_id=encounter.facility_id,
                to_facility_id=data.referral_to_facility_id,
                reason=data.referral_reason or f"Screening finding: {data.screening_type}",
                specialty_needed=data.referral_specialty_needed,
                status=ReferralStatus.CREATED,
                created_by_id=created_by_id,
                screening_id=screening.id,
            )
        await self.db.commit()
        return screening, referral
