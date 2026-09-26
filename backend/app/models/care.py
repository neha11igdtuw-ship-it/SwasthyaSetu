import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    AppointmentMode,
    AppointmentStatus,
    DiagnosticOrderStatus,
    PrescriptionStatus,
)
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class Appointment(SyncableMixin, Base):
    __tablename__ = "appointments"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True, index=True
    )
    referral_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("referrals.id"), nullable=True
    )
    availability_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("doctor_availability.id"), nullable=True
    )
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True, index=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status_enum"),
        nullable=False,
        default=AppointmentStatus.SCHEDULED,
    )
    mode: Mapped[AppointmentMode] = mapped_column(
        Enum(AppointmentMode, name="appointment_mode_enum"),
        nullable=False,
        default=AppointmentMode.IN_PERSON,
    )
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    patient = relationship("Patient")
    doctor = relationship("User")


class DiagnosticOrder(SyncableMixin, Base):
    __tablename__ = "diagnostic_orders"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True, index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("encounters.id"), nullable=True, index=True
    )
    screening_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("screenings.id"), nullable=True
    )
    referral_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("referrals.id"), nullable=True
    )
    test_type: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[DiagnosticOrderStatus] = mapped_column(
        Enum(DiagnosticOrderStatus, name="diagnostic_order_status_enum"),
        nullable=False,
        default=DiagnosticOrderStatus.ORDERED,
    )
    ordered_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )

    patient = relationship("Patient")
    report = relationship(
        "DiagnosticReport", back_populates="order", uselist=False, cascade="all, delete-orphan"
    )


class DiagnosticReport(SyncableMixin, Base):
    __tablename__ = "diagnostic_reports"

    diagnostic_order_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("diagnostic_orders.id"), nullable=False, unique=True
    )
    result_summary: Mapped[str | None] = mapped_column(String(512), nullable=True)
    result_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reported_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )

    order = relationship("DiagnosticOrder", back_populates="report")


class Prescription(SyncableMixin, Base):
    __tablename__ = "prescriptions"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.id"), nullable=False, index=True
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=True, index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("encounters.id"), nullable=True, index=True
    )
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("inventory_items.id"), nullable=False
    )
    prescribed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    dosage_instructions: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[PrescriptionStatus] = mapped_column(
        Enum(PrescriptionStatus, name="prescription_status_enum"),
        nullable=False,
        default=PrescriptionStatus.ACTIVE,
    )

    patient = relationship("Patient")
    inventory_item = relationship("InventoryItem")
