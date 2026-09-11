from app.models.patient import Patient
from app.repositories.base import SyncableRepository


class PatientRepository(SyncableRepository[Patient]):
    model = Patient
