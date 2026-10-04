import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.enums import SupportRequestReason, SupportRequestStatus
from app.schemas.common import ORMBase


class SupportRequestCreate(BaseModel):
    reason: SupportRequestReason
    message: str | None = None


class SupportRequestStatusUpdate(BaseModel):
    base_version: int
    status: SupportRequestStatus


class SupportRequestOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None
    reason: SupportRequestReason
    message: str | None
    status: SupportRequestStatus
    assigned_to_id: uuid.UUID | None
    related_message_id: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
    version: int
    patient_name: str | None = None


class CareGapActionOut(BaseModel):
    id: uuid.UUID
    gap_type: str
    description: str | None
    due_date: date | None
    status: str
