import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.care import AppointmentRepository
from app.repositories.patients import PatientRepository
from app.schemas.care import AppointmentCreate, AppointmentOut, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return await AppointmentRepository(db).list_active(patient_id=patient_id)


@router.post("", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    payload = data.model_dump()
    if user.role in (Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_STAFF, Role.FACILITY_ADMIN):
        payload["facility_id"] = payload.get("facility_id") or user.facility_id
    repo = AppointmentRepository(db)
    appointment = await repo.create(**payload)
    await db.commit()
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = AppointmentRepository(db)
    appointment = await repo.get_or_404(appointment_id)
    patient = await PatientRepository(db).get_or_404(appointment.patient_id)
    assert_patient_access(user, patient)
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot modify appointments")
    repo = AppointmentRepository(db)
    appointment = await repo.get_or_404(appointment_id)
    patient = await PatientRepository(db).get_or_404(appointment.patient_id)
    assert_patient_access(user, patient)
    changes = data.model_dump(exclude={"base_version"})
    appointment = await repo.apply_update(appointment_id, data.base_version, changes)
    await db.commit()
    return appointment
