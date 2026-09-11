import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.models.inventory import InventoryItem, InventoryTransaction


class InventoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, item_id: uuid.UUID) -> InventoryItem | None:
        return await self.db.get(InventoryItem, item_id)

    async def list_for_facility(self, facility_id: uuid.UUID) -> list[InventoryItem]:
        result = await self.db.execute(
            select(InventoryItem).where(InventoryItem.facility_id == facility_id)
        )
        return list(result.scalars().all())

    async def create(self, **kwargs) -> InventoryItem:
        item = InventoryItem(**kwargs)
        self.db.add(item)
        await self.db.flush()
        return item

    async def adjust_stock(
        self, item_id: uuid.UUID, delta: int, reason: str, created_by_id: uuid.UUID | None
    ) -> tuple[InventoryItem, InventoryTransaction]:
        """Locks the item row for the duration of the transaction (SELECT ... FOR
        UPDATE) so concurrent adjustments serialize instead of racing, then
        writes an immutable ledger entry alongside the new quantity."""
        stmt = select(InventoryItem).where(InventoryItem.id == item_id)
        if self.db.bind.dialect.name != "sqlite":
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundError(f"InventoryItem {item_id} not found")

        new_quantity = item.quantity + delta
        if new_quantity < 0:
            raise ConflictError(
                "Insufficient stock for this adjustment",
                details={"current_quantity": item.quantity, "requested_delta": delta},
            )

        item.quantity = new_quantity
        item.version += 1
        txn = InventoryTransaction(
            item_id=item.id,
            delta=delta,
            reason=reason,
            resulting_quantity=new_quantity,
            created_by_id=created_by_id,
        )
        self.db.add(txn)
        await self.db.flush()
        return item, txn
