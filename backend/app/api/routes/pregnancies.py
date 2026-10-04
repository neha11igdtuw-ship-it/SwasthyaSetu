import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.maternal import PregnancyRepository
from app.repositories.patients import PatientRepository
from app.schemas.maternal import PregnancyCreate, PregnancyOut, PregnancyUpdate

router = APIRouter(prefix="/pregnancies", tags=["pregnancies"])


@router.get("", response_model=list[PregnancyOut])
async def list_pregnancies(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return await PregnancyRepository(db).list_active(patient_id=patient_id)


@router.post("", response_model=PregnancyOut, status_code=201)
async def create_pregnancy(
    data: PregnancyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot record their own pregnancy data")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    repo = PregnancyRepository(db)
    pregnancy = await repo.create(**data.model_dump())
    await db.commit()
    return pregnancy


@router.get("/{pregnancy_id}", response_model=PregnancyOut)
async def get_pregnancy(
    pregnancy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = PregnancyRepository(db)
    pregnancy = await repo.get_or_404(pregnancy_id)
    patient = await PatientRepository(db).get_or_404(pregnancy.patient_id)
    assert_patient_access(user, patient)
    return pregnancy


@router.patch("/{pregnancy_id}", response_model=PregnancyOut)
async def update_pregnancy(
    pregnancy_id: uuid.UUID,
    data: PregnancyUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot edit their own pregnancy data")
    repo = PregnancyRepository(db)
    pregnancy = await repo.get_or_404(pregnancy_id)
    patient = await PatientRepository(db).get_or_404(pregnancy.patient_id)
    assert_patient_access(user, patient)
    changes = data.model_dump(exclude={"base_version"})
    pregnancy = await repo.apply_update(pregnancy_id, data.base_version, changes)
    await db.commit()
    return pregnancy
