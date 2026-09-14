import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import AppointmentStatus, DiagnosticOrderStatus, PrescriptionStatus
from app.schemas.common import ORMBase


class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None = None
    referral_id: uuid.UUID | None = None
    availability_id: uuid.UUID | None = None
    scheduled_at: datetime
    reason: str | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    base_version: int
    scheduled_at: datetime | None = None
    status: AppointmentStatus | None = None
    reason: str | None = None


class AppointmentStatusUpdate(BaseModel):
    base_version: int
    status: AppointmentStatus
    scheduled_at: datetime | None = None


class AppointmentOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None
    referral_id: uuid.UUID | None
    availability_id: uuid.UUID | None
    scheduled_at: datetime
    status: AppointmentStatus
    reason: str | None
    version: int
    is_deleted: bool


class DiagnosticOrderCreate(BaseModel):
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None = None
    encounter_id: uuid.UUID | None = None
    screening_id: uuid.UUID | None = None
    referral_id: uuid.UUID | None = None
    test_type: str


class DiagnosticOrderUpdate(BaseModel):
    base_version: int
    status: DiagnosticOrderStatus | None = None


class DiagnosticOrderOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None
    encounter_id: uuid.UUID | None
    screening_id: uuid.UUID | None
    referral_id: uuid.UUID | None
    test_type: str
    status: DiagnosticOrderStatus
    version: int
    is_deleted: bool
    report_id: uuid.UUID | None = None
    result_summary: str | None = None


class DiagnosticReportCreate(BaseModel):
    diagnostic_order_id: uuid.UUID
    result_summary: str | None = None
    result_data: str | None = None
    result_status: str | None = None


class DiagnosticReportOut(ORMBase):
    id: uuid.UUID
    diagnostic_order_id: uuid.UUID
    result_summary: str | None
    result_data: str | None
    reported_at: datetime
    version: int
    is_deleted: bool


class PrescriptionCreate(BaseModel):
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None = None
    encounter_id: uuid.UUID | None = None
    inventory_item_id: uuid.UUID
    quantity: int = 1
    dosage_instructions: str | None = None


class PrescriptionOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None
    encounter_id: uuid.UUID | None
    inventory_item_id: uuid.UUID
    quantity: int
    dosage_instructions: str | None
    status: PrescriptionStatus
    version: int
    is_deleted: bool
    item_name: str | None = None
    stock_quantity: int | None = None
    facility_name: str | None = None
    prescribed_by_name: str | None = None
