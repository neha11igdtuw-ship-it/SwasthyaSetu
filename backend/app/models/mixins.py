import uuid
from datetime import datetime

from sqlalchemy import Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.types import GUID


class SyncableMixin:
    """Adds optimistic-concurrency + soft-delete support for offline sync.

    `version` is bumped on every server-side mutation. Clients must send the
    `base_version` they last saw; a mismatch means someone else changed the
    record first, and the API returns 409 CONFLICT with the current server
    state so the client can merge/resolve.
    """

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
