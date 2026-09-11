import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import HealthWorkerCadre
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class DoctorAvailability(SyncableMixin, Base):
    __tablename__ = "doctor_availability"

    doctor_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id"), nullable=False)
    facility_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=False, index=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_booked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    doctor = relationship("User")


class HealthWorkerProfile(SyncableMixin, Base):
    __tablename__ = "health_worker_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False, unique=True
    )
    facility_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=False, index=True
    )
    cadre: Mapped[HealthWorkerCadre] = mapped_column(
        Enum(HealthWorkerCadre, name="health_worker_cadre_enum"),
        nullable=False,
        default=HealthWorkerCadre.ASHA,
    )
    area: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user = relationship("User")
