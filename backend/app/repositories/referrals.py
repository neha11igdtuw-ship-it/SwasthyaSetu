from app.models.referral import Referral
from app.repositories.base import SyncableRepository


class ReferralRepository(SyncableRepository[Referral]):
    model = Referral
