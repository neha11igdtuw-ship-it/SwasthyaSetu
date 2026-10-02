import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_own_patient,
    require_roles,
)
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.messages import (
    CareConversationSummaryOut,
    CareMessageCreate,
    CareMessageOut,
    CareMessageReadRequest,
    UnreadCountOut,
)
from app.services.messages import CareMessagesService

router = APIRouter(prefix="/care-messages", tags=["care-messages"])


@router.get("/conversation/me", response_model=dict)
async def get_own_conversation(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the current patient's care team conversation."""
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only patients can access their own conversation")

    patient = await get_own_patient(db, user)
    service = CareMessagesService(db)

    conversation = await service.get_patient_conversation_with_auth(user, patient.id)
    messages, total = await service.get_messages_with_read_status(
        conversation.id,
        user.id,
        limit=100,
    )

    return {
        "id": conversation.id,
        "patient_id": patient.id,
        "messages": messages,
        "total_messages": total,
    }


@router.get("/patients/{patient_id}", response_model=dict)
async def get_patient_conversation(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(
        require_roles(Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_ADMIN, Role.ADMIN)
    ),
):
    """Get a patient's care team conversation (staff only)."""
    service = CareMessagesService(db)
    conversation = await service.get_patient_conversation_with_auth(user, patient_id)
    messages, total = await service.get_messages_with_read_status(
        conversation.id,
        user.id,
        limit=100,
    )

    # Get patient name for response
    from app.repositories.patients import PatientRepository

    patient = await PatientRepository(db).get_or_404(patient_id)

    return {
        "id": conversation.id,
        "patient_id": patient_id,
        "patient_name": patient.full_name,
        "messages": messages,
        "total_messages": total,
    }


@router.post("/patients/{patient_id}", response_model=CareMessageOut)
async def send_message(
    patient_id: uuid.UUID,
    message_data: CareMessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Send a message in a patient's care conversation."""
    service = CareMessagesService(db)

    message = await service.send_message(user, patient_id, message_data)

    return CareMessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_user_id=message.sender_user_id,
        sender_role=message.sender_role,
        sender_display_name=message.sender_display_name,
        body=message.body,
        category=message.category,
        priority=message.priority,
        related_type=message.related_type,
        related_id=message.related_id,
        created_at=message.created_at,
        is_read=False,
    )


@router.post("/conversations/{conversation_id}/read", response_model=dict)
async def mark_messages_read(
    conversation_id: uuid.UUID,
    request: CareMessageReadRequest | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark messages as read in a conversation."""
    service = CareMessagesService(db)

    message_ids = request.message_ids if request else None
    count = await service.mark_messages_as_read(
        user.id,
        conversation_id,
        message_ids,
    )

    return {
        "marked_read_count": count,
    }


@router.get("/unread-count", response_model=UnreadCountOut)
async def get_unread_count(
    conversation_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get unread message count for the current user."""
    service = CareMessagesService(db)
    count = await service.get_unread_count(user.id, conversation_id)

    return UnreadCountOut(unread_count=count)


@router.get("/inbox", response_model=list[CareConversationSummaryOut])
async def get_inbox(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_ADMIN)),
):
    """Get inbox of conversations for a staff member."""
    service = CareMessagesService(db)
    summaries = await service.get_conversation_summaries_for_staff(user)

    return summaries
