import pytest

pytestmark = pytest.mark.asyncio

ADDRESS = {
    "address_line": "12 MG Road",
    "village_area": "Rampur Village",
    "city_district": "Barabanki",
    "state": "Uttar Pradesh",
    "pincode": "225001",
}


def _payload(**overrides):
    payload = {
        "email": "user@example.com",
        "password": "StrongPass123!",
        "full_name": "Test User",
        "role": "PATIENT",
        "phone": "9876543210",
        "address": dict(ADDRESS),
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    "phone",
    ["12345", "5123456789", "98765432101", "+91 98765 4321", "0000000000"],
)
async def test_invalid_phone_rejected(client, phone):
    resp = await client.post("/api/v1/auth/register", json=_payload(phone=phone))
    assert resp.status_code == 422


@pytest.mark.parametrize(
    "phone,expected",
    [
        ("9876543210", "9876543210"),
        ("+91 98765-43210", "9876543210"),
        ("09876543210", "9876543210"),
    ],
)
async def test_valid_phone_normalized(client, phone, expected):
    resp = await client.post(
        "/api/v1/auth/register", json=_payload(email=f"{expected}@example.com", phone=phone)
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["phone"] == expected


@pytest.mark.parametrize("pincode", ["1234", "1234567", "12a456", "000000"])
async def test_invalid_pincode_rejected(client, pincode):
    address = dict(ADDRESS, pincode=pincode)
    resp = await client.post("/api/v1/auth/register", json=_payload(address=address))
    assert resp.status_code == 422


@pytest.mark.parametrize(
    "email",
    ["notanemail", "abc@gmail", "abc@gmail.com.fake", "abc@notgmail.com"],
)
async def test_invalid_gmail_address_rejected(client, email, monkeypatch):
    from app.core import config

    config.get_settings.cache_clear()
    monkeypatch.setenv("ALLOWED_EMAIL_DOMAINS_PATIENT", "gmail.com")
    config.get_settings.cache_clear()
    try:
        resp = await client.post("/api/v1/auth/register", json=_payload(email=email))
        assert resp.status_code == 422
    finally:
        config.get_settings.cache_clear()


async def test_valid_gmail_address_accepted_case_insensitive(client, monkeypatch):
    from app.core import config

    monkeypatch.setenv("ALLOWED_EMAIL_DOMAINS_PATIENT", "gmail.com")
    config.get_settings.cache_clear()
    try:
        resp = await client.post(
            "/api/v1/auth/register", json=_payload(email="someone@GMAIL.COM")
        )
        assert resp.status_code == 201, resp.text
    finally:
        config.get_settings.cache_clear()


async def test_duplicate_email_rejected_with_generic_message(client):
    resp1 = await client.post("/api/v1/auth/register", json=_payload())
    assert resp1.status_code == 201, resp1.text
    resp2 = await client.post(
        "/api/v1/auth/register", json=_payload(full_name="Someone Else")
    )
    assert resp2.status_code == 422
    message = resp2.json()["error"]["message"]
    assert "already exists" in message.lower()
    assert "Test User" not in message
    assert "PATIENT" not in message


@pytest.mark.parametrize(
    "password",
    ["short1!", "alllowercase1!", "ALLUPPERCASE1!", "NoDigitsHere!", "NoSpecialChars123"],
)
async def test_weak_password_rejected(client, password):
    resp = await client.post("/api/v1/auth/register", json=_payload(password=password))
    assert resp.status_code == 422


async def test_strong_password_accepted(client):
    resp = await client.post(
        "/api/v1/auth/register", json=_payload(password="Str0ng!Pass")
    )
    assert resp.status_code == 201, resp.text
