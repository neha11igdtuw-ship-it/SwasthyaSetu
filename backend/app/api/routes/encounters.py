import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user, get_own_patient
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
    SelfSymptomCreate,
    SelfVitalCreate,
    SymptomCreate,
    SymptomOut,
    VitalCreate,
    VitalOut,
)
from app.services.maternal import ScreeningService

router = APIRouter(prefix="/encounters", tags=["encounters"])
vitals_router = APIRouter(prefix="/vitals", tags=["vitals"])


async def _load_encounter_with_access(db, encounter_id, user):
    encounter = await EncounterRepository(db).get_or_404(encounter_id)
    patient = await PatientRepository(db).get_or_404(encounter.patient_id)
    assert_patient_access(user, patient)
    return encounter, patient


async def _assert_can_write_encounter(user: User, patient, encounter=None) -> None:
    if user.role != Role.PATIENT:
        return
    if patient.user_id != user.id:
        raise ForbiddenError("Patients can only add to their own record")
    if encounter is not None and encounter.encounter_type not in {"SELF_REPORT", "HEALTH_VISIT", "SYMPTOM_NOTE"}:
        raise ForbiddenError("Patients can only add notes to their own self-reported visits")


@router.get("/me", response_model=list[EncounterOut])
async def list_my_encounters(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    return await EncounterRepository(db).list_active(patient_id=patient.id)


@router.post("/me", response_model=EncounterOut, status_code=201)
async def create_my_encounter(
    data: EncounterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    payload = data.model_dump()
    payload["patient_id"] = patient.id
    payload["facility_id"] = patient.facility_id
    payload["encounter_type"] = payload.get("encounter_type") or "HEALTH_VISIT"
    if payload["encounter_type"] not in {"SELF_REPORT", "HEALTH_VISIT", "SYMPTOM_NOTE"}:
        payload["encounter_type"] = "SELF_REPORT"
    payload["encounter_date"] = payload.get("encounter_date") or datetime.utcnow()
    repo = EncounterRepository(db)
    encounter = await repo.create(**payload, author_id=user.id)
    await db.commit()
    return encounter


async def _record_self_vitals(data: SelfVitalCreate, db: AsyncSession, user: User) -> VitalOut:
    patient = await get_own_patient(db, user)
    encounter = await EncounterRepository(db).create(
        patient_id=patient.id,
        facility_id=patient.facility_id,
        author_id=user.id,
        encounter_type="SELF_REPORT",
        encounter_date=datetime.utcnow(),
        notes=data.notes or "Self-reported vitals",
    )
    vital = await VitalRepository(db).create(
        encounter_id=encounter.id,
        systolic_bp=data.systolic_bp,
        diastolic_bp=data.diastolic_bp,
        pulse=data.pulse,
        temperature_c=data.temperature_c,
        weight_kg=data.weight_kg,
        spo2=data.spo2,
    )
    await db.commit()
    return vital


@router.post("/me/vitals", response_model=VitalOut, status_code=201)
async def add_my_vitals(
    data: SelfVitalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _record_self_vitals(data, db, user)


@vitals_router.post("/me", response_model=VitalOut, status_code=201)
async def add_vitals_me(
    data: SelfVitalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _record_self_vitals(data, db, user)


@router.post("/me/symptoms", response_model=SymptomOut, status_code=201)
async def add_my_symptom(
    data: SelfSymptomCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    encounter = await EncounterRepository(db).create(
        patient_id=patient.id,
        facility_id=patient.facility_id,
        author_id=user.id,
        encounter_type="SYMPTOM_NOTE",
        encounter_date=datetime.utcnow(),
        notes=data.notes or data.description,
    )
    symptom = await SymptomRepository(db).create(
        encounter_id=encounter.id,
        description=data.description,
        severity=data.severity,
    )
    await db.commit()
    return symptom


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
        own = await get_own_patient(db, user)
        if data.patient_id != own.id:
            raise ForbiddenError("Patients can only add visits to their own record")
        patient = own
    else:
        patient = await PatientRepository(db).get_or_404(data.patient_id)
        assert_patient_access(user, patient)
    payload = data.model_dump()
    if user.role == Role.PATIENT:
        payload["facility_id"] = patient.facility_id
        payload["encounter_type"] = payload.get("encounter_type") or "HEALTH_VISIT"
    elif user.facility_id is not None:
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
    encounter, patient = await _load_encounter_with_access(db, encounter_id, user)
    await _assert_can_write_encounter(user, patient, encounter)
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
    encounter, patient = await _load_encounter_with_access(db, encounter_id, user)
    await _assert_can_write_encounter(user, patient, encounter)
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
