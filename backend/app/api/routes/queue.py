import base64
import io
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.queue import (
    DoctorQueueOut,
    FacilityQueueOverviewOut,
    PauseRequest,
    QueueDeskCreate,
    QueueDeskOut,
    QueueDeskQrOut,
    QueueDeskUpdate,
    QueueEntryDetailOut,
    QueueJoinByQrRequest,
    QueueJoinRequest,
    SkipRequest,
)
from app.services.queue import QueueService

router = APIRouter(tags=["queue"])


def _entry_to_detail(entry, extra: dict) -> QueueEntryDetailOut:
    return QueueEntryDetailOut.model_validate({**entry.__dict__, **extra})


# ---------------------------------------------------------------------------
# Queue desks
# ---------------------------------------------------------------------------


@router.post("/queue-desks", response_model=QueueDeskOut, status_code=201)
async def create_queue_desk(
    data: QueueDeskCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).create_desk(data, user)


@router.get("/queue-desks", response_model=list[QueueDeskOut])
async def list_queue_desks(
    facility_id: uuid.UUID | None = None,
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).list_desks(facility_id, user, patient_id=patient_id)


@router.get("/queue-desks/{desk_id}", response_model=QueueDeskOut)
async def get_queue_desk(
    desk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).desks.get_or_404(desk_id)


@router.patch("/queue-desks/{desk_id}", response_model=QueueDeskOut)
async def update_queue_desk(
    desk_id: uuid.UUID,
    data: QueueDeskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).update_desk(desk_id, data, user)


@router.get("/queue-desks/{desk_id}/qr", response_model=QueueDeskQrOut)
async def get_queue_desk_qr(
    desk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    desk = await QueueService(db).get_qr(desk_id, user)
    image_base64 = None
    try:
        import qrcode

        img = qrcode.make(desk.qr_code_key)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_base64 = base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        image_base64 = None
    return QueueDeskQrOut(
        queue_desk_id=desk.id, qr_payload=desk.qr_code_key, qr_image_base64=image_base64
    )


@router.post("/queue-desks/{desk_id}/pause", response_model=QueueDeskOut)
async def pause_queue_desk(
    desk_id: uuid.UUID,
    data: PauseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).pause(desk_id, data.reason, user)


@router.post("/queue-desks/{desk_id}/resume", response_model=QueueDeskOut)
async def resume_queue_desk(
    desk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).resume(desk_id, user)


# ---------------------------------------------------------------------------
# Queue entries (patient / health worker facing)
# ---------------------------------------------------------------------------


@router.post("/queues/join", response_model=QueueEntryDetailOut, status_code=201)
async def join_queue(
    data: QueueJoinRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.join(data, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


@router.post("/queues/join-by-qr", response_model=QueueEntryDetailOut, status_code=201)
async def join_queue_by_qr(
    data: QueueJoinByQrRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.join_by_qr(data, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


@router.get("/queues/me", response_model=list[QueueEntryDetailOut])
async def list_my_queue_entries(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    rows = await service.list_mine(user)
    return [_entry_to_detail(entry, extra) for entry, extra in rows]


@router.get("/queues/{entry_id}", response_model=QueueEntryDetailOut)
async def get_queue_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry, extra = await service.get_detail(entry_id, user)
    return _entry_to_detail(entry, extra)


@router.post("/queues/{entry_id}/cancel", response_model=QueueEntryDetailOut)
async def cancel_queue_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.cancel(entry_id, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


@router.post("/queues/{entry_id}/rejoin", response_model=QueueEntryDetailOut)
async def rejoin_queue_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.rejoin(entry_id, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


# ---------------------------------------------------------------------------
# Doctor-facing queue management
# ---------------------------------------------------------------------------


@router.get("/doctor/queue/current", response_model=DoctorQueueOut)
async def get_doctor_current_queue(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).doctor_current(user)


@router.post("/doctor/queue/call-next", response_model=QueueEntryDetailOut)
async def call_next_patient(
    queue_desk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.call_next(queue_desk_id, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


@router.post("/queues/{entry_id}/start-consultation", response_model=QueueEntryDetailOut)
async def start_consultation(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.start_consultation(entry_id, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


@router.post("/queues/{entry_id}/complete", response_model=QueueEntryDetailOut)
async def complete_consultation(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.complete(entry_id, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


@router.post("/queues/{entry_id}/skip", response_model=QueueEntryDetailOut)
async def skip_patient(
    entry_id: uuid.UUID,
    data: SkipRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = QueueService(db)
    entry = await service.skip(entry_id, data.reason, user)
    _, extra = await service.get_detail(entry.id, user)
    return _entry_to_detail(entry, extra)


# ---------------------------------------------------------------------------
# Facility-facing overview
# ---------------------------------------------------------------------------


@router.get("/facility/queues/overview", response_model=FacilityQueueOverviewOut)
async def get_facility_queue_overview(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await QueueService(db).facility_overview(facility_id, user)
