import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, assert_referral_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.repositories.referrals import ReferralRepository
from app.schemas.referral import MatchCandidate, ReferralCreate, ReferralOut, ReferralStatusUpdate
from app.services.referral_matching import ReferralMatchingService
from app.services.referrals import ReferralService

router = APIRouter(prefix="/referrals", tags=["referrals"])


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
        patient = await PatientRepository(db).get(patient_id) if patient_id else None
        if patient_id is None or patient is None or patient.user_id != user.id:
            raise ForbiddenError("Patients may only list their own referrals")
        return await repo.list_active(patient_id=patient_id)
    # Facility-scoped staff: only referrals touching their own facility.
    all_active = await repo.list_active(patient_id=patient_id)
    return [
        r
        for r in all_active
        if r.from_facility_id == user.facility_id or r.to_facility_id == user.facility_id
    ]


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


@router.post("/{referral_id}/transition", response_model=ReferralOut)
async def transition_referral(
    referral_id: uuid.UUID,
    data: ReferralStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = ReferralRepository(db)
    referral = await repo.get_or_404(referral_id)
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot transition referrals")
    assert_referral_access(user, referral)
    return await ReferralService(db).transition(
        referral_id, data.base_version, data.status, data.notes
    )


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
