import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem, InventoryTransaction
from app.repositories.inventory import InventoryRepository
from app.schemas.inventory import InventoryItemCreate


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InventoryRepository(db)

    async def create_item(self, data: InventoryItemCreate) -> InventoryItem:
        item = await self.repo.create(**data.model_dump())
        await self.db.commit()
        return item

    async def adjust(
        self, item_id: uuid.UUID, delta: int, reason: str, user_id: uuid.UUID | None
    ) -> tuple[InventoryItem, InventoryTransaction]:
        item, txn = await self.repo.adjust_stock(item_id, delta, reason, user_id)
        await self.db.commit()
        return item, txn

    async def list_for_facility(self, facility_id: uuid.UUID) -> list[InventoryItem]:
        return await self.repo.list_for_facility(facility_id)

    async def low_stock(self, facility_id: uuid.UUID) -> list[InventoryItem]:
        items = await self.repo.list_for_facility(facility_id)
        return [i for i in items if i.quantity <= i.reorder_level]
