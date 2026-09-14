import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.enums import SyncEntityType, SyncOperation


class SyncChange(BaseModel):
    client_change_id: str
    entity_type: SyncEntityType
    operation: SyncOperation
    entity_id: uuid.UUID | None = None
    base_version: int | None = None
    payload: dict[str, Any] = {}


class SyncPushRequest(BaseModel):
    device_id: str
    changes: list[SyncChange]


class SyncChangeResult(BaseModel):
    client_change_id: str
    status: str  # APPLIED | ALREADY_APPLIED | CONFLICT | ERROR
    entity_id: uuid.UUID | None = None
    version: int | None = None
    server_state: dict[str, Any] | None = None
    error: str | None = None


class SyncPushResponse(BaseModel):
    results: list[SyncChangeResult]


class SyncPullRequest(BaseModel):
    since: datetime | None = None


class SyncPullResponse(BaseModel):
    server_time: datetime
    patients: list[dict[str, Any]]
    referrals: list[dict[str, Any]]
    care_gaps: list[dict[str, Any]]
