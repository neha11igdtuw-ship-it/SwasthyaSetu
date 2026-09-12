import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class Patient(SyncableMixin, Base):
    __tablename__ = "patients"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    village: Mapped[str | None] = mapped_column(String(255), nullable=True)
    care_pathway: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pregnancy_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    abha_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True
    )
    registered_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        nullable=True,
        unique=True,
        doc="Linked login account for this patient (role=PATIENT), if any.",
    )
    emergency_contact: Mapped[str | None] = mapped_column(String(64), nullable=True)

    referrals = relationship("Referral", back_populates="patient")
    care_gaps = relationship("CareGap", back_populates="patient")
    pregnancies = relationship("Pregnancy", back_populates="patient")
    encounters = relationship("Encounter", back_populates="patient")
