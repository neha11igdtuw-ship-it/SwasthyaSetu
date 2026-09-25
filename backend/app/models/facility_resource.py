import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.types import GUID


class FacilityResource(Base):
    """Single row per facility tracking bed/ICU/oxygen/ambulance/blood/vaccine
    counts shown on the facility dashboard's resources section."""

    __tablename__ = "facility_resources"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("facilities.id"), nullable=False, unique=True
    )
    beds_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    beds_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icu_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icu_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    oxygen_units: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ambulances_available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blood_units: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vaccine_doses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
