import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import CareGapStatus
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class CareGap(SyncableMixin, Base):
    __tablename__ = "care_gaps"

    patient_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("patients.id"), nullable=False)
    gap_type: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[CareGapStatus] = mapped_column(
        Enum(CareGapStatus, name="care_gap_status_enum"),
        nullable=False,
        default=CareGapStatus.OPEN,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="care_gaps")
