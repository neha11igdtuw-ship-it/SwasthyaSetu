import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError


class SyncableRepository[ModelT]:
    """CRUD for models using SyncableMixin (id, version, is_deleted).

    Optimistic concurrency: every update/delete must pass the `base_version`
    the caller last observed. If it no longer matches the row's current
    version, a ConflictError (-> HTTP 409) is raised carrying the live model
    so the caller can show the client the authoritative state.
    """

    model: type[ModelT]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, entity_id: uuid.UUID) -> ModelT | None:
        return await self.db.get(self.model, entity_id)

    async def get_or_404(self, entity_id: uuid.UUID) -> ModelT:
        obj = await self.get(entity_id)
        if obj is None or getattr(obj, "is_deleted", False):
            raise NotFoundError(f"{self.model.__name__} {entity_id} not found")
        return obj

    async def list_active(self, **filters) -> list[ModelT]:
        stmt = select(self.model).where(self.model.is_deleted.is_(False))
        for key, value in filters.items():
            if value is not None:
                stmt = stmt.where(getattr(self.model, key) == value)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_since(self, since):
        stmt = select(self.model)
        if since is not None:
            stmt = stmt.where(self.model.updated_at > since)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs) -> ModelT:
        obj = self.model(**kwargs)
        self.db.add(obj)
        await self.db.flush()
        return obj

    async def apply_update(self, entity_id: uuid.UUID, base_version: int, changes: dict) -> ModelT:
        obj = await self.get_or_404(entity_id)
        if obj.version != base_version:
            raise ConflictError(
                "Version mismatch: entity was modified by someone else",
                details={"current_version": obj.version, "current_state": self._to_dict(obj)},
            )
        for key, value in changes.items():
            if value is not None:
                setattr(obj, key, value)
        obj.version += 1
        await self.db.flush()
        return obj

    async def apply_delete(self, entity_id: uuid.UUID, base_version: int) -> ModelT:
        obj = await self.get_or_404(entity_id)
        if obj.version != base_version:
            raise ConflictError(
                "Version mismatch: entity was modified by someone else",
                details={"current_version": obj.version, "current_state": self._to_dict(obj)},
            )
        obj.is_deleted = True
        obj.version += 1
        await self.db.flush()
        return obj

    @staticmethod
    def _to_dict(obj) -> dict:
        return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}
