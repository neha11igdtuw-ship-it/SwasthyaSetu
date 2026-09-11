import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.facility import Facility


class FacilityRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, facility_id: uuid.UUID) -> Facility | None:
        return await self.db.get(Facility, facility_id)

    async def list_all(self) -> list[Facility]:
        result = await self.db.execute(select(Facility))
        return list(result.scalars().all())

    async def create(self, **kwargs) -> Facility:
        facility = Facility(**kwargs)
        self.db.add(facility)
        await self.db.flush()
        return facility
