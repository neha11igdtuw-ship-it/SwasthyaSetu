import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.facility_resource import FacilityResource
from app.repositories.facility_resources import FacilityResourceRepository
from app.schemas.facility_resource import FacilityResourceUpdate


class FacilityResourceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FacilityResourceRepository(db)

    async def get_or_create(self, facility_id: uuid.UUID) -> FacilityResource:
        resource = await self.repo.get_by_facility(facility_id)
        if resource is None:
            resource = await self.repo.create(facility_id)
            await self.db.commit()
        return resource

    async def upsert(
        self, facility_id: uuid.UUID, data: FacilityResourceUpdate
    ) -> FacilityResource:
        resource = await self.repo.get_by_facility(facility_id)
        updates = data.model_dump(exclude_unset=True)
        if resource is None:
            resource = await self.repo.create(facility_id, **updates)
        else:
            for field, value in updates.items():
                setattr(resource, field, value)
        await self.db.commit()
        await self.db.refresh(resource)
        return resource
