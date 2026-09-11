import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import Role
from app.repositories.facilities import FacilityRepository
from app.schemas.common import IDModel

router = APIRouter(prefix="/facilities", tags=["facilities"])


class FacilityCreate(BaseModel):
    name: str
    facility_type: str = "PHC"
    village: str | None = None
    district: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    capabilities: str | None = None


class FacilityOut(IDModel):
    name: str
    facility_type: str
    village: str | None
    district: str | None
    state: str | None
    latitude: float | None
    longitude: float | None
    phone: str | None
    capabilities: str | None


@router.get("", response_model=list[FacilityOut])
async def list_facilities(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await FacilityRepository(db).list_all()


@router.post("", response_model=FacilityOut, status_code=201)
async def create_facility(
    data: FacilityCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(Role.ADMIN)),
):
    facility = await FacilityRepository(db).create(**data.model_dump())
    await db.commit()
    return facility


@router.get("/{facility_id}", response_model=FacilityOut)
async def get_facility(
    facility_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    from app.core.errors import NotFoundError

    facility = await FacilityRepository(db).get(facility_id)
    if facility is None:
        raise NotFoundError("Facility not found")
    return facility
