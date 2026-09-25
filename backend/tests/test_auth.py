import pytest
from sqlalchemy import select

from app.models.user import User

pytestmark = pytest.mark.asyncio

ADDRESS = {
    "address_line": "12 MG Road",
    "village_area": "Rampur Village",
    "city_district": "Barabanki",
    "state": "Uttar Pradesh",
    "pincode": "225001",
}


async def _mark_verified(db_session, email: str) -> None:
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.is_verified = True
    await db_session.commit()


async def test_register_and_login(client, db_session):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "a@example.com",
            "password": "StrongPass123!",
            "full_name": "Alice",
            "role": "HEALTH_WORKER",
            "phone": "9876543210",
            "address": ADDRESS,
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["is_verified"] is False

    # Unverified accounts cannot log in yet.
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "a@example.com", "password": "StrongPass123!"}
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"

    await _mark_verified(db_session, "a@example.com")

    resp = await client.post(
        "/api/v1/auth/login", json={"email": "a@example.com", "password": "StrongPass123!"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body and "refresh_token" in body


async def test_register_rejects_non_self_registrable_role(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "wannabe-admin@example.com",
            "password": "StrongPass123!",
            "full_name": "Wannabe Admin",
            "role": "ADMIN",
            "phone": "9876543210",
            "address": ADDRESS,
        },
    )
    assert resp.status_code == 422


async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "b@example.com",
            "password": "StrongPass123!",
            "full_name": "Bob",
            "role": "PATIENT",
            "phone": "9876543210",
            "address": ADDRESS,
        },
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "b@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401


async def test_login_unknown_and_wrong_password_give_identical_response(client):
    """Anti-enumeration: an unknown email and a known email with the wrong
    password must be indistinguishable to the caller."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "known@example.com",
            "password": "StrongPass123!",
            "full_name": "Known",
            "role": "PATIENT",
            "phone": "9876543210",
            "address": ADDRESS,
        },
    )
    unknown = await client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever1!"}
    )
    known_wrong = await client.post(
        "/api/v1/auth/login", json={"email": "known@example.com", "password": "wrongpass1!"}
    )
    assert unknown.status_code == known_wrong.status_code == 401
    assert unknown.json() == known_wrong.json()


async def test_me_requires_token(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_refresh_token(client, db_session):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "c@example.com",
            "password": "StrongPass123!",
            "full_name": "Carl",
            "role": "HEALTH_WORKER",
            "phone": "9876543210",
            "address": ADDRESS,
        },
    )
    await _mark_verified(db_session, "c@example.com")
    login = await client.post(
        "/api/v1/auth/login", json={"email": "c@example.com", "password": "StrongPass123!"}
    )
    assert login.status_code == 200, login.text
    refresh_token = login.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_register_patient_creates_care_record(client, db_session):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "neha@example.com",
            "password": "StrongPass123!",
            "full_name": "Neha",
            "role": "PATIENT",
            "phone": "9876543210",
            "preferred_language": "Hindi",
            "address": ADDRESS,
        },
    )
    assert resp.status_code == 201, resp.text
    await _mark_verified(db_session, "neha@example.com")

    login = await client.post(
        "/api/v1/auth/login", json={"email": "neha@example.com", "password": "StrongPass123!"}
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    patients = await client.get("/api/v1/patients", headers={"Authorization": f"Bearer {token}"})
    assert patients.status_code == 200, patients.text
    body = patients.json()
    assert len(body) == 1
    assert body[0]["full_name"] == "Neha"
    assert body[0]["village"] == "Rampur Village"
