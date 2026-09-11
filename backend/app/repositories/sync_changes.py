from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sync import SyncedChange


class SyncedChangeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find(self, device_id: str, client_change_id: str) -> SyncedChange | None:
        result = await self.db.execute(
            select(SyncedChange).where(
                SyncedChange.device_id == device_id,
                SyncedChange.client_change_id == client_change_id,
            )
        )
        return result.scalar_one_or_none()

    async def record(self, **kwargs) -> SyncedChange:
        change = SyncedChange(**kwargs)
        self.db.add(change)
        await self.db.flush()
        return change
