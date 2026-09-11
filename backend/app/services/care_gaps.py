import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care_gap import CareGap
from app.models.enums import CareGapStatus
from app.repositories.care_gaps import CareGapRepository
from app.schemas.care_gap import CareGapCreate


class CareGapService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CareGapRepository(db)

    async def create(self, data: CareGapCreate) -> CareGap:
        gap = await self.repo.create(
            patient_id=data.patient_id,
            gap_type=data.gap_type,
            description=data.description,
            due_date=data.due_date,
            status=CareGapStatus.OPEN,
        )
        await self.db.commit()
        return gap

    async def close(self, gap_id: uuid.UUID, base_version: int) -> CareGap:
        gap = await self.repo.apply_update(
            gap_id,
            base_version,
            {"status": CareGapStatus.CLOSED, "closed_at": datetime.utcnow()},
        )
        await self.db.commit()
        return gap

    async def list_open_for_patient(self, patient_id: uuid.UUID) -> list[CareGap]:
        return await self.repo.list_active(patient_id=patient_id, status=CareGapStatus.OPEN)
