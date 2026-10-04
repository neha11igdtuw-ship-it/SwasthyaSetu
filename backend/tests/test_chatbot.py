"""AI Health Assistant: auth, validation, redirects, Gemini plumbing, errors."""

from unittest.mock import patch

import pytest

from app.core.config import get_settings
from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService
from app.services.chatbot_service import SYSTEM_PROMPT, UNAVAILABLE_MESSAGE

pytestmark = pytest.mark.asyncio

URL = "/api/v1/chatbot/chat"
GEN = "app.services.chatbot_service._generate_sync"


@pytest.fixture(autouse=True)
def _gemini_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


async def _patient_headers(client, db_session, facility, email="chat@example.com"):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name="Chat Patient",
            role=Role.PATIENT,
            facility_id=facility.id,
        )
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "StrongPass123!"}
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_requires_authentication(client):
    resp = await client.post(URL, json={"message": "What is diabetes?"})
    assert resp.status_code == 401


@pytest.mark.parametrize("message", ["", "   ", "\n\t"])
async def test_empty_message_rejected(client, auth_headers, message):
    with patch(GEN) as gen:
        resp = await client.post(URL, json={"message": message}, headers=auth_headers)
    assert resp.status_code == 422
    gen.assert_not_called()


async def test_invalid_conversation_id_rejected(client, auth_headers):
    resp = await client.post(
        URL, json={"message": "hi", "conversation_id": "bad id!/"}, headers=auth_headers
    )
    assert resp.status_code == 422


async def test_chat_returns_model_reply_and_conversation_id(client, db_session, facility):
    headers = await _patient_headers(client, db_session, facility)
    with patch(GEN, return_value="Hypertension means high blood pressure.") as gen:
        resp = await client.post(
            URL,
            json={"message": "What is hypertension?", "conversation_id": "abc-123"},
            headers=headers,
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["response"] == "Hypertension means high blood pressure."
    assert body["conversation_id"] == "abc-123"
    assert body["redirect"] is None
    gen.assert_called_once()


async def test_conversation_id_generated_when_missing(client, auth_headers):
    with patch(GEN, return_value="ok"):
        resp = await client.post(URL, json={"message": "What is anemia?"}, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["conversation_id"]) >= 8


async def test_history_is_passed_for_follow_up_context(client, auth_headers):
    history = [
        {"role": "user", "content": "What is anemia?"},
        {"role": "assistant", "content": "Anemia means low red blood cells."},
    ]
    with patch(GEN, return_value="Iron-rich foods help.") as gen:
        resp = await client.post(
            URL,
            json={"message": "What foods help prevent it?", "history": history},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    _key, _system, sent_history, message = gen.call_args.args
    assert message == "What foods help prevent it?"
    assert [t["role"] for t in sent_history] == ["user", "model"]
    assert "anemia" in sent_history[0]["parts"][0].lower()


async def test_model_only_receives_chat_text_not_patient_data(client, db_session, facility):
    headers = await _patient_headers(client, db_session, facility, email="priv@example.com")
    with patch(GEN, return_value="ok") as gen:
        await client.post(URL, json={"message": "What is a balanced diet?"}, headers=headers)
    _key, system, history, message = gen.call_args.args
    blob = f"{system} {history} {message}".lower()
    for forbidden in ("chat patient", "priv@example.com", "priya", "sunita", "9876500111"):
        assert forbidden not in blob


@pytest.mark.parametrize(
    "message,path",
    [
        ("Book me a doctor", "/patient/appointments"),
        ("Find a hospital near me", "/patient/facilities"),
        ("Create a referral for me", "/patient/referrals"),
        ("Is the medicine available near me?", "/patient/medicines"),
        ("I need an ambulance", "/patient/emergency-help"),
        ("show my vitals", "/patient/records"),
    ],
)
async def test_workflow_requests_redirect_without_calling_ai(client, auth_headers, message, path):
    with patch(GEN) as gen:
        resp = await client.post(URL, json={"message": message}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["redirect"]["path"] == path
    gen.assert_not_called()


async def test_redirect_text_is_hindi_for_devanagari(client, auth_headers):
    with patch(GEN) as gen:
        resp = await client.post(URL, json={"message": "अपॉइंटमेंट बुक करो"}, headers=auth_headers)
    assert resp.json()["redirect"]["path"] == "/patient/appointments"
    assert "अपॉइंटमेंट" in resp.json()["response"]
    gen.assert_not_called()


@pytest.mark.parametrize(
    "message",
    ["What is a referral?", "BP kya hota hai?", "Explain diabetes in Hindi.", "मधुमेह क्या है"],
)
async def test_education_questions_go_to_the_model(client, auth_headers, message):
    with patch(GEN, return_value="answer") as gen:
        resp = await client.post(URL, json={"message": message}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["redirect"] is None
    gen.assert_called_once()


async def test_ai_failure_returns_generic_503_without_leaking(client, auth_headers):
    with patch(GEN, side_effect=RuntimeError("boom test-secret-key traceback")):
        resp = await client.post(URL, json={"message": "What is ECG?"}, headers=auth_headers)
    assert resp.status_code == 503
    assert resp.json()["error"]["message"] == UNAVAILABLE_MESSAGE
    assert "test-secret-key" not in resp.text
    assert "boom" not in resp.text


async def test_missing_api_key_returns_generic_503(client, auth_headers, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    get_settings.cache_clear()
    resp = await client.post(URL, json={"message": "What is ECG?"}, headers=auth_headers)
    assert resp.status_code == 503
    assert resp.json()["error"]["message"] == UNAVAILABLE_MESSAGE
    assert "GEMINI" not in resp.text


async def test_user_rate_limited(client, auth_headers, monkeypatch):
    from app.api.routes import chatbot as chatbot_route
    from app.core.ratelimit import RateLimiter

    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    get_settings.cache_clear()
    monkeypatch.setattr(chatbot_route, "_chat_limiter", RateLimiter(2, 60, "test"))
    with patch(GEN, return_value="ok"):
        codes = [
            (
                await client.post(URL, json={"message": "What is ECG?"}, headers=auth_headers)
            ).status_code
            for _ in range(3)
        ]
    assert codes == [200, 200, 429]


def test_system_prompt_enforces_scope_and_safety():
    lowered = SYSTEM_PROMPT.lower()
    for phrase in ("never diagnose", "not a doctor", "myth", "hinglish", "emergency help"):
        assert phrase in lowered
