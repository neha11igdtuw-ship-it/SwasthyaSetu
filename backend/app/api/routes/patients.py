import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    assert_patient_access,
    get_current_user,
    get_own_patient,
    is_facility_scoped,
)
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import RiskLevel, Role
from app.models.user import User
from app.repositories.maternal import EncounterRepository, PregnancyRepository, VitalRepository
from app.repositories.patients import PatientRepository
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])

_CREATE_ONLY_FIELDS = {
    "age",
    "systolic_bp",
    "diastolic_bp",
    "pulse",
    "expected_delivery_date",
}


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
        rows = await repo.list_active(user_id=user.id)
        if rows:
            return rows
        # Existing logins created before patient-self-provisioning still get a
        # linked care record from the account profile instead of an empty dashboard.
        created = await repo.create(
            full_name=user.full_name,
            phone=user.phone,
            village=None,
            preferred_language=None,
            user_id=user.id,
            facility_id=user.facility_id,
        )
        await db.commit()
        return [created]
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
    payload = data.model_dump(exclude=_CREATE_ONLY_FIELDS)
    if is_facility_scoped(user):
        # Facility-scoped staff can only register patients at their own facility.
        payload["facility_id"] = user.facility_id
    repo = PatientRepository(db)
    patient = await repo.create(**payload, registered_by_id=user.id)

    maternal = (data.care_pathway or "").lower().startswith("maternal") or data.pregnancy_week is not None
    if maternal:
        await PregnancyRepository(db).create(
            patient_id=patient.id,
            expected_delivery_date=data.expected_delivery_date,
            risk_level=RiskLevel.LOW,
            notes=(
                f"Registered at pregnancy week {data.pregnancy_week}"
                if data.pregnancy_week
                else "Maternal care registration"
            ),
        )

    if data.systolic_bp or data.diastolic_bp or data.pulse:
        encounter = await EncounterRepository(db).create(
            patient_id=patient.id,
            facility_id=patient.facility_id,
            author_id=user.id,
            encounter_type="REGISTRATION",
            encounter_date=datetime.utcnow(),
            notes="Baseline vitals at registration",
        )
        await VitalRepository(db).create(
            encounter_id=encounter.id,
            systolic_bp=data.systolic_bp,
            diastolic_bp=data.diastolic_bp,
            pulse=data.pulse,
        )

    await db.commit()
    await db.refresh(patient)
    return patient


@router.get("/me", response_model=PatientOut)
async def get_me(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await get_own_patient(db, user)


@router.patch("/me", response_model=PatientOut)
async def update_me(
    data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    changes = data.model_dump(
        exclude={"base_version", "age", "facility_id", "abha_id"},
        exclude_none=True,
    )
    patient = await PatientRepository(db).apply_update(patient.id, data.base_version, changes)
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
    if user.role == Role.PATIENT and (patient.user_id is None or patient.user_id != user.id):
        raise ForbiddenError("Patients cannot edit another record")
    changes = data.model_dump(exclude={"base_version", "age"})
    if user.role == Role.PATIENT:
        changes.pop("facility_id", None)
        changes.pop("abha_id", None)
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
