import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, assert_referral_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.facilities import FacilityRepository
from app.repositories.patients import PatientRepository
from app.repositories.referrals import ReferralRepository
from app.schemas.referral import (
    CareRequestCreate,
    MatchCandidate,
    ReferralCreate,
    ReferralOut,
    ReferralStatusUpdate,
)
from app.services.referral_matching import ReferralMatchingService
from app.services.referrals import ReferralService

router = APIRouter(prefix="/referrals", tags=["referrals"])

_URGENCY_MAP = {
    "LOW": "ROUTINE",
    "MEDIUM": "MEDIUM",
    "HIGH": "URGENT",
    "ROUTINE": "ROUTINE",
    "URGENT": "URGENT",
    "EMERGENCY": "EMERGENCY",
}


async def _pick_destination(db: AsyncSession, from_facility_id: uuid.UUID | None) -> uuid.UUID | None:
    facilities = await FacilityRepository(db).list_all()
    if not facilities:
        return from_facility_id
    hospitals = [
        f
        for f in facilities
        if f.facility_type.upper() in {"HOSPITAL", "DH", "CHC", "DISTRICT_HOSPITAL"}
        and f.id != from_facility_id
    ]
    if hospitals:
        return hospitals[0].id
    other = next((f.id for f in facilities if f.id != from_facility_id), None)
    return other or from_facility_id


@router.get("/me", response_model=list[ReferralOut])
async def list_my_referrals(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    return await ReferralRepository(db).list_active(patient_id=patient.id)


@router.post("/request-care", response_model=ReferralOut, status_code=201)
async def request_care(
    data: CareRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    note_parts = []
    if data.symptoms:
        note_parts.append(f"Symptoms: {data.symptoms}")
    if data.preferred_language:
        note_parts.append(f"Language: {data.preferred_language}")
    if data.notes:
        note_parts.append(data.notes)
    payload = ReferralCreate(
        patient_id=patient.id,
        from_facility_id=patient.facility_id,
        to_facility_id=await _pick_destination(db, patient.facility_id),
        reason=data.main_concern,
        specialty_needed=data.main_concern[:64],
        urgency=_URGENCY_MAP.get(data.urgency.upper(), "MEDIUM"),
        notes=" | ".join(note_parts) or None,
    )
    return await ReferralService(db).create(payload, created_by_id=user.id)


@router.get("/match/candidates", response_model=list[MatchCandidate])
async def match_candidates(
    from_facility_id: uuid.UUID | None = None,
    specialty_needed: str | None = None,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot search referral candidates")
    if user.role != Role.ADMIN and from_facility_id not in (None, user.facility_id):
        raise ForbiddenError("You may only search candidates from your own facility")
    return await ReferralMatchingService(db).find_candidates(
        from_facility_id, specialty_needed, limit
    )


@router.get("", response_model=list[ReferralOut])
async def list_referrals(
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = ReferralRepository(db)
    if user.role == Role.ADMIN:
        return await repo.list_active(patient_id=patient_id)
    if user.role == Role.PATIENT:
        own = await get_own_patient(db, user)
        if patient_id is not None and patient_id != own.id:
            raise ForbiddenError("Patients may only list their own referrals")
        return await repo.list_active(patient_id=own.id)
  
    all_active = await repo.list_active(patient_id=patient_id)

    visible = [
        r
        for r in all_active
        if r.from_facility_id == user.facility_id or r.to_facility_id == user.facility_id
    ]

    result = []
    patient_repo = PatientRepository(db)

    for referral in visible:
        patient = await patient_repo.get(referral.patient_id)

        result.append({
            "id": referral.id,
            "patient_id": referral.patient_id,
            "patient_name": patient.full_name if patient else None,
            "from_facility_id": referral.from_facility_id,
            "to_facility_id": referral.to_facility_id,
            "reason": referral.reason,
            "specialty_needed": referral.specialty_needed,
            "urgency": referral.urgency,
            "status": referral.status,
            "notes": referral.notes,
            "version": referral.version,
            "is_deleted": referral.is_deleted,
        })

    return result


@router.post("", response_model=ReferralOut, status_code=201)
async def create_referral(
    data: ReferralCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot create referrals")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    if user.facility_id is not None:
        if data.from_facility_id is None:
            data = data.model_copy(update={"from_facility_id": user.facility_id})
        elif data.from_facility_id != user.facility_id:
            raise ForbiddenError("Referrals must originate from your own facility")
    return await ReferralService(db).create(data, created_by_id=user.id)


@router.get("/{referral_id}", response_model=ReferralOut)
async def get_referral(
    referral_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = ReferralRepository(db)
    referral = await repo.get_or_404(referral_id)
    if user.role == Role.PATIENT:
        patient = await PatientRepository(db).get(referral.patient_id)
        if patient is None or patient.user_id != user.id:
            raise ForbiddenError("You do not have access to this referral")
    else:
        assert_referral_access(user, referral)
    return referral


async def _transition_referral(
    referral_id: uuid.UUID,
    data: ReferralStatusUpdate,
    db: AsyncSession,
    user: User,
):
    repo = ReferralRepository(db)
    referral = await repo.get_or_404(referral_id)
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot transition referrals")
    assert_referral_access(user, referral)
    return await ReferralService(db).transition(
        referral_id, data.base_version, data.status, data.notes
    )


@router.patch("/{referral_id}/status", response_model=ReferralOut)
async def update_referral_status(
    referral_id: uuid.UUID,
    data: ReferralStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _transition_referral(referral_id, data, db, user)


@router.post("/{referral_id}/transition", response_model=ReferralOut)
async def transition_referral(
    referral_id: uuid.UUID,
    data: ReferralStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _transition_referral(referral_id, data, db, user)
