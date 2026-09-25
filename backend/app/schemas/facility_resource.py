import uuid

from pydantic import BaseModel

from app.schemas.common import ORMBase


class FacilityResourceOut(ORMBase):
    id: uuid.UUID
    facility_id: uuid.UUID
    beds_total: int
    beds_available: int
    icu_total: int
    icu_available: int
    oxygen_units: int
    ambulances_available: int
    blood_units: int
    vaccine_doses: int


class FacilityResourceUpdate(BaseModel):
    beds_total: int | None = None
    beds_available: int | None = None
    icu_total: int | None = None
    icu_available: int | None = None
    oxygen_units: int | None = None
    ambulances_available: int | None = None
    blood_units: int | None = None
    vaccine_doses: int | None = None
