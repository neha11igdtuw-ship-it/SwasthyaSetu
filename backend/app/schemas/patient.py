import uuid
from datetime import date

from pydantic import BaseModel

from app.schemas.common import ORMBase


class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    village: str | None = None
    abha_id: str | None = None
    facility_id: uuid.UUID | None = None


class PatientUpdate(BaseModel):
    base_version: int
    full_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    village: str | None = None
    abha_id: str | None = None
    facility_id: uuid.UUID | None = None


class PatientOut(ORMBase):
    id: uuid.UUID
    full_name: str
    date_of_birth: date | None
    gender: str | None
    phone: str | None
    village: str | None
    abha_id: str | None
    facility_id: uuid.UUID | None
    version: int
    is_deleted: bool
