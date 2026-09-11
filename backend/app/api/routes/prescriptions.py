import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.care import PrescriptionRepository
from app.repositories.patients import PatientRepository
from app.schemas.care import PrescriptionCreate, PrescriptionOut
from app.services.prescriptions import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.get("", response_model=list[PrescriptionOut])
async def list_prescriptions(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return await PrescriptionRepository(db).list_active(patient_id=patient_id)


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
    return prescription
