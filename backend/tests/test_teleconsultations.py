import asyncio
import uuid
from datetime import datetime, timedelta
import pytest
from sqlalchemy import select

from app.core.security import hash_password
from app.models.care import Appointment, ConsultationSession, DiagnosticOrder, Prescription
from app.models.enums import AppointmentStatus, DiagnosticOrderStatus, PrescriptionStatus, ReferralStatus, Role
from app.models.facility import Facility
from app.models.inventory import InventoryItem
from app.models.maternal import Encounter
from app.models.patient import Patient
from app.models.referral import Referral
from app.models.staff import DoctorAvailability, DoctorProfile
from app.models.user import User


@pytest.fixture
async def teleconsult_setup(db_session):
    # Facilities
    fac_a = Facility(name="District Hospital Kanpur", facility_type="District Hospital", is_active=True)
    fac_b = Facility(name="CHC Akbarpur", facility_type="Community Health Centre", is_active=True)
    db_session.add_all([fac_a, fac_b])
    await db_session.commit()

    # Doctors
    doc_a = User(
        email="dr.sharma@example.com",
        hashed_password=hash_password("DoctorPass123!"),
        full_name="Dr. Rajesh Sharma",
        role=Role.DOCTOR,
        facility_id=fac_a.id,
        is_active=True,
    )
    doc_b = User(
        email="dr.verma@example.com",
        hashed_password=hash_password("DoctorPass123!"),
        full_name="Dr. Anita Verma",
        role=Role.DOCTOR,
        facility_id=fac_b.id,
        is_active=True,
    )
    db_session.add_all([doc_a, doc_b])
    await db_session.commit()

    prof_a = DoctorProfile(
        user_id=doc_a.id,
        facility_id=fac_a.id,
        speciality="Cardiology",
        qualification="MD, DM (Cardiology)",
        experience_years=12,
        languages="Hindi, English",
        status="Active",
    )
    prof_b = DoctorProfile(
        user_id=doc_b.id,
        facility_id=fac_b.id,
        speciality="Pediatrics",
        qualification="MBBS, DCH",
        experience_years=8,
        languages="Hindi, Marathi",
        status="Active",
    )
    db_session.add_all([prof_a, prof_b])
    await db_session.commit()

    # Doctor Availability Slots
    now = datetime.utcnow()
    slot_a1 = DoctorAvailability(
        doctor_id=doc_a.id,
        facility_id=fac_a.id,
        start_time=now + timedelta(days=1, hours=2),
        end_time=now + timedelta(days=1, hours=2, minutes=30),
        consultation_type="Teleconsultation",
        consultation_fee=300.0,
        is_booked=False,
    )
    slot_a2 = DoctorAvailability(
        doctor_id=doc_a.id,
        facility_id=fac_a.id,
        start_time=now + timedelta(days=1, hours=3),
        end_time=now + timedelta(days=1, hours=3, minutes=30),
        consultation_type="Teleconsultation",
        consultation_fee=300.0,
        is_booked=False,
    )
    slot_b1 = DoctorAvailability(
        doctor_id=doc_b.id,
        facility_id=fac_b.id,
        start_time=now + timedelta(days=1, hours=4),
        end_time=now + timedelta(days=1, hours=4, minutes=30),
        consultation_type="Teleconsultation",
        consultation_fee=250.0,
        is_booked=False,
    )
    db_session.add_all([slot_a1, slot_a2, slot_b1])
    await db_session.commit()

    # Patients
    patient_user_a = User(
        email="patient.a@example.com",
        hashed_password=hash_password("PatientPass123!"),
        full_name="Ramesh Kumar",
        phone="9876543201",
        role=Role.PATIENT,
        is_active=True,
    )
    patient_user_b = User(
        email="patient.b@example.com",
        hashed_password=hash_password("PatientPass123!"),
        full_name="Meena Kumari",
        phone="9876543202",
        role=Role.PATIENT,
        is_active=True,
    )
    db_session.add_all([patient_user_a, patient_user_b])
    await db_session.commit()

    patient_a = Patient(
        user_id=patient_user_a.id,
        full_name="Ramesh Kumar",
        phone="9876543201",
        care_pathway="GENERAL_PRIMARY_CARE",
    )
    patient_b = Patient(
        user_id=patient_user_b.id,
        full_name="Meena Kumari",
        phone="9876543202",
        care_pathway="CHRONIC_CARE",
    )
    db_session.add_all([patient_a, patient_b])
    await db_session.commit()

    return {
        "fac_a": fac_a,
        "fac_b": fac_b,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "prof_a": prof_a,
        "prof_b": prof_b,
        "slot_a1": slot_a1,
        "slot_a2": slot_a2,
        "slot_b1": slot_b1,
        "patient_user_a": patient_user_a,
        "patient_user_b": patient_user_b,
        "patient_a": patient_a,
        "patient_b": patient_b,
    }


async def _get_auth_header(client, email, password="PatientPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_specialities_discovery(client, db_session, teleconsult_setup):
    headers = await _get_auth_header(client, "patient.a@example.com")
    resp = await client.get("/api/v1/teleconsultations/specialities", headers=headers)
    assert resp.status_code == 200
    specs = resp.json()
    spec_names = [s["name"] for s in specs]
    assert "Cardiology" in spec_names
    assert "Pediatrics" in spec_names


@pytest.mark.asyncio
async def test_doctor_discovery_and_filtering(client, db_session, teleconsult_setup):
    headers = await _get_auth_header(client, "patient.a@example.com")
    
    # All doctors
    resp = await client.get("/api/v1/teleconsultations/doctors", headers=headers)
    assert resp.status_code == 200
    doctors = resp.json()
    assert len(doctors) == 2

    # Filter by speciality
    resp_cardio = await client.get("/api/v1/teleconsultations/doctors?speciality=Cardiology", headers=headers)
    assert resp_cardio.status_code == 200
    cardio_docs = resp_cardio.json()
    assert len(cardio_docs) == 1
    assert cardio_docs[0]["full_name"] == "Dr. Rajesh Sharma"
    assert cardio_docs[0]["facility_name"] == "District Hospital Kanpur"
    assert cardio_docs[0]["consultation_fee"] == 300.0
    assert cardio_docs[0]["available_slots_count"] == 2

    # Doctor profile
    doc_id = cardio_docs[0]["id"]
    resp_profile = await client.get(f"/api/v1/teleconsultations/doctors/{doc_id}", headers=headers)
    assert resp_profile.status_code == 200
    assert resp_profile.json()["qualification"] == "MD, DM (Cardiology)"

    # Doctor slots
    resp_slots = await client.get(f"/api/v1/teleconsultations/doctors/{doc_id}/availability", headers=headers)
    assert resp_slots.status_code == 200
    slots = resp_slots.json()
    assert len(slots) == 2


@pytest.mark.asyncio
async def test_atomic_booking_and_double_booking_prevention(client, db_session, teleconsult_setup):
    headers_a = await _get_auth_header(client, "patient.a@example.com")
    headers_b = await _get_auth_header(client, "patient.b@example.com")

    slot_id = str(teleconsult_setup["slot_a1"].id)
    doc_id = str(teleconsult_setup["doc_a"].id)

    # 1. Patient A books slot_a1
    book_payload = {
        "doctor_id": doc_id,
        "availability_id": slot_id,
        "reason": "Chest tightness and palpitations",
        "speciality": "Cardiology",
    }
    resp_a = await client.post("/api/v1/teleconsultations/appointments", json=book_payload, headers=headers_a)
    assert resp_a.status_code == 201
    appt_a = resp_a.json()
    assert appt_a["status"] == "SCHEDULED"
    assert appt_a["doctor_name"] == "Dr. Rajesh Sharma"
    assert appt_a["patient_name"] == "Ramesh Kumar"
    assert appt_a["consultation_type"] == "Teleconsultation"
    assert appt_a["meeting_room_id"] is not None

    # 2. Patient B tries to book the EXACT SAME slot -> Must fail with 409 Conflict
    resp_b = await client.post("/api/v1/teleconsultations/appointments", json=book_payload, headers=headers_b)
    assert resp_b.status_code == 409
    err_body = resp_b.json()
    msg = (err_body.get("error", {}).get("message") or err_body.get("detail") or "").lower()
    assert "already booked" in msg or "sorry" in msg or "unavailable" in msg

    # 3. Availability endpoint for doctor must now only show 1 remaining slot
    resp_slots = await client.get(f"/api/v1/teleconsultations/doctors/{doc_id}/availability", headers=headers_b)
    assert resp_slots.status_code == 200
    assert len(resp_slots.json()) == 1


@pytest.mark.asyncio
async def test_patient_and_doctor_identity_isolation(client, db_session, teleconsult_setup):
    headers_a = await _get_auth_header(client, "patient.a@example.com")
    headers_b = await _get_auth_header(client, "patient.b@example.com")
    doc_headers_a = await _get_auth_header(client, "dr.sharma@example.com", "DoctorPass123!")
    doc_headers_b = await _get_auth_header(client, "dr.verma@example.com", "DoctorPass123!")

    # Patient A books with Doctor A
    book_a = {
        "doctor_id": str(teleconsult_setup["doc_a"].id),
        "availability_id": str(teleconsult_setup["slot_a2"].id),
        "reason": "Follow-up consultation",
    }
    resp = await client.post("/api/v1/teleconsultations/appointments", json=book_a, headers=headers_a)
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    # Patient A can see their appointment
    my_appts_a = await client.get("/api/v1/teleconsultations/appointments/me", headers=headers_a)
    assert my_appts_a.status_code == 200
    assert any(a["id"] == appt_id for a in my_appts_a.json())

    # Patient B's /appointments/me NEVER leaks Patient A's appointment
    my_appts_b = await client.get("/api/v1/teleconsultations/appointments/me", headers=headers_b)
    assert my_appts_b.status_code == 200
    assert not any(a["id"] == appt_id for a in my_appts_b.json())

    # Patient B directly accessing Patient A's appointment ID -> 403 Forbidden
    direct_b = await client.get(f"/api/v1/teleconsultations/appointments/{appt_id}", headers=headers_b)
    assert direct_b.status_code == 403

    # Doctor A sees the appointment in their teleconsultations
    doc_appts_a = await client.get("/api/v1/doctor/teleconsultations", headers=doc_headers_a)
    assert doc_appts_a.status_code == 200
    assert any(a["id"] == appt_id for a in doc_appts_a.json())

    # Doctor B DOES NOT see Doctor A's private consultation
    doc_appts_b = await client.get("/api/v1/doctor/teleconsultations", headers=doc_headers_b)
    assert doc_appts_b.status_code == 200
    assert not any(a["id"] == appt_id for a in doc_appts_b.json())

    # Doctor B directly accessing Doctor A's appointment -> 403 Forbidden
    direct_doc_b = await client.get(f"/api/v1/doctor/teleconsultations/{appt_id}", headers=doc_headers_b)
    assert direct_doc_b.status_code == 403


@pytest.mark.asyncio
async def test_full_consultation_lifecycle_and_clinical_notes(client, db_session, teleconsult_setup):
    headers_patient = await _get_auth_header(client, "patient.a@example.com")
    headers_doctor = await _get_auth_header(client, "dr.sharma@example.com", "DoctorPass123!")

    # 1. Book appointment
    book_req = {
        "doctor_id": str(teleconsult_setup["doc_a"].id),
        "availability_id": str(teleconsult_setup["slot_a1"].id),
        "reason": "Severe headache and mild hypertension",
        "speciality": "Cardiology",
    }
    resp_book = await client.post("/api/v1/teleconsultations/appointments", json=book_req, headers=headers_patient)
    assert resp_book.status_code == 201
    appt = resp_book.json()
    appt_id = appt["id"]

    # 2. Check room info
    room_resp = await client.get(f"/api/v1/teleconsultations/{appt_id}/room", headers=headers_patient)
    assert room_resp.status_code == 200
    room_data = room_resp.json()
    assert room_data["appointment_id"] == appt_id
    assert room_data["room_id"] is not None
    assert len(room_data["ice_servers"]) > 0

    # 3. Doctor starts consultation
    start_resp = await client.post(f"/api/v1/doctor/teleconsultations/{appt_id}/start", headers=headers_doctor)
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "IN_PROGRESS"
    assert start_resp.json()["started_at"] is not None

    # 4. Doctor records notes
    notes_payload = {
        "chief_complaint": "Severe frontal headache with BP 145/92",
        "clinical_observations": "Patient alert, slight pallor, pulse 82 bpm regular",
        "assessment": "Stage 1 Essential Hypertension under stress",
        "advice": "Reduce salt intake, maintain daily BP log, adequate hydration",
        "treatment_plan": "Start Amlodipine 5mg OD, follow up in 2 weeks",
        "follow_up_recommendation": "Review in 14 days with BP chart",
    }
    notes_resp = await client.post(f"/api/v1/doctor/teleconsultations/{appt_id}/notes", json=notes_payload, headers=headers_doctor)
    assert notes_resp.status_code == 200
    enc_data = notes_resp.json()
    assert enc_data["chief_complaint"] == notes_payload["chief_complaint"]
    assert enc_data["encounter_type"] == "TELECONSULTATION"

    # 5. Doctor completes consultation with clinical outputs (notes + referral)
    complete_payload = {
        "notes": notes_payload,
        "referral": {
            "to_facility_id": str(teleconsult_setup["fac_b"].id),
            "reason": "Referral for in-person ECG and 24h Holter monitoring",
            "urgency": "ROUTINE",
            "specialty_needed": "Cardiology",
        }
    }
    comp_resp = await client.post(f"/api/v1/doctor/teleconsultations/{appt_id}/complete", json=complete_payload, headers=headers_doctor)
    assert comp_resp.status_code == 200
    completed_appt = comp_resp.json()
    assert completed_appt["status"] == "COMPLETED"
    assert completed_appt["ended_at"] is not None

    # Verify referral was created in DB
    ref_res = await db_session.execute(select(Referral).where(Referral.patient_id == teleconsult_setup["patient_a"].id))
    referrals = ref_res.scalars().all()
    assert len(referrals) == 1
    assert "Holter monitoring" in referrals[0].reason


@pytest.mark.asyncio
async def test_cancellation_releases_slot(client, db_session, teleconsult_setup):
    headers_patient = await _get_auth_header(client, "patient.a@example.com")
    slot_id = str(teleconsult_setup["slot_a1"].id)
    doc_id = str(teleconsult_setup["doc_a"].id)

    # Book slot
    book_req = {
        "doctor_id": doc_id,
        "availability_id": slot_id,
        "reason": "Routine consultation",
    }
    resp_book = await client.post("/api/v1/teleconsultations/appointments", json=book_req, headers=headers_patient)
    assert resp_book.status_code == 201
    appt_id = resp_book.json()["id"]

    # Slot should now be booked
    slot_db = await db_session.get(DoctorAvailability, teleconsult_setup["slot_a1"].id)
    await db_session.refresh(slot_db)
    assert slot_db.is_booked is True

    # Cancel appointment
    cancel_resp = await client.post(
        f"/api/v1/teleconsultations/appointments/{appt_id}/cancel?reason=Scheduling+conflict",
        headers=headers_patient,
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # Slot must now be released back to false
    await db_session.refresh(slot_db)
    assert slot_db.is_booked is False


@pytest.mark.asyncio
async def test_invalid_availability_and_mismatched_doctor(client, db_session, teleconsult_setup):
    headers_patient = await _get_auth_header(client, "patient.a@example.com")
    fake_slot_id = str(uuid.uuid4())
    doc_a_id = str(teleconsult_setup["doc_a"].id)
    doc_b_id = str(teleconsult_setup["doc_b"].id)
    slot_a2_id = str(teleconsult_setup["slot_a2"].id)

    # 1. Non-existent availability slot
    resp_fake = await client.post(
        "/api/v1/teleconsultations/appointments",
        json={"doctor_id": doc_a_id, "availability_id": fake_slot_id, "reason": "Checkup"},
        headers=headers_patient,
    )
    assert resp_fake.status_code == 409
    assert "no longer available" in resp_fake.text.lower() or "sorry" in resp_fake.text.lower()

    # 2. Slot belongs to Doctor A, but booking specifies Doctor B
    resp_mismatch = await client.post(
        "/api/v1/teleconsultations/appointments",
        json={"doctor_id": doc_b_id, "availability_id": slot_a2_id, "reason": "Checkup"},
        headers=headers_patient,
    )
    assert resp_mismatch.status_code == 409
    assert "no longer available" in resp_mismatch.text.lower() or "sorry" in resp_mismatch.text.lower()


@pytest.mark.asyncio
async def test_consultation_session_and_prescriptions_diagnostics(client, db_session, teleconsult_setup):
    headers_patient = await _get_auth_header(client, "patient.a@example.com")
    headers_doctor = await _get_auth_header(client, "dr.sharma@example.com", "DoctorPass123!")
    slot_id = str(teleconsult_setup["slot_a1"].id)
    doc_id = str(teleconsult_setup["doc_a"].id)

    # Create an inventory item for prescription test
    inv_item = InventoryItem(
        facility_id=teleconsult_setup["fac_a"].id,
        name="Paracetamol 500mg",
        quantity=100,
    )
    db_session.add(inv_item)
    await db_session.commit()

    # 1. Book appointment
    book_req = {
        "doctor_id": doc_id,
        "availability_id": slot_id,
        "reason": "Fever and joint pain",
    }
    resp_book = await client.post("/api/v1/teleconsultations/appointments", json=book_req, headers=headers_patient)
    assert resp_book.status_code == 201
    appt_id = resp_book.json()["id"]

    # Verify ConsultationSession was created
    session_res = await db_session.execute(
        select(ConsultationSession).where(ConsultationSession.appointment_id == uuid.UUID(appt_id))
    )
    session = session_res.scalar_one_or_none()
    assert session is not None
    assert session.status == AppointmentStatus.SCHEDULED
    assert session.patient_id == teleconsult_setup["patient_a"].id
    assert session.doctor_id == teleconsult_setup["doc_a"].id

    # 2. Doctor starts consultation -> session becomes IN_PROGRESS
    start_resp = await client.post(f"/api/v1/doctor/teleconsultations/{appt_id}/start", headers=headers_doctor)
    assert start_resp.status_code == 200
    await db_session.refresh(session)
    assert session.status == AppointmentStatus.IN_PROGRESS
    assert session.started_at is not None

    # 3. Doctor completes consultation with Prescription & Diagnostic Order
    comp_payload = {
        "notes": {
            "chief_complaint": "High fever for 3 days",
            "clinical_observations": "Temp 101.4F, no rashes",
            "assessment": "Viral Pyrexia",
            "advice": "Hydration, bed rest",
            "treatment_plan": "Paracetamol TID x 3 days",
        },
        "prescriptions": [
            {
                "inventory_item_id": str(inv_item.id),
                "quantity": 10,
                "dosage_instructions": "1 tab thrice daily after meals",
            }
        ],
        "diagnostic_orders": [
            {
                "test_type": "Complete Blood Count (CBC)",
            }
        ],
    }
    comp_resp = await client.post(f"/api/v1/doctor/teleconsultations/{appt_id}/complete", json=comp_payload, headers=headers_doctor)
    assert comp_resp.status_code == 200

    # Verify ConsultationSession is COMPLETED
    await db_session.refresh(session)
    assert session.status == AppointmentStatus.COMPLETED
    assert session.ended_at is not None

    # Verify Prescription created in DB
    rx_res = await db_session.execute(
        select(Prescription).where(Prescription.patient_id == teleconsult_setup["patient_a"].id)
    )
    rx_list = rx_res.scalars().all()
    assert len(rx_list) == 1
    assert rx_list[0].quantity == 10
    assert rx_list[0].status == PrescriptionStatus.ACTIVE

    # Verify DiagnosticOrder created in DB
    diag_res = await db_session.execute(
        select(DiagnosticOrder).where(DiagnosticOrder.patient_id == teleconsult_setup["patient_a"].id)
    )
    diag_list = diag_res.scalars().all()
    assert len(diag_list) == 1
    assert diag_list[0].test_type == "Complete Blood Count (CBC)"
    assert diag_list[0].status == DiagnosticOrderStatus.ORDERED


@pytest.mark.asyncio
async def test_standard_appointments_route_validation_and_double_booking(client, db_session, teleconsult_setup):
    headers_patient = await _get_auth_header(client, "patient.a@example.com")
    headers_other = await _get_auth_header(client, "patient.b@example.com")
    slot = teleconsult_setup["slot_a2"]

    # 1. Patient A books via standard /api/v1/appointments with availability_id
    appt_req = {
        "patient_id": str(teleconsult_setup["patient_a"].id),
        "availability_id": str(slot.id),
        "scheduled_at": slot.start_time.isoformat(),
        "reason": "Standard clinic checkup",
    }
    resp = await client.post("/api/v1/appointments", json=appt_req, headers=headers_patient)
    assert resp.status_code == 201
    appt_data = resp.json()
    assert appt_data["doctor_id"] == str(slot.doctor_id)
    assert appt_data["facility_id"] == str(slot.facility_id)

    # Verify slot is marked booked
    slot_db = await db_session.get(DoctorAvailability, slot.id)
    await db_session.refresh(slot_db)
    assert slot_db.is_booked is True

    # 2. Patient B tries to book the same slot -> 409 Conflict
    conflict_req = {
        "patient_id": str(teleconsult_setup["patient_b"].id),
        "availability_id": str(slot.id),
        "scheduled_at": slot.start_time.isoformat(),
        "reason": "Duplicate attempt",
    }
    resp_conflict = await client.post("/api/v1/appointments", json=conflict_req, headers=headers_other)
    assert resp_conflict.status_code == 409
    assert "no longer available" in resp_conflict.text.lower()

