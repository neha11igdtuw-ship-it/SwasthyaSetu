import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.support_request import SupportRequest
from app.repositories.base import SyncableRepository


class SupportRequestRepository(SyncableRepository[SupportRequest]):
    model = SupportRequest

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.session = db

    async def list_for_patient(self, patient_id: uuid.UUID) -> list[SupportRequest]:
        stmt = (
            select(self.model)
            .where(self.model.patient_id == patient_id, self.model.is_deleted.is_(False))
            .order_by(self.model.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_facility(self, facility_id: uuid.UUID) -> list[SupportRequest]:
        stmt = (
            select(self.model)
            .where(self.model.facility_id == facility_id, self.model.is_deleted.is_(False))
            .order_by(self.model.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
