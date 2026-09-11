import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.maternal import (
    EncounterRepository,
    ScreeningRepository,
    SymptomRepository,
    VitalRepository,
)
from app.repositories.patients import PatientRepository
from app.repositories.referrals import ReferralRepository
from app.schemas.maternal import (
    EncounterCreate,
    EncounterOut,
    ScreeningCreate,
    ScreeningOut,
    SymptomCreate,
    SymptomOut,
    VitalCreate,
    VitalOut,
)
from app.services.maternal import ScreeningService

router = APIRouter(prefix="/encounters", tags=["encounters"])


async def _load_encounter_with_access(db, encounter_id, user):
    encounter = await EncounterRepository(db).get_or_404(encounter_id)
    patient = await PatientRepository(db).get_or_404(encounter.patient_id)
    assert_patient_access(user, patient)
    return encounter, patient


@router.get("", response_model=list[EncounterOut])
async def list_encounters(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return await EncounterRepository(db).list_active(patient_id=patient_id)


@router.post("", response_model=EncounterOut, status_code=201)
async def create_encounter(
    data: EncounterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot author encounters")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    payload = data.model_dump()
    if user.facility_id is not None:
        payload["facility_id"] = user.facility_id
    repo = EncounterRepository(db)
    encounter = await repo.create(**payload, author_id=user.id)
    await db.commit()
    return encounter


@router.get("/{encounter_id}", response_model=EncounterOut)
async def get_encounter(
    encounter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter, _ = await _load_encounter_with_access(db, encounter_id, user)
    return encounter


@router.post("/{encounter_id}/symptoms", response_model=SymptomOut, status_code=201)
async def add_symptom(
    encounter_id: uuid.UUID,
    data: SymptomCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot record symptoms")
    await _load_encounter_with_access(db, encounter_id, user)
    repo = SymptomRepository(db)
    symptom = await repo.create(**data.model_dump())
    await db.commit()
    return symptom


@router.get("/{encounter_id}/symptoms", response_model=list[SymptomOut])
async def list_symptoms(
    encounter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _load_encounter_with_access(db, encounter_id, user)
    return await SymptomRepository(db).list_active(encounter_id=encounter_id)


@router.post("/{encounter_id}/vitals", response_model=VitalOut, status_code=201)
async def add_vital(
    encounter_id: uuid.UUID,
    data: VitalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot record vitals")
    await _load_encounter_with_access(db, encounter_id, user)
    repo = VitalRepository(db)
    vital = await repo.create(**data.model_dump())
    await db.commit()
    return vital


@router.get("/{encounter_id}/vitals", response_model=list[VitalOut])
async def list_vitals(
    encounter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _load_encounter_with_access(db, encounter_id, user)
    return await VitalRepository(db).list_active(encounter_id=encounter_id)


@router.post("/{encounter_id}/screenings", response_model=ScreeningOut, status_code=201)
async def add_screening(
    encounter_id: uuid.UUID,
    data: ScreeningCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot record screenings")
    encounter, _ = await _load_encounter_with_access(db, encounter_id, user)
    data = data.model_copy(update={"encounter_id": encounter_id})
    screening, referral = await ScreeningService(db).create(data, encounter, created_by_id=user.id)
    out = ScreeningOut.model_validate(screening)
    out.referral_id = referral.id if referral else None
    return out


@router.get("/{encounter_id}/screenings", response_model=list[ScreeningOut])
async def list_screenings(
    encounter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _load_encounter_with_access(db, encounter_id, user)
    screenings = await ScreeningRepository(db).list_active(encounter_id=encounter_id)
    referrals = await ReferralRepository(db).list_active()
    referral_by_screening = {r.screening_id: r.id for r in referrals if r.screening_id}
    out = []
    for s in screenings:
        item = ScreeningOut.model_validate(s)
        item.referral_id = referral_by_screening.get(s.id)
        out.append(item)
    return out
