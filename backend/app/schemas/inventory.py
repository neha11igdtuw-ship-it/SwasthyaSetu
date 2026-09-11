import uuid

from pydantic import BaseModel

from app.schemas.common import ORMBase


class InventoryItemCreate(BaseModel):
    facility_id: uuid.UUID
    name: str
    sku: str | None = None
    unit: str = "unit"
    quantity: int = 0
    reorder_level: int = 10


class InventoryAdjust(BaseModel):
    delta: int
    reason: str


class InventoryItemOut(ORMBase):
    id: uuid.UUID
    facility_id: uuid.UUID
    name: str
    sku: str | None
    unit: str
    quantity: int
    reorder_level: int
    version: int


class InventoryTransactionOut(ORMBase):
    id: uuid.UUID
    item_id: uuid.UUID
    delta: int
    reason: str
    resulting_quantity: int
