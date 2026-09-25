import pytest

from app.api.routes import auth as auth_routes

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _enable_rate_limiting(monkeypatch):
    """conftest disables rate limiting globally for the rest of the suite;
    re-enable it just for these tests and reset the shared limiter buckets
    so earlier tests in the run don't bleed in."""
    from app.core import config

    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    config.get_settings.cache_clear()
    auth_routes._login_limiter.reset()
    yield
    config.get_settings.cache_clear()
    auth_routes._login_limiter.reset()


async def test_login_rate_limited_after_threshold(client):
    for _ in range(10):
        resp = await client.post(
            "/api/v1/auth/login", json={"email": "flood@example.com", "password": "wrong"}
        )
        assert resp.status_code == 401

    resp = await client.post(
        "/api/v1/auth/login", json={"email": "flood@example.com", "password": "wrong"}
    )
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in resp.headers
