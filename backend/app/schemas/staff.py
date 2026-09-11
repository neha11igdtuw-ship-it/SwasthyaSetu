import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import HealthWorkerCadre
from app.schemas.common import ORMBase


class DoctorAvailabilityCreate(BaseModel):
    doctor_id: uuid.UUID
    facility_id: uuid.UUID
    start_time: datetime
    end_time: datetime


class DoctorAvailabilityUpdate(BaseModel):
    base_version: int
    is_booked: bool | None = None


class DoctorAvailabilityOut(ORMBase):
    id: uuid.UUID
    doctor_id: uuid.UUID
    facility_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    is_booked: bool
    version: int
    is_deleted: bool


class HealthWorkerProfileCreate(BaseModel):
    user_id: uuid.UUID
    facility_id: uuid.UUID
    cadre: HealthWorkerCadre = HealthWorkerCadre.ASHA
    area: str | None = None


class HealthWorkerProfileOut(ORMBase):
    id: uuid.UUID
    user_id: uuid.UUID
    facility_id: uuid.UUID
    cadre: HealthWorkerCadre
    area: str | None
    version: int
    is_deleted: bool
