import uuid

from pydantic import BaseModel

from app.models.enums import ReferralStatus
from app.schemas.common import ORMBase


class ReferralCreate(BaseModel):
    patient_id: uuid.UUID
    from_facility_id: uuid.UUID | None = None
    to_facility_id: uuid.UUID | None = None
    reason: str
    specialty_needed: str | None = None
    urgency: str = "ROUTINE"
    notes: str | None = None


class ReferralStatusUpdate(BaseModel):
    base_version: int
    status: ReferralStatus
    notes: str | None = None


class ReferralOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    from_facility_id: uuid.UUID | None
    to_facility_id: uuid.UUID | None
    reason: str
    specialty_needed: str | None
    urgency: str
    status: ReferralStatus
    notes: str | None
    version: int
    is_deleted: bool


class MatchCandidate(BaseModel):
    facility_id: uuid.UUID
    facility_name: str
    score: float
    distance_km: float | None
    reasons: list[str]
