import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ReferralOutcome, ReferralStatus
from app.schemas.common import ORMBase


class CareRequestCreate(BaseModel):
    main_concern: str
    symptoms: str | None = None
    preferred_language: str | None = None
    urgency: str = "MEDIUM"
    notes: str | None = None


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


class ReferralOutcomeCreate(BaseModel):
    """Patient-reported outcome of a referral. `outcome` is validated against
    the ReferralOutcome enum, so unknown values are rejected with 422."""

    outcome: ReferralOutcome
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("notes")
    @classmethod
    def _blank_notes_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ReferralOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: str | None = None
    from_facility_id: uuid.UUID | None
    to_facility_id: uuid.UUID | None
    reason: str
    specialty_needed: str | None
    urgency: str
    status: ReferralStatus
    notes: str | None
    version: int
    is_deleted: bool
    outcome: ReferralOutcome | None = None
    outcome_notes: str | None = None
    outcome_reported_at: datetime | None = None


class MatchCandidate(BaseModel):
    facility_id: uuid.UUID
    facility_name: str
    score: float
    distance_km: float | None
    reasons: list[str]
