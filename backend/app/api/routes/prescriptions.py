import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.care import PrescriptionRepository
from app.repositories.facilities import FacilityRepository
from app.repositories.inventory import InventoryRepository
from app.repositories.patients import PatientRepository
from app.repositories.users import UserRepository
from app.schemas.care import PrescriptionCreate, PrescriptionOut
from app.services.prescriptions import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


async def _enrich(db: AsyncSession, rows) -> list[PrescriptionOut]:
    inventory = InventoryRepository(db)
    facilities = FacilityRepository(db)
    users = UserRepository(db)
    out: list[PrescriptionOut] = []
    for row in rows:
        item = await inventory.get(row.inventory_item_id)
        payload = PrescriptionOut.model_validate(row)
        updates: dict = {}
        if item is not None:
            updates["item_name"] = item.name
            updates["stock_quantity"] = item.quantity
        if row.facility_id:
            facility = await facilities.get(row.facility_id)
            if facility is not None:
                updates["facility_name"] = facility.name
        if row.prescribed_by_id:
            author = await users.get(row.prescribed_by_id)
            if author is not None:
                updates["prescribed_by_name"] = author.full_name
        if updates:
            payload = payload.model_copy(update=updates)
        out.append(payload)
    return out


@router.get("/me", response_model=list[PrescriptionOut])
async def list_my_prescriptions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    rows = await PrescriptionRepository(db).list_active(patient_id=patient.id)
    return await _enrich(db, rows)


@router.get("", response_model=list[PrescriptionOut])
async def list_prescriptions(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    rows = await PrescriptionRepository(db).list_active(patient_id=patient_id)
    return await _enrich(db, rows)


@router.post("", response_model=PrescriptionOut, status_code=201)
async def create_prescription(
    data: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot self-prescribe")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    if user.facility_id is not None and data.facility_id is None:
        data = data.model_copy(update={"facility_id": user.facility_id})
    return await PrescriptionService(db).create(data, prescribed_by_id=user.id)


@router.get("/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PrescriptionRepository(db)
    prescription = await repo.get_or_404(prescription_id)
    patient = await PatientRepository(db).get_or_404(prescription.patient_id)
    assert_patient_access(user, patient)
    enriched = await _enrich(db, [prescription])
    return enriched[0]
