import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_own_patient
from app.core.errors import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.models.enums import NotificationStatus, Role
from app.models.user import User
from app.repositories.queue import NotificationRepository
from app.schemas.queue import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me", response_model=list[NotificationOut])
async def list_my_notifications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = NotificationRepository(db)
    if user.role == Role.PATIENT:
        patient = await get_own_patient(db, user)
        return await repo.list_for_patient(patient.id)
    return await repo.list_for_user(user.id)


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark one of the caller's own notifications as read/reviewed."""
    repo = NotificationRepository(db)
    notification = await repo.get(notification_id)
    if notification is None:
        raise NotFoundError("Notification not found")
    if user.role == Role.PATIENT:
        patient = await get_own_patient(db, user)
        owned = notification.recipient_user_id is None and notification.patient_id == patient.id
    else:
        owned = notification.recipient_user_id == user.id
    if not owned:
        raise ForbiddenError("You do not have access to this notification")
    notification.status = NotificationStatus.READ
    await db.commit()
    await db.refresh(notification)
    return notification
