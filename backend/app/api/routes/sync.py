from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role, SyncEntityType, SyncOperation
from app.models.user import User
from app.repositories.care_gaps import CareGapRepository
from app.repositories.patients import PatientRepository
from app.repositories.referrals import ReferralRepository
from app.schemas.sync import SyncPullRequest, SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.services.sync import SyncService

router = APIRouter(prefix="/sync", tags=["sync"])


async def _assert_change_in_scope(db: AsyncSession, user: User, change) -> None:
    """Best-effort ownership check per change before it's applied. Admins are
    unrestricted; patients cannot use sync (no offline client for that role
    in this system); facility-scoped staff may only push changes for patients/
    referrals/care-gaps tied to their own facility."""
    if user.role == Role.ADMIN:
        return
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot use offline sync")
    if user.facility_id is None:
        raise ForbiddenError("Staff without a facility cannot sync")

    if change.operation == SyncOperation.CREATE:
        # Nothing exists server-side yet (or a retried create that's already
        # applied, handled idempotently downstream) — check the facility the
        # client is asserting in the payload, if any.
        payload_facility = (
            change.payload.get("facility_id")
            if change.entity_type == SyncEntityType.PATIENT
            else None
        )
        if payload_facility is not None and str(payload_facility) != str(user.facility_id):
            raise ForbiddenError("Cannot create a record outside your facility")
        return

    if change.entity_type == SyncEntityType.PATIENT:
        if change.entity_id is not None:
            patient = await PatientRepository(db).get(change.entity_id)
            if patient is not None and patient.facility_id != user.facility_id:
                raise ForbiddenError("Cannot sync a patient outside your facility")
    elif change.entity_type == SyncEntityType.REFERRAL:
        if change.entity_id is not None:
            referral = await ReferralRepository(db).get(change.entity_id)
            if referral is not None and user.facility_id not in {
                referral.from_facility_id,
                referral.to_facility_id,
            }:
                raise ForbiddenError("Cannot sync a referral outside your facility")
    elif change.entity_type == SyncEntityType.CARE_GAP:
        if change.entity_id is not None:
            gap = await CareGapRepository(db).get(change.entity_id)
            if gap is not None:
                patient = await PatientRepository(db).get(gap.patient_id)
                if patient is not None and patient.facility_id != user.facility_id:
                    raise ForbiddenError("Cannot sync a care gap outside your facility")


@router.post("/push", response_model=SyncPushResponse)
async def push(
    data: SyncPushRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for change in data.changes:
        await _assert_change_in_scope(db, user, change)
    results = await SyncService(db).push(data.device_id, user.id, data.changes)
    return SyncPushResponse(results=results)


@router.post("/pull", response_model=SyncPullResponse)
async def pull(
    data: SyncPullRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot use offline sync")
    response = await SyncService(db).pull(data.since)
    if user.role == Role.ADMIN:
        return response
    facility_id = str(user.facility_id) if user.facility_id else None
    response.patients = [p for p in response.patients if str(p.get("facility_id")) == facility_id]
    patient_ids = {p["id"] for p in response.patients}
    response.referrals = [
        r
        for r in response.referrals
        if str(r.get("from_facility_id")) == facility_id
        or str(r.get("to_facility_id")) == facility_id
    ]
    response.care_gaps = [c for c in response.care_gaps if c.get("patient_id") in patient_ids]
    return response
