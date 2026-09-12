import math
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_facility_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.models.enums import Role
from app.models.facility import Facility
from app.models.inventory import InventoryItem
from app.models.user import User
from app.repositories.facilities import FacilityRepository
from app.repositories.inventory import InventoryRepository
from app.schemas.inventory import (
    InventoryAdjust,
    InventoryItemCreate,
    InventoryItemOut,
    InventoryTransactionOut,
    NearbyInventoryOut,
)
from app.services.inventory import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _stock_status(quantity: int, reorder_level: int) -> str:
    if quantity <= 0:
        return "OUT_OF_STOCK"
    if quantity <= reorder_level:
        return "LOW_STOCK"
    return "AVAILABLE"


def _distance_km(
    lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None
) -> float | None:
    if None in (lat1, lon1, lat2, lon2):
        return None
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return round(radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)


async def _origin_coords(db: AsyncSession, user: User) -> tuple[float | None, float | None]:
    facility_id = user.facility_id
    if user.role == Role.PATIENT:
        try:
            patient = await get_own_patient(db, user)
            facility_id = patient.facility_id or user.facility_id
        except ForbiddenError:
            facility_id = user.facility_id
    if facility_id is None:
        return None, None
    facility = await FacilityRepository(db).get(facility_id)
    if facility is None:
        return None, None
    return facility.latitude, facility.longitude


async def _list_nearby(db: AsyncSession, user: User, query: str | None) -> list[NearbyInventoryOut]:
    origin_lat, origin_lon = await _origin_coords(db, user)
    stmt = select(InventoryItem, Facility).join(Facility, InventoryItem.facility_id == Facility.id)
    if query:
        stmt = stmt.where(InventoryItem.name.ilike(f"%{query.strip()}%"))
    result = await db.execute(stmt)
    rows: list[NearbyInventoryOut] = []
    for item, facility in result.all():
        rows.append(
            NearbyInventoryOut(
                item_id=item.id,
                name=item.name,
                facility_id=facility.id,
                facility_name=facility.name,
                quantity=item.quantity,
                reorder_level=item.reorder_level,
                unit=item.unit,
                status=_stock_status(item.quantity, item.reorder_level),
                distance_km=_distance_km(origin_lat, origin_lon, facility.latitude, facility.longitude),
            )
        )
    rows.sort(key=lambda r: (r.distance_km is None, r.distance_km or 0, r.name.lower()))
    return rows[:100]


@router.get("/nearby", response_model=list[NearbyInventoryOut])
async def nearby_inventory(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _list_nearby(db, user, None)


@router.get("/search", response_model=list[NearbyInventoryOut])
async def search_inventory(
    query: str = "",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _list_nearby(db, user, query or None)


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
