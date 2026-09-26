import uuid
from datetime import date, datetime, time

from pydantic import BaseModel

from app.models.enums import NotificationChannel, NotificationStatus, QueueEntryStatus
from app.schemas.common import ORMBase


class QueueDeskCreate(BaseModel):
    facility_id: uuid.UUID
    department: str
    room_number: str | None = None
    doctor_id: uuid.UUID
    display_name: str
    opd_start_time: time | None = None
    opd_end_time: time | None = None
    average_consultation_minutes: int = 10


class QueueDeskUpdate(BaseModel):
    base_version: int
    department: str | None = None
    room_number: str | None = None
    display_name: str | None = None
    opd_start_time: time | None = None
    opd_end_time: time | None = None
    average_consultation_minutes: int | None = None
    is_active: bool | None = None


class QueueDeskOut(ORMBase):
    id: uuid.UUID
    facility_id: uuid.UUID
    department: str
    room_number: str | None
    doctor_id: uuid.UUID
    display_name: str
    opd_start_time: time | None
    opd_end_time: time | None
    average_consultation_minutes: int
    is_active: bool
    is_paused: bool
    pause_reason: str | None
    qr_code_key: str
    version: int


class QueueDeskQrOut(BaseModel):
    queue_desk_id: uuid.UUID
    qr_payload: str
    qr_image_base64: str | None = None


class PauseRequest(BaseModel):
    reason: str


class QueueJoinRequest(BaseModel):
    queue_desk_id: uuid.UUID
    patient_id: uuid.UUID | None = (
        None  # required when a health worker joins on behalf of a patient
    )
    referral_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    priority: int = 0  # higher priority is served earlier, ties broken by join time


class QueueJoinByQrRequest(BaseModel):
    qr_payload: str
    patient_id: uuid.UUID | None = None
    referral_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None
    priority: int = 0


class SkipRequest(BaseModel):
    reason: str | None = None


class QueueEventOut(ORMBase):
    id: uuid.UUID
    event_type: str
    previous_status: str | None
    new_status: str | None
    performed_by_user_id: uuid.UUID | None
    metadata_json: str | None
    created_at: datetime


class QueueEntryOut(ORMBase):
    id: uuid.UUID
    queue_desk_id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID
    doctor_id: uuid.UUID
    referral_id: uuid.UUID | None
    appointment_id: uuid.UUID | None
    queue_date: date
    token_number: int
    active_order: int
    status: QueueEntryStatus
    joined_at: datetime
    called_at: datetime | None
    consultation_started_at: datetime | None
    completed_at: datetime | None
    skipped_at: datetime | None
    cancelled_at: datetime | None
    rejoined_at: datetime | None
    skip_reason: str | None
    original_entry_id: uuid.UUID | None
    estimated_wait_minutes: int
    version: int


class QueueEntryDetailOut(QueueEntryOut):
    patients_ahead: int
    current_token_number: int | None
    desk_display_name: str
    desk_is_paused: bool
    desk_pause_reason: str | None


class DoctorQueueSummary(BaseModel):
    queue_desk_id: uuid.UUID
    waiting_count: int
    current_token_number: int | None
    completed_today: int
    skipped_today: int
    average_consultation_minutes: int
    is_paused: bool
    pause_reason: str | None


class DoctorQueueEntryOut(BaseModel):
    id: uuid.UUID
    token_number: int
    active_order: int
    status: QueueEntryStatus
    patient_id: uuid.UUID
    patient_name: str
    risk_flag: str | None
    referral_reason: str | None
    joined_at: datetime
    wait_minutes: int
    estimated_wait_minutes: int


class DoctorQueueOut(BaseModel):
    summary: DoctorQueueSummary
    entries: list[DoctorQueueEntryOut]


class FacilityQueueDeskSummary(BaseModel):
    queue_desk_id: uuid.UUID
    department: str
    room_number: str | None
    doctor_id: uuid.UUID
    display_name: str
    current_token_number: int | None
    waiting_count: int
    is_paused: bool
    pause_reason: str | None
    average_wait_minutes: int


class FacilityQueueOverviewOut(BaseModel):
    desks: list[FacilityQueueDeskSummary]


class NotificationOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID | None
    recipient_user_id: uuid.UUID | None
    queue_entry_id: uuid.UUID | None
    channel: NotificationChannel
    title: str
    body: str
    status: NotificationStatus
    scheduled_at: datetime
    sent_at: datetime | None
    error_message: str | None
