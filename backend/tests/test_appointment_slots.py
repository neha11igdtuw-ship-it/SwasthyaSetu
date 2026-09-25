"""Tests for the ORS-style slot-based appointment booking flow."""

import pytest

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


async def _login(client, email, password="StrongPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _doctor_headers(client, db_session, facility):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="doc@example.com",
            password="StrongPass123!",
            full_name="Doc Test",
            role=Role.DOCTOR,
            facility_id=facility.id,
        )
    )
    return await _login(client, "doc@example.com")


async def _patient_headers(client, db_session, facility):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="patient@example.com",
            password="StrongPass123!",
            full_name="Patient Test",
            role=Role.PATIENT,
            facility_id=facility.id,
        )
    )
    return await _login(client, "patient@example.com")


async def test_patient_cannot_list_raw_availability(client, db_session, facility):
    patient_headers = await _patient_headers(client, db_session, facility)
    resp = await client.get(
        f"/api/v1/doctor-availability?facility_id={facility.id}", headers=patient_headers
    )
    assert resp.status_code == 403


async def test_available_slots_hides_doctor_identity_and_excludes_booked(
    client, db_session, facility
):
    doctor_headers = await _doctor_headers(client, db_session, facility)
    doctor_me = await client.get("/api/v1/auth/me", headers=doctor_headers)
    doctor_id = doctor_me.json()["id"]

    open_slot = await client.post(
        "/api/v1/doctor-availability",
        json={
            "doctor_id": doctor_id,
            "facility_id": str(facility.id),
            "start_time": "2026-10-01T09:00:00",
            "end_time": "2026-10-01T09:30:00",
        },
        headers=doctor_headers,
    )
    assert open_slot.status_code == 201, open_slot.text

    booked_slot = await client.post(
        "/api/v1/doctor-availability",
        json={
            "doctor_id": doctor_id,
            "facility_id": str(facility.id),
            "start_time": "2026-10-01T10:00:00",
            "end_time": "2026-10-01T10:30:00",
        },
        headers=doctor_headers,
    )
    assert booked_slot.status_code == 201
    booked_id = booked_slot.json()["id"]
    patch = await client.patch(
        f"/api/v1/doctor-availability/{booked_id}",
        json={"base_version": booked_slot.json()["version"], "is_booked": True},
        headers=doctor_headers,
    )
    assert patch.status_code == 200

    patient_headers = await _patient_headers(client, db_session, facility)
    resp = await client.get(
        f"/api/v1/doctor-availability/available?facility_id={facility.id}&day=2026-10-01",
        headers=patient_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == open_slot.json()["id"]
    assert set(body[0].keys()) == {"id", "start_time", "end_time"}


async def test_booking_a_slot_marks_it_booked_and_double_booking_conflicts(
    client, db_session, facility
):
    doctor_headers = await _doctor_headers(client, db_session, facility)
    doctor_me = await client.get("/api/v1/auth/me", headers=doctor_headers)
    doctor_id = doctor_me.json()["id"]

    slot_resp = await client.post(
        "/api/v1/doctor-availability",
        json={
            "doctor_id": doctor_id,
            "facility_id": str(facility.id),
            "start_time": "2026-10-02T09:00:00",
            "end_time": "2026-10-02T09:30:00",
        },
        headers=doctor_headers,
    )
    slot_id = slot_resp.json()["id"]

    patient_headers = await _patient_headers(client, db_session, facility)
    patient_me = await client.get("/api/v1/patients/me", headers=patient_headers)
    patient_id = patient_me.json()["id"]

    book = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "facility_id": str(facility.id),
            "availability_id": slot_id,
            "scheduled_at": "2026-10-02T09:00:00",
            "reason": "Antenatal checkup",
        },
        headers=patient_headers,
    )
    assert book.status_code == 201, book.text
    assert book.json()["scheduled_at"].startswith("2026-10-02T09:00:00")

    # Slot no longer shows up as available.
    avail = await client.get(
        f"/api/v1/doctor-availability/available?facility_id={facility.id}&day=2026-10-02",
        headers=patient_headers,
    )
    assert avail.json() == []

    # A second patient trying to book the same slot gets a conflict, not a double booking.
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="patient2@example.com",
            password="StrongPass123!",
            full_name="Patient Two",
            role=Role.PATIENT,
            facility_id=facility.id,
        )
    )
    patient2_headers = await _login(client, "patient2@example.com")
    patient2_me = await client.get("/api/v1/patients/me", headers=patient2_headers)
    conflict = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient2_me.json()["id"],
            "facility_id": str(facility.id),
            "availability_id": slot_id,
            "scheduled_at": "2026-10-02T09:00:00",
            "reason": "Vaccination",
        },
        headers=patient2_headers,
    )
    assert conflict.status_code == 409
