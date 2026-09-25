import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_own_patient
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.models.care import Appointment, ConsultationSession, DiagnosticOrder, Prescription
from app.models.enums import AppointmentStatus, DiagnosticOrderStatus, NotificationChannel, PrescriptionStatus, ReferralStatus, Role
from app.models.facility import Facility
from app.models.maternal import Encounter
from app.models.patient import Patient
from app.models.referral import Referral
from app.models.staff import DoctorAvailability, DoctorProfile
from app.models.user import User
from app.repositories.care import AppointmentRepository, DiagnosticOrderRepository, PrescriptionRepository
from app.repositories.facilities import FacilityRepository
from app.repositories.maternal import EncounterRepository
from app.repositories.patients import PatientRepository
from app.repositories.referrals import ReferralRepository
from app.repositories.users import UserRepository
from app.schemas.teleconsultation import (
    SpecialityOut,
    TeleconsultationAppointmentOut,
    TeleconsultationBookRequest,
    TeleconsultationCompleteRequest,
    TeleconsultationDoctorOut,
    TeleconsultationNotesRequest,
    TeleconsultationRoomInfoOut,
    TeleconsultationSlotOut,
)
from app.services.notifications import NotificationService

DEFAULT_STUN_SERVERS = [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "stun:stun1.l.google.com:19302"},
    {"urls": "stun:stun2.l.google.com:19302"},
]


class TeleconsultationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_specialities(self) -> list[SpecialityOut]:
        """Dynamically list all specialities available across active doctors."""
        stmt = (
            select(DoctorProfile.speciality, func.count(DoctorProfile.id))
            .join(User, User.id == DoctorProfile.user_id)
            .where(
                DoctorProfile.is_deleted.is_(False),
                DoctorProfile.speciality.isnot(None),
                User.is_active.is_(True),
                User.role == Role.DOCTOR,
            )
            .group_by(DoctorProfile.speciality)
            .order_by(DoctorProfile.speciality)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        return [
            SpecialityOut(name=row[0], doctor_count=row[1])
            for row in rows
            if row[0] and row[0].strip()
        ]

    async def list_doctors(
        self,
        speciality: str | None = None,
        facility_id: uuid.UUID | None = None,
    ) -> list[TeleconsultationDoctorOut]:
        """List eligible doctors with their profile, affiliated facility, fee, and next slot."""
        stmt = (
            select(User, DoctorProfile, Facility)
            .outerjoin(DoctorProfile, (DoctorProfile.user_id == User.id) & (DoctorProfile.is_deleted.is_(False)))
            .outerjoin(Facility, Facility.id == User.facility_id)
            .where(
                User.role == Role.DOCTOR,
                User.is_active.is_(True),
            )
        )

        if facility_id:
            stmt = stmt.where(User.facility_id == facility_id)

        result = await self.db.execute(stmt)
        doctor_rows = result.all()

        now = datetime.utcnow()
        # Fetch open slots for all doctors
        slots_stmt = select(DoctorAvailability).where(
            DoctorAvailability.is_deleted.is_(False),
            DoctorAvailability.is_booked.is_(False),
            DoctorAvailability.start_time >= now,
        ).order_by(DoctorAvailability.start_time)
        slots_res = await self.db.execute(slots_stmt)
        all_slots = slots_res.scalars().all()

        # Group slots by doctor_id
        slots_by_doctor: dict[uuid.UUID, list[DoctorAvailability]] = {}
        for s in all_slots:
            slots_by_doctor.setdefault(s.doctor_id, []).append(s)

        out: list[TeleconsultationDoctorOut] = []
        for user, profile, facility in doctor_rows:
            doc_speciality = profile.speciality if profile else None
            if speciality and (not doc_speciality or speciality.lower() not in doc_speciality.lower()):
                continue

            doc_slots = slots_by_doctor.get(user.id, [])
            next_slot = doc_slots[0].start_time if doc_slots else None
            fee = float(doc_slots[0].consultation_fee) if doc_slots and doc_slots[0].consultation_fee else None

            out.append(
                TeleconsultationDoctorOut(
                    id=user.id,
                    full_name=user.full_name,
                    email=user.email,
                    facility_id=user.facility_id,
                    facility_name=facility.name if facility else "Not available",
                    speciality=doc_speciality or "General Medicine",
                    qualification=profile.qualification if profile else "Not available",
                    experience_years=profile.experience_years if profile else None,
                    languages=profile.languages if profile else "Hindi, English",
                    status=profile.status if profile else "Active",
                    consultation_type=doc_slots[0].consultation_type if doc_slots and doc_slots[0].consultation_type else "Teleconsultation",
                    consultation_fee=fee,
                    next_available_slot=next_slot,
                    available_slots_count=len(doc_slots),
                )
            )

        return out

    async def get_doctor_profile(self, doctor_id: uuid.UUID) -> TeleconsultationDoctorOut:
        """Get complete doctor profile with facility and available slots count."""
        stmt = (
            select(User, DoctorProfile, Facility)
            .outerjoin(DoctorProfile, (DoctorProfile.user_id == User.id) & (DoctorProfile.is_deleted.is_(False)))
            .outerjoin(Facility, Facility.id == User.facility_id)
            .where(
                User.id == doctor_id,
                User.role == Role.DOCTOR,
                User.is_active.is_(True),
            )
        )
        result = await self.db.execute(stmt)
        row = result.first()
        if not row:
            raise NotFoundError("Doctor not found or inactive")

        user, profile, facility = row
        now = datetime.utcnow()
        slots_stmt = select(DoctorAvailability).where(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.is_deleted.is_(False),
            DoctorAvailability.is_booked.is_(False),
            DoctorAvailability.start_time >= now,
        ).order_by(DoctorAvailability.start_time)
        slots_res = await self.db.execute(slots_stmt)
        slots = slots_res.scalars().all()

        next_slot = slots[0].start_time if slots else None
        fee = float(slots[0].consultation_fee) if slots and slots[0].consultation_fee else None

        return TeleconsultationDoctorOut(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            facility_id=user.facility_id,
            facility_name=facility.name if facility else "Not available",
            speciality=profile.speciality if profile else "General Medicine",
            qualification=profile.qualification if profile else "Not available",
            experience_years=profile.experience_years if profile else None,
            languages=profile.languages if profile else "Hindi, English",
            status=profile.status if profile else "Active",
            consultation_type=slots[0].consultation_type if slots and slots[0].consultation_type else "Teleconsultation",
            consultation_fee=fee,
            next_available_slot=next_slot,
            available_slots_count=len(slots),
        )

    async def get_doctor_slots(self, doctor_id: uuid.UUID) -> list[TeleconsultationSlotOut]:
        """Get open, future consultation slots for a doctor."""
        now = datetime.utcnow()
        stmt = (
            select(DoctorAvailability, Facility)
            .outerjoin(Facility, Facility.id == DoctorAvailability.facility_id)
            .where(
                DoctorAvailability.doctor_id == doctor_id,
                DoctorAvailability.is_deleted.is_(False),
                DoctorAvailability.is_booked.is_(False),
                DoctorAvailability.start_time >= now,
            )
            .order_by(DoctorAvailability.start_time)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            TeleconsultationSlotOut(
                id=slot.id,
                doctor_id=slot.doctor_id,
                facility_id=slot.facility_id,
                facility_name=fac.name if fac else None,
                start_time=slot.start_time,
                end_time=slot.end_time,
                note=slot.note,
                is_booked=slot.is_booked,
                consultation_type=slot.consultation_type or "Teleconsultation",
                consultation_fee=float(slot.consultation_fee) if slot.consultation_fee else None,
                version=slot.version,
                is_deleted=slot.is_deleted,
            )
            for slot, fac in rows
        ]

    async def book_appointment(
        self,
        patient_user: User,
        data: TeleconsultationBookRequest,
    ) -> TeleconsultationAppointmentOut:
        """Atomically book a teleconsultation slot, preventing double booking race conditions."""
        # 1. Validate patient (strictly RBAC own authenticated patient - no patients[0] fallback)
        patient = await get_own_patient(self.db, patient_user)

        # 2. Validate doctor
        doctor_user = await UserRepository(self.db).get(data.doctor_id)
        if not doctor_user or doctor_user.role != Role.DOCTOR or not doctor_user.is_active:
            raise NotFoundError("Doctor not found or inactive")

        # 3. Atomically check and lock the availability slot (with_for_update prevents double booking)
        stmt = (
            select(DoctorAvailability)
            .where(DoctorAvailability.id == data.availability_id)
            .with_for_update()
        )
        res = await self.db.execute(stmt)
        slot = res.scalar_one_or_none()
        if (
            not slot
            or slot.is_deleted
            or slot.doctor_id != data.doctor_id
            or slot.is_booked
            or slot.start_time < datetime.utcnow()
        ):
            raise ConflictError(
                "Sorry, this slot is no longer available."
            )

        # Check for duplicate booking for this patient at the same time
        conflict_stmt = select(Appointment).where(
            Appointment.patient_id == patient.id,
            Appointment.scheduled_at == slot.start_time,
            Appointment.status.in_([
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.BOOKED,
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS,
            ]),
            Appointment.is_deleted.is_(False),
        )
        conflict = (await self.db.execute(conflict_stmt)).scalar_one_or_none()
        if conflict:
            raise ConflictError("You already have an active appointment scheduled at this time.")

        # 4. Mark slot as booked
        slot.is_booked = True
        slot.version += 1

        # 5. Create atomic Appointment record
        room_id = f"room-{uuid.uuid4().hex[:12]}"
        reason_text = (
            data.reason
            or data.symptoms_description
            or (f"Teleconsultation: {data.speciality}" if data.speciality else "Teleconsultation")
        )

        app_repo = AppointmentRepository(self.db)
        appointment = await app_repo.create(
            patient_id=patient.id,
            facility_id=slot.facility_id or doctor_user.facility_id,
            doctor_id=doctor_user.id,
            availability_id=slot.id,
            scheduled_at=slot.start_time,
            status=AppointmentStatus.SCHEDULED,
            reason=reason_text,
            consultation_type="Teleconsultation",
            meeting_room_id=room_id,
        )

        # Create linked ConsultationSession record
        session = ConsultationSession(
            appointment_id=appointment.id,
            patient_id=patient.id,
            doctor_id=doctor_user.id,
            room_id=room_id,
            status=AppointmentStatus.SCHEDULED,
        )
        self.db.add(session)

        # 6. Notify patient
        facility = await FacilityRepository(self.db).get(appointment.facility_id) if appointment.facility_id else None
        formatted_time = appointment.scheduled_at.strftime("%d %b %Y at %I:%M %p")
        try:
            notif_service = NotificationService(self.db)
            await notif_service.notify(
                patient=patient,
                title="Teleconsultation Booked",
                body=f"Your teleconsultation with {doctor_user.full_name} is scheduled for {formatted_time}.",
                channel=NotificationChannel.IN_APP,
            )
        except Exception:
            pass  # Non-blocking notification delivery

        await self.db.commit()
        await self.db.refresh(appointment)

        return await self._enrich_appointment(appointment, patient, doctor_user, facility, slot)

    async def list_patient_appointments(self, patient_user: User) -> list[TeleconsultationAppointmentOut]:
        """List active teleconsultations for the authenticated patient."""
        patient = await get_own_patient(self.db, patient_user)
        if not patient:
            return []

        stmt = (
            select(Appointment, User, Facility, DoctorAvailability)
            .outerjoin(User, User.id == Appointment.doctor_id)
            .outerjoin(Facility, Facility.id == Appointment.facility_id)
            .outerjoin(DoctorAvailability, DoctorAvailability.id == Appointment.availability_id)
            .where(
                Appointment.patient_id == patient.id,
                Appointment.is_deleted.is_(False),
                Appointment.consultation_type == "Teleconsultation",
            )
            .order_by(Appointment.scheduled_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        profiles_map = await self._doctor_profiles_map([u.id for u, _, _, _ in [(r[1], r[2], r[3], r[0]) for r in rows] if u])

        out: list[TeleconsultationAppointmentOut] = []
        for app, doc, fac, slot in rows:
            profile = profiles_map.get(doc.id) if doc else None
            fee = float(slot.consultation_fee) if slot and slot.consultation_fee else None
            out.append(
                TeleconsultationAppointmentOut(
                    id=app.id,
                    patient_id=app.patient_id,
                    patient_name=patient.full_name,
                    patient_phone=patient.phone,
                    patient_care_pathway=patient.care_pathway,
                    doctor_id=app.doctor_id,
                    doctor_name=doc.full_name if doc else None,
                    doctor_speciality=profile.speciality if profile else "General Medicine",
                    facility_id=app.facility_id,
                    facility_name=fac.name if fac else None,
                    availability_id=app.availability_id,
                    referral_id=app.referral_id,
                    encounter_id=app.encounter_id,
                    scheduled_at=app.scheduled_at,
                    status=app.status,
                    reason=app.reason,
                    consultation_type=app.consultation_type or "Teleconsultation",
                    meeting_room_id=app.meeting_room_id,
                    started_at=app.started_at,
                    ended_at=app.ended_at,
                    consultation_fee=fee,
                    version=app.version,
                    is_deleted=app.is_deleted,
                )
            )
        return out

    async def list_doctor_appointments(
        self,
        doctor_user: User,
        today_only: bool = False,
    ) -> list[TeleconsultationAppointmentOut]:
        """List consultations for the authenticated doctor."""
        if doctor_user.role != Role.DOCTOR:
            raise ForbiddenError("Only doctors can access doctor consultations")

        stmt = (
            select(Appointment, Patient, Facility, DoctorAvailability)
            .join(Patient, Patient.id == Appointment.patient_id)
            .outerjoin(Facility, Facility.id == Appointment.facility_id)
            .outerjoin(DoctorAvailability, DoctorAvailability.id == Appointment.availability_id)
            .where(
                Appointment.doctor_id == doctor_user.id,
                Appointment.is_deleted.is_(False),
                Appointment.consultation_type == "Teleconsultation",
            )
            .order_by(Appointment.scheduled_at.asc())
        )

        if today_only:
            now = datetime.utcnow()
            start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
            end_of_day = datetime(now.year, now.month, now.day, 23, 59, 59)
            stmt = stmt.where(Appointment.scheduled_at >= start_of_day, Appointment.scheduled_at <= end_of_day)

        result = await self.db.execute(stmt)
        rows = result.all()

        profile = (
            await self.db.execute(
                select(DoctorProfile).where(DoctorProfile.user_id == doctor_user.id, DoctorProfile.is_deleted.is_(False))
            )
        ).scalar_one_or_none()

        out: list[TeleconsultationAppointmentOut] = []
        for app, patient, fac, slot in rows:
            fee = float(slot.consultation_fee) if slot and slot.consultation_fee else None
            out.append(
                TeleconsultationAppointmentOut(
                    id=app.id,
                    patient_id=app.patient_id,
                    patient_name=patient.full_name,
                    patient_phone=patient.phone,
                    patient_care_pathway=patient.care_pathway,
                    doctor_id=app.doctor_id,
                    doctor_name=doctor_user.full_name,
                    doctor_speciality=profile.speciality if profile else "General Medicine",
                    facility_id=app.facility_id,
                    facility_name=fac.name if fac else None,
                    availability_id=app.availability_id,
                    referral_id=app.referral_id,
                    encounter_id=app.encounter_id,
                    scheduled_at=app.scheduled_at,
                    status=app.status,
                    reason=app.reason,
                    consultation_type=app.consultation_type or "Teleconsultation",
                    meeting_room_id=app.meeting_room_id,
                    started_at=app.started_at,
                    ended_at=app.ended_at,
                    consultation_fee=fee,
                    version=app.version,
                    is_deleted=app.is_deleted,
                )
            )
        return out

    async def get_appointment(self, appointment_id: uuid.UUID, user: User) -> TeleconsultationAppointmentOut:
        """Get appointment with strict role-based access control."""
        app = await self.db.get(Appointment, appointment_id)
        if not app or app.is_deleted:
            raise NotFoundError("Appointment not found")

        patient = await self.db.get(Patient, app.patient_id)
        if not patient or patient.is_deleted:
            raise NotFoundError("Patient record not found")

        self._assert_appointment_access(user, app, patient)

        doctor_user = await UserRepository(self.db).get(app.doctor_id) if app.doctor_id else None
        facility = await FacilityRepository(self.db).get(app.facility_id) if app.facility_id else None
        slot = await self.db.get(DoctorAvailability, app.availability_id) if app.availability_id else None

        return await self._enrich_appointment(app, patient, doctor_user, facility, slot)

    async def get_room_info(self, appointment_id: uuid.UUID, user: User) -> TeleconsultationRoomInfoOut:
        """Get consultation room access token and state."""
        app = await self.db.get(Appointment, appointment_id)
        if not app or app.is_deleted:
            raise NotFoundError("Appointment not found")

        patient = await self.db.get(Patient, app.patient_id)
        if not patient or patient.is_deleted:
            raise NotFoundError("Patient record not found")

        self._assert_appointment_access(user, app, patient)

        doctor_user = await UserRepository(self.db).get(app.doctor_id) if app.doctor_id else None
        facility = await FacilityRepository(self.db).get(app.facility_id) if app.facility_id else None
        profile = (
            await self.db.execute(
                select(DoctorProfile).where(DoctorProfile.user_id == app.doctor_id, DoctorProfile.is_deleted.is_(False))
            )
        ).scalar_one_or_none() if app.doctor_id else None

        # Determine consultation room state
        now = datetime.utcnow()
        scheduled_time = app.scheduled_at

        is_patient = user.role == Role.PATIENT and patient.user_id == user.id
        is_doctor = user.role == Role.DOCTOR and (app.doctor_id == user.id or app.facility_id == user.facility_id)

        if app.status == AppointmentStatus.CANCELLED:
            state = "CANCELLED"
            state_message = "This consultation was cancelled."
            can_join = False
        elif app.status == AppointmentStatus.COMPLETED:
            state = "COMPLETED"
            state_message = "Consultation completed."
            can_join = False
        elif app.started_at is not None or app.status == AppointmentStatus.IN_PROGRESS:
            state = "ACTIVE"
            state_message = "Consultation is currently active."
            can_join = True
        else:
            time_until_start = (scheduled_time - now).total_seconds()
            if time_until_start > 15 * 60:
                state = "BEFORE_APPOINTMENT"
                state_message = "Consultation hasn't started yet."
                # Doctor can enter slightly early to set up
                can_join = is_doctor
            elif time_until_start >= -120 * 60:  # From 15m before to 2h after
                state = "NEAR_APPOINTMENT"
                state_message = "Your consultation will begin soon."
                can_join = True
            else:
                state = "EXPIRED"
                state_message = "Scheduled consultation window has passed."
                can_join = False

        room_id = app.meeting_room_id or f"room-{app.id.hex[:12]}"

        return TeleconsultationRoomInfoOut(
            appointment_id=app.id,
            room_id=room_id,
            state=state,
            state_message=state_message,
            can_join=can_join,
            scheduled_at=app.scheduled_at,
            started_at=app.started_at,
            ended_at=app.ended_at,
            patient_id=patient.id,
            patient_name=patient.full_name,
            patient_care_pathway=patient.care_pathway,
            doctor_id=app.doctor_id,
            doctor_name=doctor_user.full_name if doctor_user else "Assigned Doctor",
            doctor_speciality=profile.speciality if profile else "General Medicine",
            facility_name=facility.name if facility else "Teleconsultation Facility",
            ice_servers=DEFAULT_STUN_SERVERS,
            is_patient=is_patient,
            is_doctor=is_doctor,
        )

    async def start_consultation(self, appointment_id: uuid.UUID, doctor_user: User) -> TeleconsultationAppointmentOut:
        """Doctor starts the active consultation."""
        if doctor_user.role != Role.DOCTOR:
            raise ForbiddenError("Only doctors can start a consultation")

        app = await self.db.get(Appointment, appointment_id)
        if not app or app.is_deleted:
            raise NotFoundError("Appointment not found")

        if app.doctor_id != doctor_user.id and app.facility_id != doctor_user.facility_id:
            raise ForbiddenError("You are not assigned to this consultation")

        if app.status == AppointmentStatus.CANCELLED:
            raise ConflictError("Cannot start a cancelled consultation")
        if app.status == AppointmentStatus.COMPLETED:
            raise ConflictError("Consultation has already been completed")

        now = datetime.utcnow()
        app.started_at = app.started_at or now
        app.status = AppointmentStatus.IN_PROGRESS
        app.version += 1

        # Create or link encounter
        if not app.encounter_id:
            enc_repo = EncounterRepository(self.db)
            encounter = await enc_repo.create(
                patient_id=app.patient_id,
                facility_id=app.facility_id or doctor_user.facility_id,
                author_id=doctor_user.id,
                appointment_id=app.id,
                encounter_type="TELECONSULTATION",
                encounter_date=now,
                notes="Teleconsultation in progress",
            )
            app.encounter_id = encounter.id

        # Update or create linked ConsultationSession
        session_stmt = select(ConsultationSession).where(
            ConsultationSession.appointment_id == appointment_id,
            ConsultationSession.is_deleted.is_(False),
        )
        session = (await self.db.execute(session_stmt)).scalar_one_or_none()
        if session:
            session.status = AppointmentStatus.IN_PROGRESS
            session.started_at = session.started_at or now
            session.version += 1

        patient = await self.db.get(Patient, app.patient_id)
        if patient:
            try:
                notif_service = NotificationService(self.db)
                await notif_service.notify(
                    patient=patient,
                    title="Consultation Started",
                    body=f"Dr. {doctor_user.full_name} has started your teleconsultation. Please join the room.",
                    channel=NotificationChannel.IN_APP,
                )
            except Exception:
                pass

        await self.db.commit()
        await self.db.refresh(app)
        return await self.get_appointment(app.id, doctor_user)

    async def save_notes(
        self,
        appointment_id: uuid.UUID,
        doctor_user: User,
        data: TeleconsultationNotesRequest,
    ) -> Encounter:
        """Save clinical consultation notes into the encounter."""
        if doctor_user.role != Role.DOCTOR:
            raise ForbiddenError("Only doctors can record consultation notes")

        app = await self.db.get(Appointment, appointment_id)
        if not app or app.is_deleted:
            raise NotFoundError("Appointment not found")

        if app.doctor_id != doctor_user.id and app.facility_id != doctor_user.facility_id:
            raise ForbiddenError("You are not assigned to this consultation")

        enc_repo = EncounterRepository(self.db)
        if app.encounter_id:
            encounter = await enc_repo.get(app.encounter_id)
        else:
            encounter = None

        if not encounter:
            encounter = await enc_repo.create(
                patient_id=app.patient_id,
                facility_id=app.facility_id or doctor_user.facility_id,
                author_id=doctor_user.id,
                appointment_id=app.id,
                encounter_type="TELECONSULTATION",
                encounter_date=datetime.utcnow(),
                notes=data.notes or data.assessment or "Teleconsultation notes",
                chief_complaint=data.chief_complaint,
                clinical_observations=data.clinical_observations,
                assessment=data.assessment,
                advice=data.advice,
                treatment_plan=data.treatment_plan,
                follow_up_recommendation=data.follow_up_recommendation,
            )
            app.encounter_id = encounter.id
            app.version += 1
        else:
            if data.notes is not None:
                encounter.notes = data.notes
            if data.chief_complaint is not None:
                encounter.chief_complaint = data.chief_complaint
            if data.clinical_observations is not None:
                encounter.clinical_observations = data.clinical_observations
            if data.assessment is not None:
                encounter.assessment = data.assessment
            if data.advice is not None:
                encounter.advice = data.advice
            if data.treatment_plan is not None:
                encounter.treatment_plan = data.treatment_plan
            if data.follow_up_recommendation is not None:
                encounter.follow_up_recommendation = data.follow_up_recommendation
            encounter.version += 1

        await self.db.commit()
        await self.db.refresh(encounter)
        return encounter

    async def complete_consultation(
        self,
        appointment_id: uuid.UUID,
        doctor_user: User,
        data: TeleconsultationCompleteRequest,
    ) -> TeleconsultationAppointmentOut:
        """Complete the teleconsultation, persist clinical notes, prescriptions, diagnostics, and referrals."""
        if doctor_user.role != Role.DOCTOR:
            raise ForbiddenError("Only doctors can complete consultations")

        app = await self.db.get(Appointment, appointment_id)
        if not app or app.is_deleted:
            raise NotFoundError("Appointment not found")

        if app.doctor_id != doctor_user.id and app.facility_id != doctor_user.facility_id:
            raise ForbiddenError("You are not assigned to this consultation")

        now = datetime.utcnow()
        app.ended_at = now
        app.status = AppointmentStatus.COMPLETED
        app.version += 1

        # 1. Save notes
        if data.notes:
            await self.save_notes(appointment_id, doctor_user, data.notes)

        encounter_id = app.encounter_id

        # 2. Add Prescriptions
        if data.prescriptions:
            rx_repo = PrescriptionRepository(self.db)
            for rx in data.prescriptions:
                await rx_repo.create(
                    patient_id=app.patient_id,
                    facility_id=app.facility_id or doctor_user.facility_id,
                    encounter_id=encounter_id,
                    inventory_item_id=rx.inventory_item_id,
                    prescribed_by_id=doctor_user.id,
                    quantity=rx.quantity,
                    dosage_instructions=rx.dosage_instructions,
                    status=PrescriptionStatus.ACTIVE,
                )

        # 3. Add Diagnostic Orders
        if data.diagnostic_orders:
            diag_repo = DiagnosticOrderRepository(self.db)
            for diag in data.diagnostic_orders:
                await diag_repo.create(
                    patient_id=app.patient_id,
                    facility_id=app.facility_id or doctor_user.facility_id,
                    encounter_id=encounter_id,
                    ordered_by_id=doctor_user.id,
                    test_type=diag.test_type,
                    status=DiagnosticOrderStatus.ORDERED,
                )

        # 4. Add Referral
        if data.referral:
            ref_repo = ReferralRepository(self.db)
            await ref_repo.create(
                patient_id=app.patient_id,
                from_facility_id=app.facility_id or doctor_user.facility_id,
                to_facility_id=data.referral.to_facility_id,
                reason=data.referral.reason,
                urgency=data.referral.urgency,
                specialty_needed=data.referral.specialty_needed,
                status=ReferralStatus.PENDING,
                created_by_id=doctor_user.id,
            )

        # Update ConsultationSession
        session_stmt = select(ConsultationSession).where(
            ConsultationSession.appointment_id == appointment_id,
            ConsultationSession.is_deleted.is_(False),
        )
        session = (await self.db.execute(session_stmt)).scalar_one_or_none()
        if session:
            session.status = AppointmentStatus.COMPLETED
            session.ended_at = now
            session.version += 1

        # 5. Notify patient
        patient = await self.db.get(Patient, app.patient_id)
        if patient:
            try:
                notif_service = NotificationService(self.db)
                await notif_service.notify(
                    patient=patient,
                    title="Consultation Completed",
                    body=f"Your consultation with Dr. {doctor_user.full_name} is complete. You can view your consultation summary, prescriptions, and follow-up plan in your health records.",
                    channel=NotificationChannel.IN_APP,
                )
            except Exception:
                pass

        await self.db.commit()
        await self.db.refresh(app)
        return await self.get_appointment(app.id, doctor_user)

    async def cancel_appointment(
        self,
        appointment_id: uuid.UUID,
        user: User,
        reason: str | None = None,
    ) -> TeleconsultationAppointmentOut:
        """Cancel a consultation and release the booked slot back to the schedule."""
        app = await self.db.get(Appointment, appointment_id)
        if not app or app.is_deleted:
            raise NotFoundError("Appointment not found")

        patient = await self.db.get(Patient, app.patient_id)
        if not patient or patient.is_deleted:
            raise NotFoundError("Patient record not found")

        self._assert_appointment_access(user, app, patient)

        if app.status == AppointmentStatus.COMPLETED:
            raise ConflictError("Completed consultation cannot be cancelled")
        if app.status == AppointmentStatus.CANCELLED:
            raise ConflictError("Appointment is already cancelled")

        app.status = AppointmentStatus.CANCELLED
        if reason:
            app.reason = f"{app.reason or ''} (Cancelled: {reason})".strip()
        app.version += 1

        # Release the booked slot back so another patient can book it
        if app.availability_id:
            slot = await self.db.get(DoctorAvailability, app.availability_id)
            if slot and not slot.is_deleted:
                slot.is_booked = False
                slot.version += 1

        # Update ConsultationSession
        session_stmt = select(ConsultationSession).where(
            ConsultationSession.appointment_id == appointment_id,
            ConsultationSession.is_deleted.is_(False),
        )
        session = (await self.db.execute(session_stmt)).scalar_one_or_none()
        if session:
            session.status = AppointmentStatus.CANCELLED
            session.version += 1

        # Notify other party
        try:
            notif_service = NotificationService(self.db)
            if user.role == Role.PATIENT:
                # Patient cancelled -> inform patient confirmation
                await notif_service.notify(
                    patient=patient,
                    title="Appointment Cancelled",
                    body=f"Your teleconsultation appointment scheduled for {app.scheduled_at.strftime('%d %b %Y at %I:%M %p')} was cancelled.",
                    channel=NotificationChannel.IN_APP,
                )
            elif user.role == Role.DOCTOR:
                # Doctor cancelled -> notify patient
                await notif_service.notify(
                    patient=patient,
                    title="Appointment Cancelled by Doctor",
                    body=f"Your teleconsultation scheduled for {app.scheduled_at.strftime('%d %b %Y at %I:%M %p')} was cancelled by the doctor. Please select another slot.",
                    channel=NotificationChannel.IN_APP,
                )
        except Exception:
            pass

        await self.db.commit()
        await self.db.refresh(app)
        return await self.get_appointment(app.id, user)

    # ---------------------------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------------------------

    def _assert_appointment_access(self, user: User, app: Appointment, patient: Patient) -> None:
        """Verify that user has permission to access this appointment."""
        if user.role == Role.ADMIN:
            return
        if user.role == Role.PATIENT:
            if patient.user_id != user.id:
                raise ForbiddenError("You may only access your own teleconsultations")
            return
        if user.role == Role.DOCTOR:
            if app.doctor_id == user.id or (user.facility_id and app.facility_id == user.facility_id):
                return
            raise ForbiddenError("You do not have permission to access this consultation")
        if user.facility_id and app.facility_id == user.facility_id:
            return
        raise ForbiddenError("Not authorized to view this consultation")

    async def _doctor_profiles_map(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, DoctorProfile]:
        if not user_ids:
            return {}
        result = await self.db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id.in_(user_ids), DoctorProfile.is_deleted.is_(False))
        )
        return {p.user_id: p for p in result.scalars().all()}

    async def _enrich_appointment(
        self,
        app: Appointment,
        patient: Patient,
        doctor: User | None,
        facility: Facility | None,
        slot: DoctorAvailability | None,
    ) -> TeleconsultationAppointmentOut:
        profile = (
            await self.db.execute(
                select(DoctorProfile).where(DoctorProfile.user_id == doctor.id, DoctorProfile.is_deleted.is_(False))
            )
        ).scalar_one_or_none() if doctor else None

        fee = float(slot.consultation_fee) if slot and slot.consultation_fee else None

        return TeleconsultationAppointmentOut(
            id=app.id,
            patient_id=app.patient_id,
            patient_name=patient.full_name,
            patient_phone=patient.phone,
            patient_care_pathway=patient.care_pathway,
            doctor_id=app.doctor_id,
            doctor_name=doctor.full_name if doctor else None,
            doctor_speciality=profile.speciality if profile else "General Medicine",
            facility_id=app.facility_id,
            facility_name=facility.name if facility else None,
            availability_id=app.availability_id,
            referral_id=app.referral_id,
            encounter_id=app.encounter_id,
            scheduled_at=app.scheduled_at,
            status=app.status,
            reason=app.reason,
            consultation_type=app.consultation_type or "Teleconsultation",
            meeting_room_id=app.meeting_room_id,
            started_at=app.started_at,
            ended_at=app.ended_at,
            consultation_fee=fee,
            version=app.version,
            is_deleted=app.is_deleted,
        )
