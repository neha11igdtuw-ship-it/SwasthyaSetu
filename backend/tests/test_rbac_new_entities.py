"""RBAC / facility-ownership tests for the Part 2 maternal-care entities,
mirroring the pattern in tests/test_rbac.py."""

import pytest
import pytest_asyncio

from app.models.enums import Role
from app.models.facility import Facility
from app.models.patient import Patient
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


async def _register_and_login(client, db_session, *, email, role, facility_id=None):
    await AuthService(db_session).register(
        UserRegister(
            email=email,
            password="StrongPass123",
            full_name=email.split("@")[0],
            role=role,
            facility_id=facility_id,
        )
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "StrongPass123"}
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def two_facility_setup(client, db_session):
    fac_a = Facility(name="New Facility A", facility_type="PHC")
    fac_b = Facility(name="New Facility B", facility_type="PHC")
    db_session.add_all([fac_a, fac_b])
    await db_session.commit()
    await db_session.refresh(fac_a)
    await db_session.refresh(fac_b)

    worker_a = await _register_and_login(
        client,
        db_session,
        email="w.a@new.example.com",
        role=Role.HEALTH_WORKER,
        facility_id=fac_a.id,
    )
    worker_b = await _register_and_login(
        client,
        db_session,
        email="w.b@new.example.com",
        role=Role.HEALTH_WORKER,
        facility_id=fac_b.id,
    )

    patient_a = Patient(full_name="Patient New A", facility_id=fac_a.id)
    db_session.add(patient_a)
    await db_session.commit()
    await db_session.refresh(patient_a)

    return {
        "fac_a": fac_a,
        "fac_b": fac_b,
        "worker_a": worker_a,
        "worker_b": worker_b,
        "patient_a_id": str(patient_a.id),
    }


async def test_worker_cannot_read_pregnancy_of_other_facility_patient(client, two_facility_setup):
    s = two_facility_setup
    resp = await client.post(
        "/api/v1/pregnancies",
        json={"patient_id": s["patient_a_id"]},
        headers=s["worker_a"],
    )
    assert resp.status_code == 201
    pregnancy_id = resp.json()["id"]

    resp = await client.get(f"/api/v1/pregnancies/{pregnancy_id}", headers=s["worker_b"])
    assert resp.status_code == 403


async def test_worker_cannot_create_encounter_for_other_facility_patient(
    client, two_facility_setup
):
    s = two_facility_setup
    resp = await client.post(
        "/api/v1/encounters",
        json={"patient_id": s["patient_a_id"]},
        headers=s["worker_b"],
    )
    assert resp.status_code == 403


async def test_worker_cannot_see_other_facility_appointments(client, two_facility_setup):
    s = two_facility_setup
    resp = await client.post(
        "/api/v1/appointments",
        json={"patient_id": s["patient_a_id"], "scheduled_at": "2026-03-01T10:00:00"},
        headers=s["worker_a"],
    )
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    resp = await client.get(f"/api/v1/appointments/{appt_id}", headers=s["worker_b"])
    assert resp.status_code == 403


async def test_worker_cannot_create_diagnostic_order_for_other_facility_patient(
    client, two_facility_setup
):
    s = two_facility_setup
    resp = await client.post(
        "/api/v1/diagnostics/orders",
        json={"patient_id": s["patient_a_id"], "test_type": "Blood glucose"},
        headers=s["worker_b"],
    )
    assert resp.status_code == 403


async def test_worker_cannot_prescribe_for_other_facility_patient(client, two_facility_setup):
    s = two_facility_setup
    resp = await client.post(
        "/api/v1/inventory",
        json={"facility_id": str(s["fac_a"].id), "name": "Amoxicillin", "quantity": 20},
        headers=s["worker_a"],
    )
    item_id = resp.json()["id"]

    resp = await client.post(
        "/api/v1/prescriptions",
        json={"patient_id": s["patient_a_id"], "inventory_item_id": item_id, "quantity": 1},
        headers=s["worker_b"],
    )
    assert resp.status_code == 403


async def test_worker_cannot_manage_doctor_availability_of_other_facility(
    client, two_facility_setup
):
    s = two_facility_setup
    resp = await client.get("/api/v1/auth/me", headers=s["worker_a"])
    doctor_id = resp.json()["id"]  # any user id works for the FK in this test

    resp = await client.post(
        "/api/v1/doctor-availability",
        json={
            "doctor_id": doctor_id,
            "facility_id": str(s["fac_a"].id),
            "start_time": "2026-04-01T09:00:00",
            "end_time": "2026-04-01T09:30:00",
        },
        headers=s["worker_b"],
    )
    assert resp.status_code == 403


async def test_patient_role_cannot_create_pregnancy(client, db_session, two_facility_setup):
    s = two_facility_setup
    patient_headers = await _register_and_login(
        client, db_session, email="p.new@new.example.com", role=Role.PATIENT
    )
    resp = await client.post(
        "/api/v1/pregnancies", json={"patient_id": s["patient_a_id"]}, headers=patient_headers
    )
    assert resp.status_code == 403
