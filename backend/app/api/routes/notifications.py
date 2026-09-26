from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_own_patient
from app.db.session import get_db
from app.models.enums import Role
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
