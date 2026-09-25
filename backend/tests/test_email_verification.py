import pytest
from sqlalchemy import select

from app.models.verification import EmailVerificationToken

pytestmark = pytest.mark.asyncio

ADDRESS = {
    "address_line": "12 MG Road",
    "village_area": "Rampur Village",
    "city_district": "Barabanki",
    "state": "Uttar Pradesh",
    "pincode": "225001",
}


async def _register(client, email="verify-me@example.com"):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "StrongPass123!",
            "full_name": "Verify Me",
            "role": "PATIENT",
            "phone": "9876543210",
            "address": ADDRESS,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _raw_token_for(db_session, email: str) -> str:
    """Tests can't read the emailed link (SMTP isn't wired up in-process),
    so mint a fresh token the same way VerificationService.issue does and
    read it back via the hash — used only to exercise consume()/expiry."""
    import hashlib
    import secrets
    from datetime import datetime, timedelta

    from app.models.user import User

    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    raw = secrets.token_urlsafe(32)
    token = EmailVerificationToken(
        user_id=user.id,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db_session.add(token)
    await db_session.commit()
    return raw


async def test_verify_email_activates_account_and_allows_login(client, db_session):
    await _register(client, "verify-me@example.com")
    raw = await _raw_token_for(db_session, "verify-me@example.com")

    resp = await client.post("/api/v1/auth/verify-email", json={"token": raw})
    assert resp.status_code == 200, resp.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "verify-me@example.com", "password": "StrongPass123!"},
    )
    assert login.status_code == 200, login.text


async def test_verify_email_token_is_single_use(client, db_session):
    await _register(client, "single-use@example.com")
    raw = await _raw_token_for(db_session, "single-use@example.com")

    first = await client.post("/api/v1/auth/verify-email", json={"token": raw})
    assert first.status_code == 200

    second = await client.post("/api/v1/auth/verify-email", json={"token": raw})
    assert second.status_code == 422


async def test_verify_email_rejects_expired_token(client, db_session):
    import hashlib
    import secrets
    from datetime import datetime, timedelta

    from app.models.user import User

    await _register(client, "expired@example.com")
    result = await db_session.execute(select(User).where(User.email == "expired@example.com"))
    user = result.scalar_one()
    raw = secrets.token_urlsafe(32)
    token = EmailVerificationToken(
        user_id=user.id,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=datetime.utcnow() - timedelta(hours=1),
    )
    db_session.add(token)
    await db_session.commit()

    resp = await client.post("/api/v1/auth/verify-email", json={"token": raw})
    assert resp.status_code == 422


async def test_verify_email_rejects_garbage_token(client):
    resp = await client.post("/api/v1/auth/verify-email", json={"token": "not-a-real-token"})
    assert resp.status_code == 422


async def test_resend_verification_returns_202_regardless_of_email_existing(client):
    known = await client.post(
        "/api/v1/auth/resend-verification", json={"email": "unknown@example.com"}
    )
    assert known.status_code == 202
    body = known.json()
    assert "message" in body


async def test_login_before_verification_returns_email_not_verified(client):
    await _register(client, "unverified@example.com")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "unverified@example.com", "password": "StrongPass123!"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"
