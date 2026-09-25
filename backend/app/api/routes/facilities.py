import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_facility_access, get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import Role
from app.repositories.facilities import FacilityRepository
from app.repositories.users import UserRepository
from app.schemas.common import IDModel
from app.schemas.facility_resource import FacilityResourceOut, FacilityResourceUpdate
from app.services.facility_resources import FacilityResourceService
from app.services.osm_facilities import search_osm_health_facilities

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
async def list_facilities(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
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


@router.get("/nearby/osm")
async def nearby_osm_facilities(
    lat: float,
    lng: float,
    radius_km: int = 10,
):
    radius_m = radius_km * 1000

    facilities = await search_osm_health_facilities(
        lat=lat,
        lng=lng,
        radius_m=radius_m,
    )

    return {
        "source": "OpenStreetMap",
        "verification_note": "Public map data. Please call before visiting.",
        "count": len(facilities),
        "facilities": facilities,
    }


class FacilityDoctorOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str


@router.get("/{facility_id}/doctors", response_model=list[FacilityDoctorOut])
async def list_facility_doctors(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Doctors registered at this facility — used to populate the doctor
    picker when a facility admin creates an OPD queue desk."""
    assert_facility_access(user, facility_id)
    doctors = await UserRepository(db).list_by_facility_and_role(facility_id, Role.DOCTOR)
    return doctors


@router.get("/{facility_id}", response_model=FacilityOut)
async def get_facility(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    from app.core.errors import NotFoundError

    facility = await FacilityRepository(db).get(facility_id)
    if facility is None:
        raise NotFoundError("Facility not found")
    return facility


@router.get("/{facility_id}/resources", response_model=FacilityResourceOut)
async def get_facility_resources(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    assert_facility_access(user, facility_id)
    return await FacilityResourceService(db).get_or_create(facility_id)


@router.put("/{facility_id}/resources", response_model=FacilityResourceOut)
async def update_facility_resources(
    facility_id: uuid.UUID,
    data: FacilityResourceUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    assert_facility_access(user, facility_id)
    return await FacilityResourceService(db).upsert(facility_id, data)