"""End-to-end tests for the OPD Queue Management feature."""

import pytest

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


async def _login(client, email, password="StrongPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _register(client, db_session, role, facility, email):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name=f"{role.value} Test",
            role=role,
            facility_id=facility.id if role != Role.PATIENT else facility.id,
        )
    )
    return await _login(client, email)


async def _doctor_headers(client, db_session, facility):
    return await _register(client, db_session, Role.DOCTOR, facility, "doctor@example.com")


async def _facility_admin_headers(client, db_session, facility):
    return await _register(client, db_session, Role.FACILITY_ADMIN, facility, "fadmin@example.com")


async def _patient_headers(client, db_session, facility, email="patient@example.com"):
    return await _register(client, db_session, Role.PATIENT, facility, email)


async def _get_user_id(client, headers):
    me = (await client.get("/api/v1/auth/me", headers=headers)).json()
    return me["id"]


async def _create_desk(client, admin_headers, facility, doctor_id):
    resp = await client.post(
        "/api/v1/queue-desks",
        json={
            "facility_id": str(facility.id),
            "department": "General OPD",
            "room_number": "12",
            "doctor_id": doctor_id,
            "display_name": "Dr. Test - General OPD",
            "average_consultation_minutes": 10,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_full_queue_lifecycle(client, db_session, facility):
    fadmin = await _facility_admin_headers(client, db_session, facility)
    doctor = await _doctor_headers(client, db_session, facility)
    doctor_id = await _get_user_id(client, doctor)

    desk = await _create_desk(client, fadmin, facility, doctor_id)
    assert desk["qr_code_key"]

    # QR endpoint returns a payload never containing patient data.
    qr_resp = await client.get(f"/api/v1/queue-desks/{desk['id']}/qr", headers=fadmin)
    assert qr_resp.status_code == 200
    assert qr_resp.json()["qr_payload"] == desk["qr_code_key"]

    patient = await _patient_headers(client, db_session, facility)

    join_resp = await client.post(
        "/api/v1/queues/join",
        json={"queue_desk_id": desk["id"]},
        headers=patient,
    )
    assert join_resp.status_code == 201, join_resp.text
    entry = join_resp.json()
    assert entry["token_number"] == 1
    assert entry["status"] == "WAITING"

    # Duplicate active join for the same patient/desk/day must be rejected.
    dup_resp = await client.post(
        "/api/v1/queues/join",
        json={"queue_desk_id": desk["id"]},
        headers=patient,
    )
    assert dup_resp.status_code in (400, 409, 422), dup_resp.text

    me_resp = await client.get("/api/v1/queues/me", headers=patient)
    assert me_resp.status_code == 200
    assert len(me_resp.json()) == 1

    # Doctor calls the next patient, starts consultation, then completes it.
    call_resp = await client.post(
        "/api/v1/doctor/queue/call-next",
        params={"queue_desk_id": desk["id"]},
        headers=doctor,
    )
    assert call_resp.status_code == 200, call_resp.text
    assert call_resp.json()["status"] == "CALLED"

    current_resp = await client.get("/api/v1/doctor/queue/current", headers=doctor)
    assert current_resp.status_code == 200
    summary = current_resp.json()["summary"]
    assert summary["current_token_number"] == 1

    start_resp = await client.post(
        f"/api/v1/queues/{entry['id']}/start-consultation", headers=doctor
    )
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "IN_CONSULTATION"

    complete_resp = await client.post(f"/api/v1/queues/{entry['id']}/complete", headers=doctor)
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "COMPLETED"


async def test_skip_and_rejoin_preserves_token_and_audit_trail(client, db_session, facility):
    fadmin = await _facility_admin_headers(client, db_session, facility)
    doctor = await _doctor_headers(client, db_session, facility)
    doctor_id = await _get_user_id(client, doctor)
    desk = await _create_desk(client, fadmin, facility, doctor_id)
    patient = await _patient_headers(client, db_session, facility, "skip.patient@example.com")

    join_resp = await client.post(
        "/api/v1/queues/join", json={"queue_desk_id": desk["id"]}, headers=patient
    )
    entry = join_resp.json()
    original_token = entry["token_number"]

    skip_resp = await client.post(
        f"/api/v1/queues/{entry['id']}/skip",
        json={"reason": "Patient not present"},
        headers=doctor,
    )
    assert skip_resp.status_code == 200, skip_resp.text
    assert skip_resp.json()["status"] == "SKIPPED"

    rejoin_resp = await client.post(f"/api/v1/queues/{entry['id']}/rejoin", headers=patient)
    assert rejoin_resp.status_code == 200, rejoin_resp.text
    rejoined = rejoin_resp.json()
    # Token number is preserved across rejoin for audit purposes.
    assert rejoined["token_number"] == original_token
    assert rejoined["status"] == "WAITING"


async def test_pause_and_resume_blocks_call_next(client, db_session, facility):
    fadmin = await _facility_admin_headers(client, db_session, facility)
    doctor = await _doctor_headers(client, db_session, facility)
    doctor_id = await _get_user_id(client, doctor)
    desk = await _create_desk(client, fadmin, facility, doctor_id)
    patient = await _patient_headers(client, db_session, facility, "pause.patient@example.com")

    await client.post("/api/v1/queues/join", json={"queue_desk_id": desk["id"]}, headers=patient)

    pause_resp = await client.post(
        f"/api/v1/queue-desks/{desk['id']}/pause",
        json={"reason": "Doctor delayed"},
        headers=doctor,
    )
    assert pause_resp.status_code == 200
    assert pause_resp.json()["is_paused"] is True

    call_resp = await client.post(
        "/api/v1/doctor/queue/call-next", params={"queue_desk_id": desk["id"]}, headers=doctor
    )
    assert call_resp.status_code != 200

    resume_resp = await client.post(f"/api/v1/queue-desks/{desk['id']}/resume", headers=doctor)
    assert resume_resp.status_code == 200
    assert resume_resp.json()["is_paused"] is False

    call_resp = await client.post(
        "/api/v1/doctor/queue/call-next", params={"queue_desk_id": desk["id"]}, headers=doctor
    )
    assert call_resp.status_code == 200


async def test_doctor_cannot_manage_another_doctors_queue(client, db_session, facility):
    fadmin = await _facility_admin_headers(client, db_session, facility)
    doctor = await _doctor_headers(client, db_session, facility)
    doctor_id = await _get_user_id(client, doctor)
    desk = await _create_desk(client, fadmin, facility, doctor_id)

    other_doctor = await _register(client, db_session, Role.DOCTOR, facility, "other.doctor@example.com")
    resp = await client.post(
        "/api/v1/doctor/queue/call-next",
        params={"queue_desk_id": desk["id"]},
        headers=other_doctor,
    )
    assert resp.status_code == 403


async def test_facility_overview_groups_by_desk(client, db_session, facility):
    fadmin = await _facility_admin_headers(client, db_session, facility)
    doctor = await _doctor_headers(client, db_session, facility)
    doctor_id = await _get_user_id(client, doctor)
    desk = await _create_desk(client, fadmin, facility, doctor_id)
    patient = await _patient_headers(client, db_session, facility, "overview.patient@example.com")
    await client.post("/api/v1/queues/join", json={"queue_desk_id": desk["id"]}, headers=patient)

    resp = await client.get(
        "/api/v1/facility/queues/overview", params={"facility_id": str(facility.id)}, headers=fadmin
    )
    assert resp.status_code == 200, resp.text
    desks = resp.json()["desks"]
    assert len(desks) == 1
    assert desks[0]["waiting_count"] == 1


async def test_health_worker_joins_referred_hospital_opd(client, db_session, facility, auth_headers):
    """Health worker at a PHC joins OPD New at the referred hospital; the
    destination doctor then calls, starts, and completes the consult."""
    from app.models.facility import Facility

    hospital = Facility(name="District Hospital", facility_type="HOSPITAL")
    db_session.add(hospital)
    await db_session.commit()
    await db_session.refresh(hospital)

    doctor = await _register(client, db_session, Role.DOCTOR, hospital, "hospital.doctor@example.com")
    doctor_id = await _get_user_id(client, doctor)
    hospital_admin = await _register(
        client, db_session, Role.FACILITY_ADMIN, hospital, "hospital.admin@example.com"
    )

    desk_resp = await client.post(
        "/api/v1/queue-desks",
        json={
            "facility_id": str(hospital.id),
            "department": "Obstetrics",
            "room_number": "OPD-1",
            "doctor_id": doctor_id,
            "display_name": "OPD New",
            "average_consultation_minutes": 10,
        },
        headers=hospital_admin,
    )
    assert desk_resp.status_code == 201, desk_resp.text
    desk = desk_resp.json()

    patient_resp = await client.post(
        "/api/v1/patients", json={"full_name": "Priya Sharma"}, headers=auth_headers
    )
    assert patient_resp.status_code == 201, patient_resp.text
    patient_id = patient_resp.json()["id"]

    referral_resp = await client.post(
        "/api/v1/referrals",
        json={
            "patient_id": patient_id,
            "from_facility_id": str(facility.id),
            "to_facility_id": str(hospital.id),
            "reason": "Suspected pre-eclampsia",
            "specialty_needed": "obstetrics",
            "urgency": "URGENT",
        },
        headers=auth_headers,
    )
    assert referral_resp.status_code == 201, referral_resp.text

    desks_resp = await client.get(
        "/api/v1/queue-desks",
        params={"patient_id": patient_id},
        headers=auth_headers,
    )
    assert desks_resp.status_code == 200, desks_resp.text
    desks = desks_resp.json()
    assert any(d["id"] == desk["id"] and d["display_name"] == "OPD New" for d in desks)

    join_resp = await client.post(
        "/api/v1/queues/join",
        json={"queue_desk_id": desk["id"], "patient_id": patient_id},
        headers=auth_headers,
    )
    assert join_resp.status_code == 201, join_resp.text
    entry = join_resp.json()
    assert entry["status"] == "WAITING"
    assert entry["facility_id"] == str(hospital.id)
    assert entry["doctor_id"] == doctor_id
    assert entry["referral_id"] == referral_resp.json()["id"]

    current_resp = await client.get("/api/v1/doctor/queue/current", headers=doctor)
    assert current_resp.status_code == 200, current_resp.text
    current = current_resp.json()
    assert current["summary"]["waiting_count"] == 1
    assert current["entries"][0]["patient_name"] == "Priya Sharma"

    call_resp = await client.post(
        "/api/v1/doctor/queue/call-next",
        params={"queue_desk_id": desk["id"]},
        headers=doctor,
    )
    assert call_resp.status_code == 200, call_resp.text
    assert call_resp.json()["status"] == "CALLED"

    start_resp = await client.post(
        f"/api/v1/queues/{entry['id']}/start-consultation", headers=doctor
    )
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "IN_CONSULTATION"

    complete_resp = await client.post(f"/api/v1/queues/{entry['id']}/complete", headers=doctor)
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "COMPLETED"
