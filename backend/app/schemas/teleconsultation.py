import uuid
from datetime import datetime
from pydantic import BaseModel

from app.models.enums import AppointmentStatus
from app.schemas.common import ORMBase


class SpecialityOut(BaseModel):
    name: str
    doctor_count: int = 0


class TeleconsultationSlotOut(ORMBase):
    id: uuid.UUID
    doctor_id: uuid.UUID
    facility_id: uuid.UUID
    facility_name: str | None = None
    start_time: datetime
    end_time: datetime
    note: str | None = None
    is_booked: bool
    consultation_type: str | None = None
    consultation_fee: float | None = None


class TeleconsultationDoctorOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str | None = None
    facility_id: uuid.UUID | None = None
    facility_name: str | None = None
    speciality: str | None = None
    qualification: str | None = None
    experience_years: int | None = None
    languages: str | None = None
    status: str = "Active"
    consultation_type: str | None = "Teleconsultation"
    consultation_fee: float | None = None
    next_available_slot: datetime | None = None
    available_slots_count: int = 0


class TeleconsultationBookRequest(BaseModel):
    doctor_id: uuid.UUID
    availability_id: uuid.UUID
    reason: str | None = None
    symptoms_description: str | None = None
    speciality: str | None = None


class TeleconsultationAppointmentOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: str | None = None
    patient_phone: str | None = None
    patient_care_pathway: str | None = None
    doctor_id: uuid.UUID | None = None
    doctor_name: str | None = None
    doctor_speciality: str | None = None
    facility_id: uuid.UUID | None = None
    facility_name: str | None = None
    availability_id: uuid.UUID | None = None
    referral_id: uuid.UUID | None = None
    encounter_id: uuid.UUID | None = None
    scheduled_at: datetime
    status: AppointmentStatus
    reason: str | None = None
    consultation_type: str | None = "Teleconsultation"
    meeting_room_id: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    consultation_fee: float | None = None
    version: int = 1
    is_deleted: bool = False


class TeleconsultationRoomInfoOut(BaseModel):
    appointment_id: uuid.UUID
    room_id: str
    state: str  # "BEFORE_APPOINTMENT" | "NEAR_APPOINTMENT" | "ACTIVE" | "COMPLETED" | "CANCELLED"
    state_message: str
    can_join: bool
    scheduled_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    patient_id: uuid.UUID
    patient_name: str
    patient_care_pathway: str | None = None
    doctor_id: uuid.UUID | None = None
    doctor_name: str | None = None
    doctor_speciality: str | None = None
    facility_name: str | None = None
    ice_servers: list[dict]
    is_patient: bool
    is_doctor: bool


class TeleconsultationNotesRequest(BaseModel):
    chief_complaint: str | None = None
    clinical_observations: str | None = None
    assessment: str | None = None
    advice: str | None = None
    treatment_plan: str | None = None
    follow_up_recommendation: str | None = None
    notes: str | None = None


class TeleconsultationPrescriptionItem(BaseModel):
    inventory_item_id: uuid.UUID
    quantity: int = 1
    dosage_instructions: str | None = None


class TeleconsultationDiagnosticItem(BaseModel):
    test_type: str


class TeleconsultationReferralItem(BaseModel):
    to_facility_id: uuid.UUID
    reason: str
    urgency: str = "ROUTINE"
    specialty_needed: str | None = None


class TeleconsultationCompleteRequest(BaseModel):
    notes: TeleconsultationNotesRequest | None = None
    prescriptions: list[TeleconsultationPrescriptionItem] | None = None
    diagnostic_orders: list[TeleconsultationDiagnosticItem] | None = None
    referral: TeleconsultationReferralItem | None = None
