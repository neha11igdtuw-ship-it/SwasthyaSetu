import pytest
import pytest_asyncio

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def doctor_headers(client, db_session, facility):
    await AuthService(db_session).register(
        UserRegister(
            email="doctor@example.com",
            password="StrongPass123",
            full_name="Test Doctor",
            role=Role.DOCTOR,
            facility_id=facility.id,
        )
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "doctor@example.com", "password": "StrongPass123"}
    )
    token = resp.json()["access_token"]
    doctor_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    return {"Authorization": f"Bearer {token}"}, doctor_me.json()["id"]


async def test_doctor_availability_crud(client, auth_headers, facility, doctor_headers):
    _, doctor_id = doctor_headers
    resp = await client.post(
        "/api/v1/doctor-availability",
        json={
            "doctor_id": doctor_id,
            "facility_id": str(facility.id),
            "start_time": "2026-02-01T09:00:00",
            "end_time": "2026-02-01T09:30:00",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    slot = resp.json()
    assert slot["is_booked"] is False

    resp = await client.get(
        "/api/v1/doctor-availability",
        params={"facility_id": str(facility.id)},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.patch(
        f"/api/v1/doctor-availability/{slot['id']}",
        json={"base_version": slot["version"], "is_booked": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_booked"] is True


async def test_health_worker_profile_create_and_get(client, auth_headers, admin_headers, facility):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    worker_id = resp.json()["id"]

    # A plain health worker cannot create profiles; only ADMIN/FACILITY_ADMIN can.
    resp = await client.post(
        "/api/v1/health-worker-profiles",
        json={"user_id": worker_id, "facility_id": str(facility.id), "cadre": "ASHA"},
        headers=auth_headers,
    )
    assert resp.status_code == 403

    resp = await client.post(
        "/api/v1/health-worker-profiles",
        json={
            "user_id": worker_id,
            "facility_id": str(facility.id),
            "cadre": "ASHA",
            "area": "Ward 4",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    profile = resp.json()

    resp = await client.get(f"/api/v1/health-worker-profiles/{profile['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["cadre"] == "ASHA"
