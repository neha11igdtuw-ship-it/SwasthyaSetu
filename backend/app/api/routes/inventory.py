import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_facility_access, get_current_user
from app.core.errors import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.inventory import InventoryRepository
from app.schemas.inventory import (
    InventoryAdjust,
    InventoryItemCreate,
    InventoryItemOut,
    InventoryTransactionOut,
)
from app.services.inventory import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItemOut])
async def list_inventory(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot access inventory")
    assert_facility_access(user, facility_id)
    return await InventoryService(db).list_for_facility(facility_id)


@router.get("/low-stock", response_model=list[InventoryItemOut])
async def low_stock(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot access inventory")
    assert_facility_access(user, facility_id)
    return await InventoryService(db).low_stock(facility_id)


@router.post("", response_model=InventoryItemOut, status_code=201)
async def create_item(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot manage inventory")
    assert_facility_access(user, data.facility_id)
    return await InventoryService(db).create_item(data)


@router.post("/{item_id}/adjust", response_model=InventoryTransactionOut)
async def adjust_stock(
    item_id: uuid.UUID,
    data: InventoryAdjust,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot manage inventory")
    item = await InventoryRepository(db).get(item_id)
    if item is None:
        raise NotFoundError(f"InventoryItem {item_id} not found")
    assert_facility_access(user, item.facility_id)
    _, txn = await InventoryService(db).adjust(item_id, data.delta, data.reason, user.id)
    return txn
