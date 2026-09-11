from app.models.care_gap import CareGap
from app.repositories.base import SyncableRepository


class CareGapRepository(SyncableRepository[CareGap]):
    model = CareGap
