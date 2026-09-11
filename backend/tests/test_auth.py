import pytest

pytestmark = pytest.mark.asyncio


async def test_register_and_login(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "a@example.com",
            "password": "StrongPass123",
            "full_name": "Alice",
            "role": "HEALTH_WORKER",
        },
    )
    assert resp.status_code == 201, resp.text

    resp = await client.post(
        "/api/v1/auth/login", json={"email": "a@example.com", "password": "StrongPass123"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body and "refresh_token" in body


async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "b@example.com",
            "password": "StrongPass123",
            "full_name": "Bob",
            "role": "PATIENT",
        },
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "b@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401


async def test_me_requires_token(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_refresh_token(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "c@example.com",
            "password": "StrongPass123",
            "full_name": "Carl",
            "role": "ADMIN",
        },
    )
    login = await client.post(
        "/api/v1/auth/login", json={"email": "c@example.com", "password": "StrongPass123"}
    )
    refresh_token = login.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
