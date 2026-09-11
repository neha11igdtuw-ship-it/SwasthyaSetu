import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import SyncEntityType, SyncOperation
from app.models.types import GUID


class SyncedChange(Base):
    """Records every change pushed by a device, keyed by the device-generated
    client_change_id so re-sending the same push after a dropped response is
    idempotent (we return the previously recorded result instead of re-applying)."""

    __tablename__ = "synced_changes"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    client_change_id: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_type: Mapped[SyncEntityType] = mapped_column(
        Enum(SyncEntityType, name="sync_entity_type_enum"), nullable=False
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    operation: Mapped[SyncOperation] = mapped_column(
        Enum(SyncOperation, name="sync_operation_enum"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="APPLIED")
    result_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("device_id", "client_change_id", name="uq_device_client_change"),
    )
