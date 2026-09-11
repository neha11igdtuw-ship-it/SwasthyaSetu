import uuid
from datetime import date

from pydantic import BaseModel

from app.models.enums import CareGapStatus
from app.schemas.common import ORMBase


class CareGapCreate(BaseModel):
    patient_id: uuid.UUID
    gap_type: str
    description: str | None = None
    due_date: date | None = None


class CareGapClose(BaseModel):
    base_version: int


class CareGapOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    gap_type: str
    description: str | None
    due_date: date | None
    status: CareGapStatus
    version: int
