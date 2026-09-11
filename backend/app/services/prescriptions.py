import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.care import Prescription
from app.repositories.care import PrescriptionRepository
from app.repositories.inventory import InventoryRepository
from app.schemas.care import PrescriptionCreate


class PrescriptionService:
    """Creating a prescription decrements the matching inventory item's stock
    through the existing InventoryRepository.adjust_stock ledger (locks the
    row, rejects if it would go negative), so prescriptions and dispensing
    share one source of truth for stock levels."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PrescriptionRepository(db)
        self.inventory_repo = InventoryRepository(db)

    async def create(
        self, data: PrescriptionCreate, prescribed_by_id: uuid.UUID | None
    ) -> Prescription:
        # Raises NotFoundError / ConflictError (insufficient stock) which bubble
        # up as 404/409 via the existing error-handling middleware.
        await self.inventory_repo.adjust_stock(
            data.inventory_item_id,
            -abs(data.quantity),
            reason="prescription",
            created_by_id=prescribed_by_id,
        )
        prescription = await self.repo.create(
            patient_id=data.patient_id,
            facility_id=data.facility_id,
            encounter_id=data.encounter_id,
            inventory_item_id=data.inventory_item_id,
            prescribed_by_id=prescribed_by_id,
            quantity=data.quantity,
            dosage_instructions=data.dosage_instructions,
        )
        await self.db.commit()
        return prescription
