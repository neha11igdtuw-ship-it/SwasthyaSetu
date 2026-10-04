import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import SupportRequestReason, SupportRequestStatus
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class SupportRequest(SyncableMixin, Base):
    __tablename__ = "support_requests"
    __table_args__ = (
        Index("ix_support_requests_patient_id", "patient_id"),
        Index("ix_support_requests_facility_id", "facility_id"),
        Index("ix_support_requests_status", "status"),
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("patients.id"), nullable=False)
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True
    )
    reason: Mapped[SupportRequestReason] = mapped_column(
        Enum(SupportRequestReason, name="support_request_reason_enum"), nullable=False
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SupportRequestStatus] = mapped_column(
        Enum(SupportRequestStatus, name="support_request_status_enum"),
        nullable=False,
        default=SupportRequestStatus.SUBMITTED,
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )
    related_message_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("care_messages.id"),
        nullable=True,
        doc="The Care Team Message this request was posted as, if any.",
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient = relationship("Patient")
    assigned_to = relationship("User")
