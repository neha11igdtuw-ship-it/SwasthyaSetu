import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import PregnancyStatus, RiskLevel
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class Pregnancy(SyncableMixin, Base):
    __tablename__ = "pregnancies"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gravida: Mapped[int | None] = mapped_column(Integer, nullable=True)
    para: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risk_level_enum"), nullable=False, default=RiskLevel.LOW
    )
    risk_flags: Mapped[str | None] = mapped_column(
        String(512), nullable=True, doc="Comma separated risk flags, e.g. 'hypertension,anemia'"
    )
    status: Mapped[PregnancyStatus] = mapped_column(
        Enum(PregnancyStatus, name="pregnancy_status_enum"),
        nullable=False,
        default=PregnancyStatus.ACTIVE,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient = relationship("Patient", back_populates="pregnancies")


class Encounter(SyncableMixin, Base):
    __tablename__ = "encounters"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True, index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        nullable=True,
        doc="Health worker or doctor who authored this encounter.",
    )
    encounter_type: Mapped[str] = mapped_column(String(64), nullable=False, default="GENERAL")
    encounter_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient = relationship("Patient", back_populates="encounters")
    symptoms = relationship("Symptom", back_populates="encounter", cascade="all, delete-orphan")
    vitals = relationship("Vital", back_populates="encounter", cascade="all, delete-orphan")
    screenings = relationship("Screening", back_populates="encounter", cascade="all, delete-orphan")


class Symptom(SyncableMixin, Base):
    __tablename__ = "symptoms"

    encounter_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("encounters.id"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    onset_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    encounter = relationship("Encounter", back_populates="symptoms")


class Vital(SyncableMixin, Base):
    __tablename__ = "vitals"

    encounter_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("encounters.id"), nullable=False, index=True
    )
    systolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diastolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pulse: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    spo2: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    encounter = relationship("Encounter", back_populates="vitals")


class Screening(SyncableMixin, Base):
    __tablename__ = "screenings"

    encounter_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("encounters.id"), nullable=False, index=True
    )
    screening_type: Mapped[str] = mapped_column(String(128), nullable=False)
    result: Mapped[str | None] = mapped_column(String(255), nullable=True)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="screening_risk_level_enum"), nullable=False, default=RiskLevel.LOW
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    encounter = relationship("Encounter", back_populates="screenings")
