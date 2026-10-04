import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError, ValidationAppError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.care_gaps import CareGapRepository
from app.repositories.maternal import PregnancyRepository
from app.repositories.patients import PatientRepository
from app.schemas.maternal import PregnancyCreate, PregnancyOut, PregnancyUpdate
from app.services.pregnancy_timeline import get_pregnancy_timeline

router = APIRouter(prefix="/pregnancies", tags=["pregnancies"])


@router.get("/me/timeline")
async def get_my_pregnancy_timeline(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Week-wise ANC guide for the authenticated patient, plus her real
    pending/completed care-gap actions. Patient-only; derives the week from
    her own patient record (`pregnancy_week`), never a query param."""
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only patients can view their own pregnancy timeline")

    patient = await get_own_patient(db, user)
    if not patient.pregnancy_week:
        raise ValidationAppError("No pregnancy week recorded for this patient")

    timeline = get_pregnancy_timeline(patient.pregnancy_week)

    gaps = await CareGapRepository(db).list_active(patient_id=patient.id)
    pending = [g for g in gaps if g.status.value == "OPEN"]
    completed = [g for g in gaps if g.status.value == "CLOSED"]

    def _gap_out(g):
        return {
            "id": g.id,
            "gap_type": g.gap_type,
            "description": g.description,
            "due_date": g.due_date,
            "status": g.status,
        }

    timeline["pending_actions"] = [_gap_out(g) for g in pending]
    timeline["completed_actions"] = [_gap_out(g) for g in completed]
    return timeline


@router.get("", response_model=list[PregnancyOut])
async def list_pregnancies(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return await PregnancyRepository(db).list_active(patient_id=patient_id)


@router.post("", response_model=PregnancyOut, status_code=201)
async def create_pregnancy(
    data: PregnancyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot record their own pregnancy data")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    repo = PregnancyRepository(db)
    pregnancy = await repo.create(**data.model_dump())
    await db.commit()
    return pregnancy


@router.get("/{pregnancy_id}", response_model=PregnancyOut)
async def get_pregnancy(
    pregnancy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PregnancyRepository(db)
    pregnancy = await repo.get_or_404(pregnancy_id)
    patient = await PatientRepository(db).get_or_404(pregnancy.patient_id)
    assert_patient_access(user, patient)
    return pregnancy


@router.patch("/{pregnancy_id}", response_model=PregnancyOut)
async def update_pregnancy(
    pregnancy_id: uuid.UUID,
    data: PregnancyUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot edit their own pregnancy data")
    repo = PregnancyRepository(db)
    pregnancy = await repo.get_or_404(pregnancy_id)
    patient = await PatientRepository(db).get_or_404(pregnancy.patient_id)
    assert_patient_access(user, patient)
    changes = data.model_dump(exclude={"base_version"})
    pregnancy = await repo.apply_update(pregnancy_id, data.base_version, changes)
    await db.commit()
    return pregnancy
