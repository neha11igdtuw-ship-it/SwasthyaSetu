import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.facility_resource import FacilityResource


class FacilityResourceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_facility(self, facility_id: uuid.UUID) -> FacilityResource | None:
        result = await self.db.execute(
            select(FacilityResource).where(FacilityResource.facility_id == facility_id)
        )
        return result.scalar_one_or_none()

    async def create(self, facility_id: uuid.UUID, **kwargs) -> FacilityResource:
        resource = FacilityResource(facility_id=facility_id, **kwargs)
        self.db.add(resource)
        await self.db.flush()
        return resource
