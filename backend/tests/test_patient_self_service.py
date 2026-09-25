"""Patient self-service flows: book, inventory search, care request, profile, visits."""

import pytest

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


async def _login(client, email, password="StrongPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _register_patient(client, db_session, facility, email="self.patient@example.com"):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name="Self Patient",
            role=Role.PATIENT,
            facility_id=facility.id,
            village="Rampur Village",
        )
    )
    return await _login(client, email)


async def test_patient_books_and_lists_own_appointments(client, db_session, facility, auth_headers):
    headers = await _register_patient(client, db_session, facility)
    me = (await client.get("/api/v1/patients/me", headers=headers)).json()
    other = (
        await client.post("/api/v1/patients", json={"full_name": "Other Person"}, headers=auth_headers)
    ).json()

    resp = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": me["id"],
            "facility_id": str(facility.id),
            "scheduled_at": "2026-10-01T10:30:00",
            "reason": "Antenatal checkup",
            "notes": "Prefer morning",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    appt = resp.json()
    assert appt["status"] == "SCHEDULED"
    assert "Prefer morning" in (appt["reason"] or "")

    listed = await client.get("/api/v1/appointments/me", headers=headers)
    assert listed.status_code == 200
    assert any(row["id"] == appt["id"] for row in listed.json())

    forbidden = await client.post(
        "/api/v1/appointments",
        json={"patient_id": other["id"], "scheduled_at": "2026-10-02T10:00:00", "reason": "Nope"},
        headers=headers,
    )
    assert forbidden.status_code == 403

    cancelled = await client.patch(
        f"/api/v1/appointments/{appt['id']}/status",
        json={"base_version": appt["version"], "status": "CANCELLED"},
        headers=headers,
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"


async def test_patient_inventory_nearby_and_search(client, db_session, facility, auth_headers):
    await client.post(
        "/api/v1/inventory",
        json={"facility_id": str(facility.id), "name": "Iron Folic Acid", "quantity": 12},
        headers=auth_headers,
    )
    headers = await _register_patient(client, db_session, facility, email="inv.patient@example.com")
    nearby = await client.get("/api/v1/inventory/nearby", headers=headers)
    assert nearby.status_code == 200, nearby.text
    assert any(row["name"] == "Iron Folic Acid" for row in nearby.json())

    search = await client.get("/api/v1/inventory/search", params={"query": "iron"}, headers=headers)
    assert search.status_code == 200
    assert len(search.json()) >= 1


async def test_patient_request_care_and_staff_transition(client, db_session, facility, auth_headers):
    headers = await _register_patient(client, db_session, facility, email="care.patient@example.com")
    resp = await client.post(
        "/api/v1/referrals/request-care",
        json={
            "main_concern": "Severe headache",
            "symptoms": "Blurred vision",
            "preferred_language": "Hindi",
            "urgency": "HIGH",
            "notes": "Started yesterday",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    referral = resp.json()
    assert referral["status"] == "CREATED"
    assert referral["urgency"] == "URGENT"

    mine = await client.get("/api/v1/referrals/me", headers=headers)
    assert mine.status_code == 200
    assert any(row["id"] == referral["id"] for row in mine.json())

    staff_list = await client.get("/api/v1/referrals", headers=auth_headers)
    assert any(row["id"] == referral["id"] for row in staff_list.json())

    accepted = await client.patch(
        f"/api/v1/referrals/{referral['id']}/status",
        json={"base_version": referral["version"], "status": "ACCEPTED"},
        headers=auth_headers,
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["status"] == "ACCEPTED"


async def test_patient_updates_own_profile_and_self_reports(client, db_session, facility):
    headers = await _register_patient(client, db_session, facility, email="profile.patient@example.com")
    me = (await client.get("/api/v1/patients/me", headers=headers)).json()
    patched = await client.patch(
        "/api/v1/patients/me",
        json={
            "base_version": me["version"],
            "village": "New Village",
            "emergency_contact": "9876543210",
            "preferred_language": "Hindi",
            "age": 26,
        },
        headers=headers,
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body["village"] == "New Village"
    assert body["emergency_contact"] == "9876543210"

    visit = await client.post(
        "/api/v1/encounters/me",
        json={"patient_id": me["id"], "encounter_type": "HEALTH_VISIT", "notes": "Feeling better"},
        headers=headers,
    )
    assert visit.status_code == 201, visit.text

    vitals = await client.post(
        "/api/v1/vitals/me",
        json={"systolic_bp": 118, "diastolic_bp": 76, "pulse": 80},
        headers=headers,
    )
    assert vitals.status_code == 201, vitals.text

    timeline = await client.get("/api/v1/encounters/me", headers=headers)
    assert timeline.status_code == 200
    assert len(timeline.json()) >= 2


async def test_patient_requests_lab_and_staff_uploads_report(client, db_session, facility, auth_headers):
    headers = await _register_patient(client, db_session, facility, email="lab.patient@example.com")
    me = (await client.get("/api/v1/patients/me", headers=headers)).json()
    order = await client.post(
        "/api/v1/diagnostics/orders",
        json={"patient_id": me["id"], "test_type": "Urine protein"},
        headers=headers,
    )
    assert order.status_code == 201, order.text

    report = await client.post(
        "/api/v1/diagnostics/reports",
        json={
            "diagnostic_order_id": order.json()["id"],
            "result_summary": "Trace protein",
            "result_status": "Reviewed",
        },
        headers=auth_headers,
    )
    assert report.status_code == 201, report.text

    mine = await client.get("/api/v1/diagnostics/me", headers=headers)
    assert mine.status_code == 200
    row = mine.json()[0]
    assert row["report_id"] is not None
    assert row["status"] == "COMPLETED"
    assert "Trace protein" in (row["result_summary"] or "")
