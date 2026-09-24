import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_facility_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.staff import DoctorAvailabilityRepository
from app.schemas.staff import (
    AvailableSlotOut,
    DoctorAvailabilityCreate,
    DoctorAvailabilityOut,
    DoctorAvailabilityUpdate,
)

router = APIRouter(prefix="/doctor-availability", tags=["doctor-availability"])


@router.get("/available", response_model=list[AvailableSlotOut])
async def list_available_slots(
    facility_id: uuid.UUID,
    day: date,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Patient-safe: open, unbooked slots at a facility for one calendar day. No doctor identity exposed."""
    day_start = datetime.combine(day, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    return await DoctorAvailabilityRepository(db).list_available(facility_id, day_start, day_end)


@router.get("", response_model=list[DoctorAvailabilityOut])
async def list_availability(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot browse raw availability slots")
    assert_facility_access(user, facility_id)
    return await DoctorAvailabilityRepository(db).list_active(facility_id=facility_id)


@router.post("", response_model=DoctorAvailabilityOut, status_code=201)
async def create_availability(
    data: DoctorAvailabilityCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot manage availability")
    assert_facility_access(user, data.facility_id)
    repo = DoctorAvailabilityRepository(db)
    slot = await repo.create(**data.model_dump())
    await db.commit()
    return slot


@router.patch("/{slot_id}", response_model=DoctorAvailabilityOut)
async def update_availability(
    slot_id: uuid.UUID,
    data: DoctorAvailabilityUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot manage availability")
    repo = DoctorAvailabilityRepository(db)
    slot = await repo.get_or_404(slot_id)
    assert_facility_access(user, slot.facility_id)
    changes = data.model_dump(exclude={"base_version"})
    slot = await repo.apply_update(slot_id, data.base_version, changes)
    await db.commit()
    return slot
