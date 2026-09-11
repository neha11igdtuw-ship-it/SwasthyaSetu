import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.care_gaps import CareGapRepository
from app.repositories.patients import PatientRepository
from app.schemas.care_gap import CareGapClose, CareGapCreate, CareGapOut
from app.services.care_gaps import CareGapService

router = APIRouter(prefix="/care-gaps", tags=["care-gaps"])


@router.get("", response_model=list[CareGapOut])
async def list_care_gaps(
    patient_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if patient_id is not None:
        patient = await PatientRepository(db).get_or_404(patient_id)
        assert_patient_access(user, patient)
        return await CareGapRepository(db).list_active(patient_id=patient_id)
    if user.role == Role.ADMIN:
        return await CareGapRepository(db).list_active()
    raise ForbiddenError("patient_id is required unless you are an admin")


@router.post("", response_model=CareGapOut, status_code=201)
async def create_care_gap(
    data: CareGapCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot create care gaps")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    return await CareGapService(db).create(data)


@router.post("/{gap_id}/close", response_model=CareGapOut)
async def close_care_gap(
    gap_id: uuid.UUID,
    data: CareGapClose,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot close care gaps")
    repo = CareGapRepository(db)
    gap = await repo.get_or_404(gap_id)
    patient = await PatientRepository(db).get_or_404(gap.patient_id)
    assert_patient_access(user, patient)
    return await CareGapService(db).close(gap_id, data.base_version)
