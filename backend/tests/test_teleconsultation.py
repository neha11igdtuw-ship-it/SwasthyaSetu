"""Tests for the doctor-side teleconsultation request/accept/history flow."""

import pytest

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


async def _login(client, email, password="StrongPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _doctor_headers(client, db_session, facility, email="doc@example.com"):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name="Doc Test",
            role=Role.DOCTOR,
            facility_id=facility.id,
        )
    )
    return await _login(client, email)


async def _patient_headers(client, db_session, facility, email="patient@example.com"):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name="Patient Test",
            role=Role.PATIENT,
            facility_id=facility.id,
        )
    )
    return await _login(client, email)


async def test_patient_requests_teleconsult_doctor_gets_notified_and_accepts(
    client, db_session, facility
):
    doctor_headers = await _doctor_headers(client, db_session, facility)
    doctor_me = await client.get("/api/v1/auth/me", headers=doctor_headers)
    doctor_id = doctor_me.json()["id"]

    patient_headers = await _patient_headers(client, db_session, facility)
    patient_me = await client.get("/api/v1/patients/me", headers=patient_headers)
    patient_id = patient_me.json()["id"]

    request = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "facility_id": str(facility.id),
            "doctor_id": doctor_id,
            "mode": "TELECONSULT",
            "scheduled_at": "2026-10-05T10:00:00",
            "reason": "Fever and cough",
        },
        headers=patient_headers,
    )
    assert request.status_code == 201, request.text
    body = request.json()
    assert body["status"] == "REQUESTED"
    assert body["mode"] == "TELECONSULT"
    assert body["doctor_id"] == doctor_id
    appointment_id = body["id"]
    base_version = body["version"]

    # Doctor sees the pending request in their queue, not their history.
    pending = await client.get("/api/v1/appointments/doctor/me", headers=doctor_headers)
    assert pending.status_code == 200
    assert [a["id"] for a in pending.json()] == [appointment_id]

    history = await client.get(
        "/api/v1/appointments/doctor/me?history=true", headers=doctor_headers
    )
    assert history.json() == []

    # Doctor is notified.
    notes = await client.get("/api/v1/notifications/me", headers=doctor_headers)
    assert notes.status_code == 200
    assert any("teleconsultation" in n["title"].lower() for n in notes.json())

    # Doctor accepts -> SCHEDULED, and patient gets notified of confirmation.
    accept = await client.patch(
        f"/api/v1/appointments/{appointment_id}/status",
        json={"base_version": base_version, "status": "SCHEDULED"},
        headers=doctor_headers,
    )
    assert accept.status_code == 200, accept.text
    assert accept.json()["status"] == "SCHEDULED"

    patient_notes = await client.get("/api/v1/notifications/me", headers=patient_headers)
    assert any("confirmed" in n["title"].lower() for n in patient_notes.json())

    # Now shows up as upcoming (still not history) for the doctor.
    upcoming = await client.get("/api/v1/appointments/doctor/me", headers=doctor_headers)
    assert [a["id"] for a in upcoming.json()] == [appointment_id]

    # Mark completed -> moves to doctor's history.
    completed = await client.patch(
        f"/api/v1/appointments/{appointment_id}/status",
        json={"base_version": accept.json()["version"], "status": "COMPLETED"},
        headers=doctor_headers,
    )
    assert completed.status_code == 200
    history_after = await client.get(
        "/api/v1/appointments/doctor/me?history=true", headers=doctor_headers
    )
    assert [a["id"] for a in history_after.json()] == [appointment_id]


async def test_doctor_can_accept_request_from_patient_with_no_home_facility(
    client, db_session, facility
):
    """Patients aren't required to pick a home facility before requesting a
    teleconsultation — the doctor must still be able to accept/manage it
    based on being the assigned doctor, not the patient's own facility_id."""
    doctor_headers = await _doctor_headers(client, db_session, facility)
    doctor_id = (await client.get("/api/v1/auth/me", headers=doctor_headers)).json()["id"]

    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="nofacility@example.com",
            password="StrongPass123!",
            full_name="No Facility Patient",
            role=Role.PATIENT,
            facility_id=None,
        )
    )
    patient_headers = await _login(client, "nofacility@example.com")
    patient_id = (await client.get("/api/v1/patients/me", headers=patient_headers)).json()["id"]

    request = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "facility_id": str(facility.id),
            "doctor_id": doctor_id,
            "mode": "TELECONSULT",
            "scheduled_at": "2026-10-07T10:00:00",
        },
        headers=patient_headers,
    )
    assert request.status_code == 201, request.text
    body = request.json()

    accept = await client.patch(
        f"/api/v1/appointments/{body['id']}/status",
        json={"base_version": body["version"], "status": "SCHEDULED"},
        headers=doctor_headers,
    )
    assert accept.status_code == 200, accept.text
    assert accept.json()["status"] == "SCHEDULED"


async def test_doctor_can_decline_teleconsult_request(client, db_session, facility):
    doctor_headers = await _doctor_headers(client, db_session, facility)
    doctor_id = (await client.get("/api/v1/auth/me", headers=doctor_headers)).json()["id"]

    patient_headers = await _patient_headers(client, db_session, facility)
    patient_id = (await client.get("/api/v1/patients/me", headers=patient_headers)).json()["id"]

    request = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "facility_id": str(facility.id),
            "doctor_id": doctor_id,
            "mode": "TELECONSULT",
            "scheduled_at": "2026-10-06T10:00:00",
        },
        headers=patient_headers,
    )
    body = request.json()

    decline = await client.patch(
        f"/api/v1/appointments/{body['id']}/status",
        json={"base_version": body["version"], "status": "CANCELLED"},
        headers=doctor_headers,
    )
    assert decline.status_code == 200
    assert decline.json()["status"] == "CANCELLED"

    pending = await client.get("/api/v1/appointments/doctor/me", headers=doctor_headers)
    assert pending.json() == []
    history = await client.get(
        "/api/v1/appointments/doctor/me?history=true", headers=doctor_headers
    )
    assert [a["id"] for a in history.json()] == [body["id"]]
