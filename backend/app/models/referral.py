import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ReferralStatus
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class Referral(SyncableMixin, Base):
    __tablename__ = "referrals"

    patient_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("patients.id"), nullable=False)
    from_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True
    )
    to_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True
    )
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty_needed: Mapped[str | None] = mapped_column(String(128), nullable=True)
    urgency: Mapped[str] = mapped_column(String(16), nullable=False, default="ROUTINE")
    status: Mapped[ReferralStatus] = mapped_column(
        Enum(ReferralStatus, name="referral_status_enum"),
        nullable=False,
        default=ReferralStatus.CREATED,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )
    screening_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("screenings.id"),
        nullable=True,
        doc="Screening that triggered this referral, if any.",
    )

    patient = relationship("Patient", back_populates="referrals")
