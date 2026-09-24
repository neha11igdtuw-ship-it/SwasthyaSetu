import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError, ValidationAppError
from app.db.session import get_db
from app.models.enums import AppointmentStatus, Role
from app.models.user import User
from app.repositories.care import AppointmentRepository
from app.repositories.patients import PatientRepository
from app.repositories.staff import DoctorAvailabilityRepository
from app.schemas.care import AppointmentCreate, AppointmentOut, AppointmentStatusUpdate, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/me", response_model=list[AppointmentOut])
async def list_my_appointments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    return await AppointmentRepository(db).list_active(patient_id=patient.id)


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
    if user.role == Role.PATIENT:
        own = await get_own_patient(db, user)
        if own.id != patient.id:
            raise ForbiddenError("Patients can only book for themselves")
    else:
        assert_patient_access(user, patient)
    payload = data.model_dump(exclude={"notes"})
    if data.notes:
        extra = data.notes.strip()
        if extra:
            payload["reason"] = f"{payload['reason']} — {extra}" if payload.get("reason") else extra
    if user.role in (Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_STAFF, Role.FACILITY_ADMIN):
        payload["facility_id"] = payload.get("facility_id") or user.facility_id

    if data.availability_id is not None:
        slot_repo = DoctorAvailabilityRepository(db)
        slot = await slot_repo.get_or_404(data.availability_id)
        if payload.get("facility_id") and slot.facility_id != payload["facility_id"]:
            raise ValidationAppError("Selected time slot does not belong to the chosen facility")
        payload["facility_id"] = slot.facility_id
        payload["scheduled_at"] = slot.start_time
        await slot_repo.mark_booked(slot.id)

    repo = AppointmentRepository(db)
    appointment = await repo.create(**payload)
    await db.commit()
    return appointment


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
async def update_appointment_status(
    appointment_id: uuid.UUID,
    data: AppointmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = AppointmentRepository(db)
    appointment = await repo.get_or_404(appointment_id)
    patient = await PatientRepository(db).get_or_404(appointment.patient_id)
    assert_patient_access(user, patient)
    if user.role == Role.PATIENT and data.status not in {
        AppointmentStatus.CANCELLED,
        AppointmentStatus.SCHEDULED,
    }:
        raise ForbiddenError("Patients can only cancel or reschedule appointments")
    changes: dict = {"status": data.status}
    if data.scheduled_at is not None:
        changes["scheduled_at"] = data.scheduled_at
    appointment = await repo.apply_update(appointment_id, data.base_version, changes)
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
        if data.status not in (None, AppointmentStatus.CANCELLED, AppointmentStatus.SCHEDULED):
            raise ForbiddenError("Patients can only cancel or reschedule appointments")
    repo = AppointmentRepository(db)
    appointment = await repo.get_or_404(appointment_id)
    patient = await PatientRepository(db).get_or_404(appointment.patient_id)
    assert_patient_access(user, patient)
    changes = data.model_dump(exclude={"base_version"})
    appointment = await repo.apply_update(appointment_id, data.base_version, changes)
    await db.commit()
    return appointment
