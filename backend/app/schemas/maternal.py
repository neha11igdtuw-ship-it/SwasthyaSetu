import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.enums import PregnancyStatus, RiskLevel
from app.schemas.common import ORMBase


class PregnancyCreate(BaseModel):
    patient_id: uuid.UUID
    expected_delivery_date: date | None = None
    gravida: int | None = None
    para: int | None = None
    risk_level: RiskLevel = RiskLevel.LOW
    risk_flags: str | None = None
    notes: str | None = None


class PregnancyUpdate(BaseModel):
    base_version: int
    expected_delivery_date: date | None = None
    risk_level: RiskLevel | None = None
    risk_flags: str | None = None
    status: PregnancyStatus | None = None
    notes: str | None = None


class PregnancyOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    expected_delivery_date: date | None
    gravida: int | None
    para: int | None
    risk_level: RiskLevel
    risk_flags: str | None
    status: PregnancyStatus
    notes: str | None
    version: int
    is_deleted: bool


class EncounterCreate(BaseModel):
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None = None
    encounter_type: str = "GENERAL"
    encounter_date: datetime | None = None
    notes: str | None = None


class EncounterOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: uuid.UUID | None
    author_id: uuid.UUID | None
    encounter_type: str
    encounter_date: datetime
    notes: str | None
    version: int
    is_deleted: bool


class SymptomCreate(BaseModel):
    encounter_id: uuid.UUID
    description: str
    severity: str | None = None
    onset_date: date | None = None


class SymptomOut(ORMBase):
    id: uuid.UUID
    encounter_id: uuid.UUID
    description: str
    severity: str | None
    onset_date: date | None
    version: int
    is_deleted: bool


class VitalCreate(BaseModel):
    encounter_id: uuid.UUID
    systolic_bp: int | None = None
    diastolic_bp: int | None = None
    pulse: int | None = None
    temperature_c: float | None = None
    weight_kg: float | None = None
    spo2: int | None = None


class VitalOut(ORMBase):
    id: uuid.UUID
    encounter_id: uuid.UUID
    systolic_bp: int | None
    diastolic_bp: int | None
    pulse: int | None
    temperature_c: float | None
    weight_kg: float | None
    spo2: int | None
    recorded_at: datetime
    version: int
    is_deleted: bool


class ScreeningCreate(BaseModel):
    encounter_id: uuid.UUID
    screening_type: str
    result: str | None = None
    risk_level: RiskLevel = RiskLevel.LOW
    notes: str | None = None
    # If set, a referral is created and linked to this screening.
    create_referral: bool = False
    referral_reason: str | None = None
    referral_to_facility_id: uuid.UUID | None = None
    referral_specialty_needed: str | None = None


class ScreeningOut(ORMBase):
    id: uuid.UUID
    encounter_id: uuid.UUID
    screening_type: str
    result: str | None
    risk_level: RiskLevel
    notes: str | None
    version: int
    is_deleted: bool
    referral_id: uuid.UUID | None = None
