from app.models.staff import DoctorAvailability, HealthWorkerProfile
from app.repositories.base import SyncableRepository


class DoctorAvailabilityRepository(SyncableRepository[DoctorAvailability]):
    model = DoctorAvailability


class HealthWorkerProfileRepository(SyncableRepository[HealthWorkerProfile]):
    model = HealthWorkerProfile
