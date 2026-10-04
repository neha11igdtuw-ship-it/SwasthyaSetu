import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_facility_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.messages import MessageCategory, MessagePriority
from app.models.support_request import SupportRequest
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.repositories.support_requests import SupportRequestRepository
from app.schemas.messages import CareMessageCreate
from app.schemas.support_request import (
    SupportRequestCreate,
    SupportRequestOut,
    SupportRequestStatusUpdate,
)
from app.services.messages import CareMessagesService

router = APIRouter(prefix="/support-requests", tags=["support-requests"])

_REASON_LABELS = {
    "HEALTH_CONCERN": "I have a health concern",
    "UNDERSTANDING_HELP": "I need help understanding instructions",
    "CANNOT_TRAVEL": "I cannot travel",
    "CALLBACK": "I need a callback",
    "OTHER": "Other",
}


def _to_out(req: SupportRequest, patient_name: str | None = None) -> SupportRequestOut:
    return SupportRequestOut(
        id=req.id,
        patient_id=req.patient_id,
        facility_id=req.facility_id,
        reason=req.reason,
        message=req.message,
        status=req.status,
        assigned_to_id=req.assigned_to_id,
        related_message_id=req.related_message_id,
        resolved_at=req.resolved_at,
        created_at=req.created_at,
        version=req.version,
        patient_name=patient_name,
    )


@router.post("", response_model=SupportRequestOut, status_code=201)
async def create_support_request(
    data: SupportRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Patient raises a real support/callback request. Also posts it into
    her existing Care Team Messages conversation so her health worker/doctor
    see it immediately via the two-way messaging feature."""
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only patients can submit support requests")

    patient = await get_own_patient(db, user)
    repo = SupportRequestRepository(db)

    request = await repo.create(
        patient_id=patient.id,
        facility_id=patient.facility_id,
        reason=data.reason,
        message=data.message,
    )
    await db.flush()

    label = _REASON_LABELS.get(data.reason.value, data.reason.value)
    body = f"Support request: {label}"
    if data.message:
        body += f" — {data.message}"

    priority = (
        MessagePriority.URGENT if data.reason.value == "HEALTH_CONCERN" else MessagePriority.NORMAL
    )

    messages_service = CareMessagesService(db)
    message = await messages_service.send_message(
        user,
        patient.id,
        CareMessageCreate(
            body=body,
            category=MessageCategory.GENERAL,
            priority=priority,
            related_type="SUPPORT_REQUEST",
            related_id=request.id,
        ),
    )
    request.related_message_id = message.id

    await db.commit()
    await db.refresh(request)
    return _to_out(request)


@router.get("/me", response_model=list[SupportRequestOut])
async def list_my_support_requests(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only patients can view their own support requests")
    patient = await get_own_patient(db, user)
    rows = await SupportRequestRepository(db).list_for_patient(patient.id)
    return [_to_out(r) for r in rows]


@router.get("", response_model=list[SupportRequestOut])
async def list_facility_support_requests(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Staff inbox: support requests from patients at the staff member's own
    facility."""
    if user.role not in (Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_ADMIN, Role.ADMIN):
        raise ForbiddenError("Only facility staff can view support requests")

    if user.role == Role.ADMIN:
        rows = await SupportRequestRepository(db).list_active()
    else:
        if user.facility_id is None:
            return []
        rows = await SupportRequestRepository(db).list_for_facility(user.facility_id)

    patients = PatientRepository(db)
    out = []
    for r in rows:
        patient = await patients.get(r.patient_id)
        out.append(_to_out(r, patient_name=patient.full_name if patient else None))
    return out


@router.patch("/{request_id}/status", response_model=SupportRequestOut)
async def update_support_request_status(
    request_id: uuid.UUID,
    data: SupportRequestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Staff updates request status (Assigned / Callback pending / Contacted
    / Resolved)."""
    if user.role not in (Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_ADMIN, Role.ADMIN):
        raise ForbiddenError("Only facility staff can update support requests")

    repo = SupportRequestRepository(db)
    request = await repo.get_or_404(request_id)
    assert_facility_access(user, request.facility_id)

    changes = {"status": data.status}
    if data.status.value == "ASSIGNED" and request.assigned_to_id is None:
        changes["assigned_to_id"] = user.id
    if data.status.value == "RESOLVED":
        from datetime import datetime

        changes["resolved_at"] = datetime.utcnow()

    request = await repo.apply_update(request_id, data.base_version, changes)
    await db.commit()
    return _to_out(request)
