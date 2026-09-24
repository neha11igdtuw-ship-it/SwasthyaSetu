import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import NotificationChannel, NotificationStatus, QueueEntryStatus
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class QueueDesk(SyncableMixin, Base):
    """A physical/virtual OPD queue for one doctor+room+department at a
    facility. Patients join a specific desk; a desk can be paused when the
    doctor is delayed/unavailable."""

    __tablename__ = "queue_desks"

    facility_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=False, index=True
    )
    department: Mapped[str] = mapped_column(String(128), nullable=False)
    room_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False, index=True
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    opd_start_time: Mapped[str | None] = mapped_column(Time, nullable=True)
    opd_end_time: Mapped[str | None] = mapped_column(Time, nullable=True)
    average_consultation_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_paused: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pause_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    qr_code_key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)

    entries = relationship("QueueEntry", back_populates="queue_desk")


class QueueDeskCounter(Base):
    """Per-desk-per-day atomic token counter. One row per (queue_desk_id,
    queue_date); token issuance takes a row lock (SELECT ... FOR UPDATE) on
    this row inside a transaction, so concurrent joins never collide.
    """

    __tablename__ = "queue_desk_counters"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    queue_desk_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("queue_desks.id"), nullable=False, index=True
    )
    queue_date: Mapped[date] = mapped_column(Date, nullable=False)
    last_token_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class QueueEntry(SyncableMixin, Base):
    __tablename__ = "queue_entries"

    queue_desk_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("queue_desks.id"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    facility_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=False, index=True
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False, index=True
    )
    referral_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), ForeignKey("referrals.id"), nullable=True)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("appointments.id"), nullable=True
    )
    queue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    token_number: Mapped[int] = mapped_column(Integer, nullable=False)
    active_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[QueueEntryStatus] = mapped_column(
        Enum(QueueEntryStatus, name="queue_entry_status_enum"),
        nullable=False,
        default=QueueEntryStatus.WAITING,
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    called_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consultation_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    skipped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejoined_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    skip_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("queue_entries.id"), nullable=True
    )
    estimated_wait_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    queue_desk = relationship("QueueDesk", back_populates="entries")
    patient = relationship("Patient")
    events = relationship(
        "QueueEvent", back_populates="queue_entry", cascade="all, delete-orphan",
        order_by="QueueEvent.created_at",
    )


class QueueEvent(Base):
    """Immutable audit-trail row for every queue-entry status transition."""

    __tablename__ = "queue_events"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    queue_entry_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("queue_entries.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    performed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )
    previous_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    queue_entry = relationship("QueueEntry", back_populates="events")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    queue_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("queue_entries.id"), nullable=True
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel_enum"),
        nullable=False,
        default=NotificationChannel.IN_APP,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status_enum"),
        nullable=False,
        default=NotificationStatus.PENDING,
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
