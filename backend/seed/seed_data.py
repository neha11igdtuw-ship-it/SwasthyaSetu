"""Seed script for local/dev Postgres.

Run with:  python -m seed.seed_data
Idempotent: re-running updates demo identities and skips rows that already exist.
"""

import asyncio
import secrets
from datetime import datetime, time, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.care import Appointment, DiagnosticOrder, DiagnosticReport, Prescription
from app.models.care_gap import CareGap
from app.models.enums import (
    AppointmentMode,
    AppointmentStatus,
    CareGapStatus,
    DiagnosticOrderStatus,
    HealthWorkerCadre,
    NotificationChannel,
    NotificationStatus,
    PregnancyStatus,
    ReferralOutcome,
    ReferralStatus,
    RiskLevel,
    Role,
    TeleconsultFallback,
)
from app.models.facility import Facility
from app.models.inventory import InventoryItem
from app.models.maternal import Encounter, Pregnancy, Screening, Symptom, Vital
from app.models.patient import Patient
from app.models.queue import Notification, QueueDesk
from app.models.referral import Referral
from app.models.staff import DoctorAvailability, HealthWorkerProfile
from app.models.user import User
from app.services.notifications import (
    REFERRAL_OUTCOME_NOTIFICATION_TITLE,
    NotificationService,
)

PHC_NAMES = ("Sub-Centre Rampur", "Rampur PHC")
# Demo-only ANM contact. It is attached to ANM Sunita Devi and to the demo
# patient Priya Sharma ONLY — it is never a global/default emergency number,
# and the app never falls back to it for any other patient.
DEMO_ANM_PHONE = "9876500111"

HOSPITAL_NAMES = (
    "District Civil Hospital & Maternal Care Centre",
    "District Hospital Lucknow",
)


async def _get_facility(db, names: tuple[str, ...]) -> Facility | None:
    result = await db.execute(select(Facility).where(Facility.name.in_(names)))
    return result.scalar_one_or_none()


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        phc = await _get_facility(db, PHC_NAMES)
        if phc is None:
            phc = Facility(
                name="Sub-Centre Rampur",
                facility_type="PHC",
                village="Rampur",
                district="Barabanki",
                state="Uttar Pradesh",
                latitude=26.99,
                longitude=81.24,
                capabilities="general medicine,antenatal care",
            )
            db.add(phc)
            await db.flush()
        else:
            phc.name = "Sub-Centre Rampur"
            phc.village = "Rampur"

        hospital = await _get_facility(db, HOSPITAL_NAMES)
        if hospital is None:
            hospital = Facility(
                name="District Civil Hospital & Maternal Care Centre",
                facility_type="HOSPITAL",
                district="Lucknow",
                state="Uttar Pradesh",
                latitude=26.85,
                longitude=80.95,
                capabilities="obstetrics,maternal ICU,cardiology,general surgery",
            )
            db.add(hospital)
            await db.flush()
        else:
            hospital.name = "District Civil Hospital & Maternal Care Centre"
            hospital.capabilities = "obstetrics,maternal ICU,cardiology,general surgery"

        result = await db.execute(select(User).where(User.email == "worker@swasthyasetu.dev"))
        worker = result.scalar_one_or_none()
        if worker is None:
            worker = User(
                email="worker@swasthyasetu.dev",
                hashed_password=hash_password("ChangeMe123!"),
                full_name="ANM Sunita Devi",
                role=Role.HEALTH_WORKER,
                phone=DEMO_ANM_PHONE,
                facility_id=phc.id,
                is_verified=True,
            )
            db.add(worker)
            await db.flush()
        else:
            worker.full_name = "ANM Sunita Devi"
            worker.phone = DEMO_ANM_PHONE
            worker.facility_id = phc.id
            worker.is_verified = True

        result = await db.execute(select(User).where(User.email == "doctor@swasthyasetu.dev"))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            doctor = User(
                email="doctor@swasthyasetu.dev",
                hashed_password=hash_password("ChangeMe123!"),
                full_name="Dr. Meera Singh",
                role=Role.DOCTOR,
                facility_id=hospital.id,
                is_verified=True,
            )
            db.add(doctor)
            await db.flush()
        else:
            doctor.full_name = "Dr. Meera Singh"
            doctor.facility_id = hospital.id
            doctor.is_verified = True

        result = await db.execute(select(User).where(User.email == "admin@swasthyasetu.dev"))
        admin = result.scalar_one_or_none()
        if admin is None:
            admin = User(
                email="admin@swasthyasetu.dev",
                hashed_password=hash_password("ChangeMe123!"),
                full_name="District Civil Hospital Admin",
                role=Role.ADMIN,
                facility_id=hospital.id,
                is_verified=True,
            )
            db.add(admin)
            await db.flush()
        else:
            admin.full_name = "District Civil Hospital Admin"
            admin.facility_id = hospital.id
            admin.is_verified = True

        result = await db.execute(select(User).where(User.email == "patient@swasthyasetu.dev"))
        patient_user = result.scalar_one_or_none()
        if patient_user is None:
            patient_user = User(
                email="patient@swasthyasetu.dev",
                hashed_password=hash_password("Patient@123"),
                full_name="Priya Sharma",
                role=Role.PATIENT,
                facility_id=phc.id,
                is_verified=True,
            )
            db.add(patient_user)
            await db.flush()
        else:
            patient_user.full_name = "Priya Sharma"
            patient_user.facility_id = phc.id
            patient_user.is_verified = True

        result = await db.execute(select(Patient).where(Patient.user_id == patient_user.id))
        patient = result.scalar_one_or_none()
        if patient is None:
            result = await db.execute(
                select(Patient).where(Patient.full_name.in_(("Priya Sharma", "Ram Kumar")))
            )
            patient = result.scalar_one_or_none()

        dob = datetime.utcnow().date().replace(year=datetime.utcnow().year - 26)
        if patient is None:
            patient = Patient(
                full_name="Priya Sharma",
                gender="F",
                village="Rampur Village",
                phone="9876500000",
                date_of_birth=dob,
                care_pathway="Maternal Care",
                pregnancy_week=28,
                preferred_language="Hindi",
                emergency_contact=DEMO_ANM_PHONE,
                facility_id=phc.id,
                registered_by_id=worker.id,
                user_id=patient_user.id,
            )
            db.add(patient)
            await db.flush()
        else:
            patient.full_name = "Priya Sharma"
            patient.gender = "F"
            patient.village = "Rampur Village"
            patient.date_of_birth = patient.date_of_birth or dob
            patient.care_pathway = "Maternal Care"
            patient.pregnancy_week = 28
            patient.preferred_language = patient.preferred_language or "Hindi"
            patient.facility_id = phc.id
            patient.user_id = patient_user.id
            patient.registered_by_id = patient.registered_by_id or worker.id
            patient.emergency_contact = DEMO_ANM_PHONE
            await db.flush()

        result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.facility_id == phc.id, InventoryItem.name == "Paracetamol 500mg"
            )
        )
        if result.scalar_one_or_none() is None:
            db.add(
                InventoryItem(
                    facility_id=phc.id,
                    name="Paracetamol 500mg",
                    sku="MED-PARA-500",
                    unit="strip",
                    quantity=40,
                    reorder_level=15,
                )
            )

        result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.facility_id == phc.id, InventoryItem.name == "Iron Folic Acid"
            )
        )
        ifa = result.scalar_one_or_none()
        if ifa is None:
            ifa = InventoryItem(
                facility_id=phc.id,
                name="Iron Folic Acid",
                sku="MED-IFA-100",
                unit="tablet",
                quantity=200,
                reorder_level=50,
            )
            db.add(ifa)
            await db.flush()

        result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.facility_id == hospital.id, InventoryItem.name == "Iron Folic Acid"
            )
        )
        hospital_ifa = result.scalar_one_or_none()
        if hospital_ifa is None:
            hospital_ifa = InventoryItem(
                facility_id=hospital.id,
                name="Iron Folic Acid",
                sku="MED-IFA-HOSP",
                unit="tablet",
                quantity=120,
                reorder_level=40,
            )
            db.add(hospital_ifa)
            await db.flush()

        result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.facility_id == hospital.id, InventoryItem.name == "Methyldopa 250mg"
            )
        )
        if result.scalar_one_or_none() is None:
            db.add(
                InventoryItem(
                    facility_id=hospital.id,
                    name="Methyldopa 250mg",
                    sku="MED-METH-250",
                    unit="tablet",
                    quantity=80,
                    reorder_level=20,
                )
            )

        result = await db.execute(
            select(HealthWorkerProfile).where(HealthWorkerProfile.user_id == worker.id)
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            db.add(
                HealthWorkerProfile(
                    user_id=worker.id,
                    facility_id=phc.id,
                    cadre=HealthWorkerCadre.ANM,
                    area="Rampur Village",
                )
            )
        else:
            profile.cadre = HealthWorkerCadre.ANM
            profile.area = "Rampur Village"

        result = await db.execute(
            select(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor.id)
        )
        availability = result.scalars().first()
        if availability is None:
            start = datetime.utcnow().replace(
                hour=10, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)
            availability = DoctorAvailability(
                doctor_id=doctor.id,
                facility_id=hospital.id,
                start_time=start,
                end_time=start + timedelta(minutes=30),
            )
            db.add(availability)
            await db.flush()

        result = await db.execute(select(Pregnancy).where(Pregnancy.patient_id == patient.id))
        if result.scalar_one_or_none() is None:
            pregnancy = Pregnancy(
                patient_id=patient.id,
                expected_delivery_date=(datetime.utcnow() + timedelta(days=84)).date(),
                gravida=2,
                para=1,
                risk_level=RiskLevel.HIGH,
                risk_flags="hypertension,anemia",
                status=PregnancyStatus.ACTIVE,
                notes="High-risk pregnancy week 28; needs specialist follow-up.",
            )
            db.add(pregnancy)
            await db.flush()

            encounter = Encounter(
                patient_id=patient.id,
                facility_id=phc.id,
                author_id=worker.id,
                encounter_type="ANTENATAL",
                notes="ANC visit; flagged elevated BP and headache.",
            )
            db.add(encounter)
            await db.flush()

            db.add(
                Symptom(
                    encounter_id=encounter.id,
                    description="Persistent headache and swelling in feet",
                    severity="MEDIUM",
                )
            )
            db.add(
                Vital(
                    encounter_id=encounter.id,
                    systolic_bp=152,
                    diastolic_bp=98,
                    pulse=88,
                    temperature_c=37.0,
                    weight_kg=68.5,
                    spo2=97,
                )
            )
            screening = Screening(
                encounter_id=encounter.id,
                screening_type="pre-eclampsia risk",
                result="High blood pressure detected, protein in urine",
                risk_level=RiskLevel.HIGH,
                notes="Recommend urgent obstetrics referral.",
            )
            db.add(screening)
            await db.flush()

            referral = Referral(
                patient_id=patient.id,
                from_facility_id=phc.id,
                to_facility_id=hospital.id,
                reason="Suspected pre-eclampsia in high-risk pregnancy, week 28",
                specialty_needed="obstetrics",
                urgency="URGENT",
                status=ReferralStatus.PENDING,
                created_by_id=worker.id,
                screening_id=screening.id,
            )
            db.add(referral)
            await db.flush()

            db.add(
                CareGap(
                    patient_id=patient.id,
                    gap_type="overdue_bp_check",
                    description="Blood pressure recheck due this week",
                    status=CareGapStatus.OPEN,
                )
            )

            db.add(
                Appointment(
                    patient_id=patient.id,
                    facility_id=hospital.id,
                    referral_id=referral.id,
                    availability_id=availability.id,
                    scheduled_at=availability.start_time,
                    status=AppointmentStatus.SCHEDULED,
                    reason="Obstetrics consult with Dr. Meera Singh",
                )
            )

            order = DiagnosticOrder(
                patient_id=patient.id,
                facility_id=hospital.id,
                encounter_id=encounter.id,
                screening_id=screening.id,
                referral_id=referral.id,
                test_type="Urine protein + BP panel",
                status=DiagnosticOrderStatus.COMPLETED,
                ordered_by_id=worker.id,
            )
            db.add(order)
            await db.flush()

            db.add(
                DiagnosticReport(
                    diagnostic_order_id=order.id,
                    result_summary="Proteinuria 2+, BP 152/98 — consistent with pre-eclampsia risk",
                    result_data='{"urine_protein": "2+", "bp": "152/98"}',
                    reported_by_id=worker.id,
                )
            )

            db.add(
                Prescription(
                    patient_id=patient.id,
                    facility_id=hospital.id,
                    encounter_id=encounter.id,
                    inventory_item_id=hospital_ifa.id,
                    prescribed_by_id=doctor.id,
                    quantity=30,
                    dosage_instructions="1 tablet daily with food",
                )
            )
            hospital_ifa.quantity -= 30
        else:
            result = await db.execute(select(Pregnancy).where(Pregnancy.patient_id == patient.id))
            pregnancy = result.scalar_one_or_none()
            if pregnancy is not None:
                pregnancy.risk_level = RiskLevel.HIGH
                pregnancy.notes = "High-risk pregnancy week 28; needs specialist follow-up."

        # Keep one demo care request for Priya (pre-eclampsia → district hospital).
        # Force an open, queue-eligible status so the health worker can join
        # Dr. Meera's hospital OPD. Production still hides desks when a
        # referral is COMPLETED/CANCELLED/REJECTED.
        result = await db.execute(select(Referral).where(Referral.patient_id == patient.id))
        existing_refs = list(result.scalars().all())
        preferred = next(
            (r for r in existing_refs if "pre-eclampsia" in (r.reason or "").lower()),
            existing_refs[0] if existing_refs else None,
        )
        if preferred is None:
            preferred = Referral(
                patient_id=patient.id,
                from_facility_id=phc.id,
                to_facility_id=hospital.id,
                reason="Suspected pre-eclampsia in high-risk pregnancy, week 28",
                specialty_needed="obstetrics",
                urgency="URGENT",
                status=ReferralStatus.PENDING,
                created_by_id=worker.id,
            )
            db.add(preferred)
            await db.flush()
            existing_refs = [preferred]
        preferred.reason = "Suspected pre-eclampsia in high-risk pregnancy, week 28"
        preferred.specialty_needed = "obstetrics"
        preferred.urgency = "URGENT"
        preferred.to_facility_id = hospital.id
        preferred.from_facility_id = phc.id
        preferred.is_deleted = False
        preferred.status = ReferralStatus.PENDING
        for extra in existing_refs:
            if extra.id != preferred.id:
                extra.is_deleted = True
                extra.status = ReferralStatus.CANCELLED

        # Referral outcome demo: Priya reported that the doctor was unavailable.
        # Unsuccessful outcome -> in-app follow-up alert for ANM Sunita Devi.
        outcome_notes = "Patient reached the facility but the assigned doctor was unavailable."
        preferred.outcome = ReferralOutcome.DOCTOR_UNAVAILABLE
        preferred.outcome_notes = outcome_notes
        preferred.outcome_reported_at = preferred.outcome_reported_at or datetime.utcnow()
        await db.flush()

        outcome_body = NotificationService.referral_outcome_body(
            patient_name=patient.full_name,
            outcome=ReferralOutcome.DOCTOR_UNAVAILABLE,
            notes=outcome_notes,
            from_facility=phc.name,
            to_facility=hospital.name,
        )
        result = await db.execute(
            select(Notification).where(
                Notification.referral_id == preferred.id,
                Notification.recipient_user_id == worker.id,
                Notification.title == REFERRAL_OUTCOME_NOTIFICATION_TITLE,
            )
        )
        outcome_note = result.scalars().first()
        if outcome_note is None:
            db.add(
                Notification(
                    patient_id=patient.id,
                    recipient_user_id=worker.id,
                    referral_id=preferred.id,
                    channel=NotificationChannel.IN_APP,
                    title=REFERRAL_OUTCOME_NOTIFICATION_TITLE,
                    body=outcome_body,
                    status=NotificationStatus.SENT,
                    sent_at=preferred.outcome_reported_at,
                )
            )
        else:
            outcome_note.body = outcome_body

        # Teleconsultation demo: one TELECONSULT appointment with the video
        # fallback selected (patients can switch to AUDIO_ONLY, PHONE_CALLBACK
        # or PHYSICAL_FACILITY_REFERRAL from the appointments page).
        tele_reason = "Teleconsultation follow-up with Dr. Meera Singh"
        result = await db.execute(
            select(Appointment).where(
                Appointment.patient_id == patient.id,
                Appointment.mode == AppointmentMode.TELECONSULT,
                Appointment.reason == tele_reason,
            )
        )
        tele = result.scalars().first()
        if tele is None:
            db.add(
                Appointment(
                    patient_id=patient.id,
                    facility_id=hospital.id,
                    doctor_id=doctor.id,
                    scheduled_at=datetime.utcnow().replace(
                        hour=11, minute=0, second=0, microsecond=0
                    )
                    + timedelta(days=2),
                    status=AppointmentStatus.SCHEDULED,
                    mode=AppointmentMode.TELECONSULT,
                    reason=tele_reason,
                    fallback_option=TeleconsultFallback.VIDEO_CONSULTATION,
                )
            )
        elif tele.fallback_option is None:
            tele.fallback_option = TeleconsultFallback.VIDEO_CONSULTATION

        # District-hospital OPD desk for Dr. Meera Singh. Health workers join
        # this desk on Priya's behalf via her open obstetrics referral.
        result = await db.execute(
            select(QueueDesk).where(
                QueueDesk.facility_id == hospital.id,
                QueueDesk.doctor_id == doctor.id,
                QueueDesk.display_name == "OPD New",
                QueueDesk.is_deleted.is_(False),
            )
        )
        opd_new = result.scalars().first()
        if opd_new is None:
            db.add(
                QueueDesk(
                    facility_id=hospital.id,
                    department="Obstetrics",
                    room_number="OPD-1",
                    doctor_id=doctor.id,
                    display_name="OPD New",
                    opd_start_time=time(9, 0),
                    opd_end_time=time(14, 0),
                    average_consultation_minutes=10,
                    is_active=True,
                    is_paused=False,
                    qr_code_key=secrets.token_urlsafe(16),
                )
            )
        else:
            opd_new.department = "Obstetrics"
            opd_new.room_number = "OPD-1"
            opd_new.opd_start_time = time(9, 0)
            opd_new.opd_end_time = time(14, 0)
            opd_new.average_consultation_minutes = 10
            opd_new.is_active = True
            opd_new.is_paused = False
            opd_new.pause_reason = None

        # Demo-only: keep OPD New as Dr. Meera's single live hospital desk so
        # leftover ad-hoc desks do not steal the doctor dashboard view.
        result = await db.execute(
            select(QueueDesk).where(
                QueueDesk.doctor_id == doctor.id,
                QueueDesk.facility_id == hospital.id,
                QueueDesk.is_deleted.is_(False),
            )
        )
        for desk in result.scalars().all():
            if desk.display_name != "OPD New":
                desk.is_active = False

        await db.commit()
        print(
            "Seed complete. Demo users: Priya Sharma, ANM Sunita Devi, Dr. Meera Singh. Desk: OPD New."
        )


if __name__ == "__main__":
    asyncio.run(seed())
