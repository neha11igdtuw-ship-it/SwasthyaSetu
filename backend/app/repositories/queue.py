import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ACTIVE_QUEUE_STATUSES, QueueEntryStatus
from app.models.queue import Notification, QueueDesk, QueueDeskCounter, QueueEntry, QueueEvent
from app.repositories.base import SyncableRepository


class QueueDeskRepository(SyncableRepository[QueueDesk]):
    model = QueueDesk

    async def get_by_qr_key(self, qr_key: str) -> QueueDesk | None:
        stmt = select(QueueDesk).where(
            QueueDesk.qr_code_key == qr_key, QueueDesk.is_deleted.is_(False)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_open_at_facilities(self, facility_ids: list[uuid.UUID]) -> list[QueueDesk]:
        if not facility_ids:
            return []
        stmt = (
            select(QueueDesk)
            .where(
                QueueDesk.is_deleted.is_(False),
                QueueDesk.is_active.is_(True),
                QueueDesk.facility_id.in_(facility_ids),
            )
            .order_by(QueueDesk.display_name.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


class QueueEntryRepository(SyncableRepository[QueueEntry]):
    model = QueueEntry

    async def next_token_number(self, queue_desk_id: uuid.UUID, queue_date: date) -> int:
        """Concurrency-safe token issuance: locks (or creates) the counter
        row for this desk+date with SELECT ... FOR UPDATE, increments it, and
        returns the new token number. Callers must be inside a transaction
        that commits promptly to release the lock."""
        stmt = (
            select(QueueDeskCounter)
            .where(
                QueueDeskCounter.queue_desk_id == queue_desk_id,
                QueueDeskCounter.queue_date == queue_date,
            )
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        counter = result.scalars().first()
        if counter is None:
            counter = QueueDeskCounter(
                queue_desk_id=queue_desk_id, queue_date=queue_date, last_token_number=0
            )
            self.db.add(counter)
            await self.db.flush()
        counter.last_token_number += 1
        await self.db.flush()
        return counter.last_token_number

    async def active_for_patient_doctor_department(
        self, patient_id: uuid.UUID, queue_desk_id: uuid.UUID, queue_date: date
    ) -> QueueEntry | None:
        stmt = select(QueueEntry).where(
            QueueEntry.patient_id == patient_id,
            QueueEntry.queue_desk_id == queue_desk_id,
            QueueEntry.queue_date == queue_date,
            QueueEntry.status.in_(list(ACTIVE_QUEUE_STATUSES)),
            QueueEntry.is_deleted.is_(False),
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def waiting_entries_for_desk(
        self, queue_desk_id: uuid.UUID, queue_date: date
    ) -> list[QueueEntry]:
        stmt = (
            select(QueueEntry)
            .where(
                QueueEntry.queue_desk_id == queue_desk_id,
                QueueEntry.queue_date == queue_date,
                QueueEntry.status == QueueEntryStatus.WAITING,
                QueueEntry.is_deleted.is_(False),
            )
            .order_by(QueueEntry.active_order.asc(), QueueEntry.joined_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def active_entries_for_desk(
        self, queue_desk_id: uuid.UUID, queue_date: date
    ) -> list[QueueEntry]:
        stmt = (
            select(QueueEntry)
            .where(
                QueueEntry.queue_desk_id == queue_desk_id,
                QueueEntry.queue_date == queue_date,
                QueueEntry.status.in_(list(ACTIVE_QUEUE_STATUSES)),
                QueueEntry.is_deleted.is_(False),
            )
            .order_by(QueueEntry.active_order.asc(), QueueEntry.joined_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_for_desk_status(
        self, queue_desk_id: uuid.UUID, queue_date: date, status: QueueEntryStatus
    ) -> int:
        stmt = select(func.count()).where(
            QueueEntry.queue_desk_id == queue_desk_id,
            QueueEntry.queue_date == queue_date,
            QueueEntry.status == status,
            QueueEntry.is_deleted.is_(False),
        )
        result = await self.db.execute(stmt)
        return int(result.scalar_one())

    async def current_serving(
        self, queue_desk_id: uuid.UUID, queue_date: date
    ) -> QueueEntry | None:
        stmt = (
            select(QueueEntry)
            .where(
                QueueEntry.queue_desk_id == queue_desk_id,
                QueueEntry.queue_date == queue_date,
                QueueEntry.status.in_([QueueEntryStatus.CALLED, QueueEntryStatus.IN_CONSULTATION]),
                QueueEntry.is_deleted.is_(False),
            )
            .order_by(QueueEntry.active_order.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def max_active_order(self, queue_desk_id: uuid.UUID, queue_date: date) -> int:
        stmt = select(func.max(QueueEntry.active_order)).where(
            QueueEntry.queue_desk_id == queue_desk_id,
            QueueEntry.queue_date == queue_date,
        )
        result = await self.db.execute(stmt)
        value = result.scalar_one()
        return int(value or 0)

    async def list_for_patient(self, patient_id: uuid.UUID, limit: int = 20) -> list[QueueEntry]:
        stmt = (
            select(QueueEntry)
            .where(QueueEntry.patient_id == patient_id, QueueEntry.is_deleted.is_(False))
            .order_by(QueueEntry.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


class QueueEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        queue_entry_id: uuid.UUID,
        event_type: str,
        performed_by_user_id: uuid.UUID | None,
        previous_status: str | None,
        new_status: str | None,
        metadata_json: str | None = None,
    ) -> QueueEvent:
        event = QueueEvent(
            queue_entry_id=queue_entry_id,
            event_type=event_type,
            performed_by_user_id=performed_by_user_id,
            previous_status=previous_status,
            new_status=new_status,
            metadata_json=metadata_json,
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def list_for_entry(self, queue_entry_id: uuid.UUID) -> list[QueueEvent]:
        stmt = (
            select(QueueEvent)
            .where(QueueEvent.queue_entry_id == queue_entry_id)
            .order_by(QueueEvent.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> Notification:
        note = Notification(**kwargs)
        self.db.add(note)
        await self.db.flush()
        return note

    async def list_for_patient(self, patient_id: uuid.UUID, limit: int = 50) -> list[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.patient_id == patient_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
