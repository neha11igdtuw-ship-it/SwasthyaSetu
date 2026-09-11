import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    assert_patient_access,
    get_current_user,
    is_facility_scoped,
)
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientOut])
async def list_patients(
    facility_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PatientRepository(db)
    if user.role == Role.ADMIN:
        return await repo.list_active(facility_id=facility_id)
    if user.role == Role.PATIENT:
        return await repo.list_active(user_id=user.id)
    if is_facility_scoped(user):
        # Ignore/override any caller-supplied facility_id: always scope to own facility.
        return await repo.list_active(facility_id=user.facility_id)
    raise ForbiddenError("Not authorized to list patients")


@router.post("", response_model=PatientOut, status_code=201)
async def create_patient(
    data: PatientCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot register other patients")
    payload = data.model_dump()
    if is_facility_scoped(user):
        # Facility-scoped staff can only register patients at their own facility.
        payload["facility_id"] = user.facility_id
    repo = PatientRepository(db)
    patient = await repo.create(**payload, registered_by_id=user.id)
    await db.commit()
    return patient


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PatientRepository(db)
    patient = await repo.get_or_404(patient_id)
    assert_patient_access(user, patient)
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: uuid.UUID,
    data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PatientRepository(db)
    patient = await repo.get_or_404(patient_id)
    assert_patient_access(user, patient)
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot edit their own record")
    changes = data.model_dump(exclude={"base_version"})
    patient = await repo.apply_update(patient_id, data.base_version, changes)
    await db.commit()
    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: uuid.UUID,
    base_version: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PatientRepository(db)
    patient = await repo.get_or_404(patient_id)
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot delete their own record")
    assert_patient_access(user, patient)
    await repo.apply_delete(patient_id, base_version)
    await db.commit()
