import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_facility_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.staff import HealthWorkerProfileRepository
from app.schemas.staff import HealthWorkerProfileCreate, HealthWorkerProfileOut

router = APIRouter(prefix="/health-worker-profiles", tags=["health-worker-profiles"])


@router.get("", response_model=list[HealthWorkerProfileOut])
async def list_profiles(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot view staff profiles")
    assert_facility_access(user, facility_id)
    return await HealthWorkerProfileRepository(db).list_active(facility_id=facility_id)


@router.post("", response_model=HealthWorkerProfileOut, status_code=201)
async def create_profile(
    data: HealthWorkerProfileCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in (Role.ADMIN, Role.FACILITY_ADMIN):
        raise ForbiddenError("Only facility/platform admins can manage health worker profiles")
    assert_facility_access(user, data.facility_id)
    repo = HealthWorkerProfileRepository(db)
    profile = await repo.create(**data.model_dump())
    await db.commit()
    return profile


@router.get("/{profile_id}", response_model=HealthWorkerProfileOut)
async def get_profile(
    profile_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot view staff profiles")
    repo = HealthWorkerProfileRepository(db)
    profile = await repo.get_or_404(profile_id)
    assert_facility_access(user, profile.facility_id)
    return profile
