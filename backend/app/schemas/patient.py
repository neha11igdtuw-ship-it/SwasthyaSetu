import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ORMBase


class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: date | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    phone: str | None = None
    village: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    care_pathway: str | None = None
    pregnancy_week: int | None = Field(default=None, ge=1, le=45)
    preferred_language: str | None = None
    expected_delivery_date: date | None = None
    systolic_bp: int | None = None
    diastolic_bp: int | None = None
    pulse: int | None = None
    abha_id: str | None = None
    facility_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def derive_dob_from_age(self) -> "PatientCreate":
        if self.date_of_birth is None and self.age is not None:
            today = date.today()
            try:
                self.date_of_birth = today.replace(year=today.year - self.age)
            except ValueError:
                self.date_of_birth = today.replace(year=today.year - self.age, day=28)
        return self


class PatientUpdate(BaseModel):
    base_version: int
    full_name: str | None = None
    date_of_birth: date | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    phone: str | None = None
    village: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    care_pathway: str | None = None
    pregnancy_week: int | None = None
    preferred_language: str | None = None
    emergency_contact: str | None = None
    abha_id: str | None = None
    facility_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def derive_dob_from_age(self) -> "PatientUpdate":
        if self.date_of_birth is None and self.age is not None:
            today = date.today()
            try:
                self.date_of_birth = today.replace(year=today.year - self.age)
            except ValueError:
                self.date_of_birth = today.replace(year=today.year - self.age, day=28)
        return self


class PatientOut(ORMBase):
    id: uuid.UUID
    full_name: str
    date_of_birth: date | None
    gender: str | None
    phone: str | None
    village: str | None
    latitude: float | None = None
    longitude: float | None = None
    care_pathway: str | None = None
    pregnancy_week: int | None = None
    preferred_language: str | None = None
    emergency_contact: str | None = None
    abha_id: str | None
    facility_id: uuid.UUID | None
    version: int
    is_deleted: bool


class EmergencyAlertOut(BaseModel):
    encounter_id: uuid.UUID
    notified_health_worker: bool
    created_at: datetime
