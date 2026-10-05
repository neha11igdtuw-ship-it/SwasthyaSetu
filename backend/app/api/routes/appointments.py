import uuid

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user, get_own_patient
from app.core.errors import ForbiddenError, ValidationAppError
from app.db.session import get_db
from app.models.care import Appointment
from app.models.enums import AppointmentMode, AppointmentStatus, Role, TeleconsultFallback
from app.models.patient import Patient
from app.models.user import User
from app.repositories.care import AppointmentRepository
from app.repositories.patients import PatientRepository
from app.repositories.staff import DoctorAvailabilityRepository
from app.repositories.users import UserRepository
from app.schemas.care import (
    AppointmentCreate,
    AppointmentFallbackUpdate,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentUpdate,
)
from app.services.notifications import NotificationService

router = APIRouter(prefix="/appointments", tags=["appointments"])

# Statuses that represent a finished/closed appointment — shown in "history"
# views rather than upcoming/pending ones.
CLOSED_STATUSES = {
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
}


def _assert_appointment_access(user: User, appointment: Appointment, patient: Patient) -> None:
    """A doctor assigned to a teleconsultation may act on it even if the
    patient isn't registered at the doctor's own facility (patients are not
    facility-bound when requesting a teleconsultation) — everyone else falls
    back to the normal patient-record access rules."""
    if user.role == Role.DOCTOR and appointment.doctor_id == user.id:
        return
    assert_patient_access(user, patient)


async def _enrich(db: AsyncSession, rows) -> list[AppointmentOut]:
    patients = PatientRepository(db)
    users = UserRepository(db)
    out: list[AppointmentOut] = []
    for row in rows:
        payload = AppointmentOut.model_validate(row)
        updates: dict = {}
        patient = await patients.get(row.patient_id)
        if patient is not None:
            updates["patient_name"] = patient.full_name
        if row.doctor_id:
            doctor = await users.get(row.doctor_id)
            if doctor is not None:
                updates["doctor_name"] = doctor.full_name
        if updates:
            payload = payload.model_copy(update=updates)
        out.append(payload)
    return out


@router.get("/me", response_model=list[AppointmentOut])
async def list_my_appointments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await get_own_patient(db, user)
    rows = await AppointmentRepository(db).list_active(patient_id=patient.id)
    return await _enrich(db, rows)


@router.get("/doctor/me", response_model=list[AppointmentOut])
async def list_my_doctor_appointments(
    history: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Teleconsultation (and other) appointments assigned to the logged-in
    doctor. `history=false` (default) returns pending requests and upcoming
    scheduled ones; `history=true` returns completed/cancelled/no-show ones."""
    if user.role != Role.DOCTOR:
        raise ForbiddenError("Only doctors can list their assigned appointments")
    rows = await AppointmentRepository(db).list_active(doctor_id=user.id)
    if history:
        rows = [r for r in rows if r.status in CLOSED_STATUSES]
    else:
        rows = [r for r in rows if r.status not in CLOSED_STATUSES]
    rows.sort(key=lambda r: r.scheduled_at)
    return await _enrich(db, rows)


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    rows = await AppointmentRepository(db).list_active(patient_id=patient_id)
    return await _enrich(db, rows)


@router.get("/facility/{facility_id}", response_model=list[AppointmentOut])
async def list_facility_appointments(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot list facility appointments")
    if user.facility_id and user.facility_id != facility_id:
        raise ForbiddenError("Cannot view appointments for another facility")
    rows = await AppointmentRepository(db).list_active(facility_id=facility_id)
    return await _enrich(db, rows)


@router.post("", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    client_request_id: str | None = Header(default=None, alias="Idempotency-Key", max_length=64),
):
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    if user.role == Role.PATIENT:
        own = await get_own_patient(db, user)
        if own.id != patient.id:
            raise ForbiddenError("Patients can only book for themselves")
        if client_request_id:
            try:
                client_request_id = str(uuid.UUID(client_request_id))
            except ValueError as exc:
                raise ValidationAppError("Invalid request identifier") from exc
            existing = await db.execute(
                select(Appointment).where(
                    Appointment.patient_id == patient.id,
                    Appointment.client_request_id == client_request_id,
                )
            )
            found = existing.scalar_one_or_none()
            if found is not None:
                return (await _enrich(db, [found]))[0]
    else:
        assert_patient_access(user, patient)
    if data.fallback_option is not None and data.mode != AppointmentMode.TELECONSULT:
        raise ValidationAppError("A fallback option can only be set on a teleconsultation")
    payload = data.model_dump(exclude={"notes"})
    if user.role == Role.PATIENT:
        payload["client_request_id"] = client_request_id
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
        payload["doctor_id"] = payload.get("doctor_id") or slot.doctor_id
        await slot_repo.mark_booked(slot.id)

    # A patient requesting a teleconsultation with a specific doctor starts
    # as a pending request — the doctor must accept it (-> SCHEDULED) before
    # a video room is joinable, rather than it being auto-confirmed.
    if (
        user.role == Role.PATIENT
        and payload.get("mode") == AppointmentMode.TELECONSULT
        and payload.get("doctor_id")
    ):
        payload["status"] = AppointmentStatus.REQUESTED

    # Teleconsultations always carry a fallback; default to the video call
    # the patient is booking when none was chosen explicitly.
    if payload.get("mode") == AppointmentMode.TELECONSULT and not payload.get("fallback_option"):
        payload["fallback_option"] = TeleconsultFallback.VIDEO_CONSULTATION

    repo = AppointmentRepository(db)
    appointment = await repo.create(**payload)

    if appointment.mode == AppointmentMode.TELECONSULT and appointment.doctor_id:
        await NotificationService(db).notify_teleconsult_requested(
            doctor_id=appointment.doctor_id,
            patient=patient,
            appointment_id=appointment.id,
        )

    await db.commit()
    return (await _enrich(db, [appointment]))[0]


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
    _assert_appointment_access(user, appointment, patient)
    if user.role == Role.PATIENT and data.status not in {
        AppointmentStatus.CANCELLED,
        AppointmentStatus.SCHEDULED,
    }:
        raise ForbiddenError("Patients can only cancel or reschedule appointments")
    was_requested = appointment.status == AppointmentStatus.REQUESTED
    changes: dict = {"status": data.status}
    if data.scheduled_at is not None:
        changes["scheduled_at"] = data.scheduled_at
    appointment = await repo.apply_update(appointment_id, data.base_version, changes)
    if was_requested and appointment.status == AppointmentStatus.SCHEDULED:
        await NotificationService(db).notify_teleconsult_confirmed(patient)
    await db.commit()
    return (await _enrich(db, [appointment]))[0]


@router.patch("/{appointment_id}/fallback-option", response_model=AppointmentOut)
async def update_appointment_fallback_option(
    appointment_id: uuid.UUID,
    data: AppointmentFallbackUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Change the teleconsultation fallback option on an existing appointment.
    Only the owning patient (or staff with access) may change it, only while
    the appointment is still open, and only on TELECONSULT appointments."""
    repo = AppointmentRepository(db)
    appointment = await repo.get_or_404(appointment_id)
    patient = await PatientRepository(db).get_or_404(appointment.patient_id)
    _assert_appointment_access(user, appointment, patient)
    if appointment.mode != AppointmentMode.TELECONSULT:
        raise ValidationAppError("Fallback options only apply to teleconsultations")
    if appointment.status in CLOSED_STATUSES:
        raise ValidationAppError("This appointment is closed; its fallback option can't change")
    appointment = await repo.apply_update(
        appointment_id, data.base_version, {"fallback_option": data.fallback_option}
    )
    await db.commit()
    return (await _enrich(db, [appointment]))[0]


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = AppointmentRepository(db)
    appointment = await repo.get_or_404(appointment_id)
    patient = await PatientRepository(db).get_or_404(appointment.patient_id)
    _assert_appointment_access(user, appointment, patient)
    return (await _enrich(db, [appointment]))[0]


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
    _assert_appointment_access(user, appointment, patient)
    changes = data.model_dump(exclude={"base_version"})
    appointment = await repo.apply_update(appointment_id, data.base_version, changes)
    await db.commit()
    return (await _enrich(db, [appointment]))[0]
