"""Seed script for local/dev Postgres.

Run with:  python -m seed.seed_data
Idempotent: re-running skips rows that already exist (matched by email / name).
"""

import asyncio
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.care import Appointment, DiagnosticOrder, DiagnosticReport, Prescription
from app.models.care_gap import CareGap
from app.models.enums import (
    AppointmentStatus,
    CareGapStatus,
    DiagnosticOrderStatus,
    HealthWorkerCadre,
    PregnancyStatus,
    ReferralStatus,
    RiskLevel,
    Role,
)
from app.models.facility import Facility
from app.models.inventory import InventoryItem
from app.models.maternal import Encounter, Pregnancy, Screening, Symptom, Vital
from app.models.patient import Patient
from app.models.referral import Referral
from app.models.staff import DoctorAvailability, HealthWorkerProfile
from app.models.user import User


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Facility).where(Facility.name == "Rampur PHC"))
        phc = result.scalar_one_or_none()
        if phc is None:
            phc = Facility(
                name="Rampur PHC",
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

        result = await db.execute(
            select(Facility).where(Facility.name == "District Hospital Lucknow")
        )
        hospital = result.scalar_one_or_none()
        if hospital is None:
            hospital = Facility(
                name="District Hospital Lucknow",
                facility_type="HOSPITAL",
                district="Lucknow",
                state="Uttar Pradesh",
                latitude=26.85,
                longitude=80.95,
                capabilities="cardiology,pulmonology,general surgery,orthopedics",
            )
            db.add(hospital)
            await db.flush()

        result = await db.execute(select(User).where(User.email == "worker@swasthyasetu.dev"))
        worker = result.scalar_one_or_none()
        if worker is None:
            worker = User(
                email="worker@swasthyasetu.dev",
                hashed_password=hash_password("ChangeMe123!"),
                full_name="Asha Health Worker",
                role=Role.HEALTH_WORKER,
                facility_id=phc.id,
            )
            db.add(worker)
            await db.flush()

        result = await db.execute(select(User).where(User.email == "doctor@swasthyasetu.dev"))
        doctor = result.scalar_one_or_none()
        if doctor is None:
            doctor = User(
                email="doctor@swasthyasetu.dev",
                hashed_password=hash_password("ChangeMe123!"),
                full_name="Dr. Priya Sharma",
                role=Role.DOCTOR,
                facility_id=hospital.id,
            )
            db.add(doctor)
            await db.flush()

        result = await db.execute(select(User).where(User.email == "admin@swasthyasetu.dev"))
        admin = result.scalar_one_or_none()
        if admin is None:
            admin = User(
                email="admin@swasthyasetu.dev",
                hashed_password=hash_password("ChangeMe123!"),
                full_name="Platform Admin",
                role=Role.ADMIN,
            )
            db.add(admin)
            await db.flush()

        result = await db.execute(
            select(User).where(User.email == "patient@swasthyasetu.dev")
        )
        patient_user = result.scalar_one_or_none()
        if patient_user is None:
            patient_user = User(
                email="patient@swasthyasetu.dev",
                hashed_password=hash_password("Patient@123"),
                full_name="Ram Kumar",
                role=Role.PATIENT,
                facility_id=phc.id,
            )
            db.add(patient_user)
            await db.flush()

        result = await db.execute(select(Patient).where(Patient.full_name == "Ram Kumar"))
        patient = result.scalar_one_or_none()
        if patient is None:
            patient = Patient(
                full_name="Ram Kumar",
                gender="M",
                village="Rampur",
                phone="9876500000",
                facility_id=phc.id,
                registered_by_id=worker.id,
                user_id=patient_user.id,
            )
            db.add(patient)
            await db.flush()
        elif patient.user_id is None:
            patient.user_id = patient_user.id
            await db.flush()

            db.add(
                Referral(
                    patient_id=patient.id,
                    from_facility_id=phc.id,
                    to_facility_id=hospital.id,
                    reason="Suspected cardiac condition",
                    specialty_needed="cardiology",
                    status=ReferralStatus.PENDING,
                    created_by_id=worker.id,
                )
            )
            db.add(
                CareGap(
                    patient_id=patient.id,
                    gap_type="overdue_bp_check",
                    description="Blood pressure recheck overdue by 3 months",
                    status=CareGapStatus.OPEN,
                )
            )

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

        # --- Health worker profile for the seeded worker -----------------------
        result = await db.execute(
            select(HealthWorkerProfile).where(HealthWorkerProfile.user_id == worker.id)
        )
        if result.scalar_one_or_none() is None:
            db.add(
                HealthWorkerProfile(
                    user_id=worker.id,
                    facility_id=phc.id,
                    cadre=HealthWorkerCadre.ASHA,
                    area="Rampur village cluster",
                )
            )

        # --- One doctor availability slot for the seeded doctor -----------------
        result = await db.execute(
            select(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor.id)
        )
        availability = result.scalar_one_or_none()
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

        # --- High-risk pregnancy + encounter + symptoms/vitals/screening/referral,
        # appointment, diagnostic order+report, and a prescription -----------------
        result = await db.execute(select(Pregnancy).where(Pregnancy.patient_id == patient.id))
        if result.scalar_one_or_none() is None:
            pregnancy = Pregnancy(
                patient_id=patient.id,
                expected_delivery_date=(datetime.utcnow() + timedelta(days=120)).date(),
                gravida=2,
                para=1,
                risk_level=RiskLevel.HIGH,
                risk_flags="hypertension,anemia",
                status=PregnancyStatus.ACTIVE,
                notes="High-risk pregnancy, needs specialist follow-up.",
            )
            db.add(pregnancy)
            await db.flush()

            encounter = Encounter(
                patient_id=patient.id,
                facility_id=phc.id,
                author_id=worker.id,
                encounter_type="ANTENATAL",
                notes="Routine antenatal visit; flagged elevated BP.",
            )
            db.add(encounter)
            await db.flush()

            db.add(
                Symptom(
                    encounter_id=encounter.id,
                    description="Persistent headache and swelling in feet",
                    severity="MODERATE",
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
                reason="Suspected pre-eclampsia in high-risk pregnancy",
                specialty_needed="obstetrics",
                status=ReferralStatus.PENDING,
                created_by_id=worker.id,
                screening_id=screening.id,
            )
            db.add(referral)
            await db.flush()

            db.add(
                Appointment(
                    patient_id=patient.id,
                    facility_id=hospital.id,
                    referral_id=referral.id,
                    availability_id=availability.id,
                    scheduled_at=availability.start_time,
                    status=AppointmentStatus.SCHEDULED,
                    reason="Obstetrics consult for pre-eclampsia risk",
                )
            )

            order = DiagnosticOrder(
                patient_id=patient.id,
                facility_id=phc.id,
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
                    facility_id=phc.id,
                    encounter_id=encounter.id,
                    inventory_item_id=ifa.id,
                    prescribed_by_id=worker.id,
                    quantity=30,
                    dosage_instructions="1 tablet daily with food",
                )
            )
            ifa.quantity -= 30

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
