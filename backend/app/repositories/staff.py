import uuid
from datetime import datetime

from sqlalchemy import select

from app.core.errors import ConflictError
from app.models.staff import DoctorAvailability, HealthWorkerProfile
from app.repositories.base import SyncableRepository


class DoctorAvailabilityRepository(SyncableRepository[DoctorAvailability]):
    model = DoctorAvailability

    async def list_available(
        self, facility_id: uuid.UUID, day_start: datetime, day_end: datetime
    ) -> list[DoctorAvailability]:
        """Unbooked slots at a facility whose start_time falls within [day_start, day_end)."""
        stmt = (
            select(DoctorAvailability)
            .where(DoctorAvailability.is_deleted.is_(False))
            .where(DoctorAvailability.facility_id == facility_id)
            .where(DoctorAvailability.is_booked.is_(False))
            .where(DoctorAvailability.start_time >= day_start)
            .where(DoctorAvailability.start_time < day_end)
            .order_by(DoctorAvailability.start_time.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def mark_booked(self, slot_id: uuid.UUID) -> DoctorAvailability:
        slot = await self.get_or_404(slot_id)
        if slot.is_booked:
            raise ConflictError(
                "This time slot was just booked by someone else. Please pick another."
            )
        slot.is_booked = True
        slot.version += 1
        await self.db.flush()
        return slot


class HealthWorkerProfileRepository(SyncableRepository[HealthWorkerProfile]):
    model = HealthWorkerProfile
