from unittest.mock import patch

import pytest

from app.core.config import get_settings
from app.schemas.symptom_summary import SymptomSummarizeRequest
from app.services.symptom_summary import SymptomSummaryService

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    # Settings are lru_cache'd; make sure each test's env-var patch is seen.
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


async def test_summarize_success(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    fake_json = (
        '{"reportedSymptoms": ["fever", "cough"], "duration": "3 days", '
        '"severity": "moderate", "additionalContext": "", '
        '"possibleWarningSigns": [], "summary": "Patient reports fever and cough for 3 days.", '
        '"language": "en"}'
    )
    with patch(
        "app.services.symptom_summary._call_gemini_sync", return_value=fake_json
    ) as mocked:
        result = await SymptomSummaryService().summarize(
            SymptomSummarizeRequest(
                transcript="I have had fever and cough for 3 days",
                selected_symptoms=["fever"],
                manual_symptoms=["cough"],
                language="en",
            )
        )
    mocked.assert_called_once()
    assert result.accepted is True
    assert result.transcript == "I have had fever and cough for 3 days"
    assert result.ai_summary_error is None
    assert result.ai_summary is not None
    assert result.ai_summary.reportedSymptoms == ["fever", "cough"]
    assert result.ai_summary.duration == "3 days"


async def test_summarize_invalid_json_from_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    with patch(
        "app.services.symptom_summary._call_gemini_sync",
        return_value="I'm sorry, I cannot help with that.",
    ):
        result = await SymptomSummaryService().summarize(
            SymptomSummarizeRequest(transcript="patient has a headache")
        )
    # Transcript must still be preserved even though the model reply was junk.
    assert result.accepted is True
    assert result.transcript == "patient has a headache"
    assert result.ai_summary is None
    assert result.ai_summary_error is not None


async def test_summarize_preserves_transcript_when_gemini_call_fails(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    with patch(
        "app.services.symptom_summary._call_gemini_sync",
        side_effect=RuntimeError("connection reset"),
    ):
        result = await SymptomSummaryService().summarize(
            SymptomSummarizeRequest(transcript="patient reports vomiting since morning")
        )
    assert result.accepted is True
    assert result.transcript == "patient reports vomiting since morning"
    assert result.ai_summary is None
    assert result.ai_summary_error is not None


async def test_summarize_endpoint_without_api_key_still_accepts_transcript(
    client, auth_headers, monkeypatch
):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    get_settings.cache_clear()
    resp = await client.post(
        "/api/v1/symptoms/summarize",
        json={"transcript": "patient has a sore throat", "selected_symptoms": [], "manual_symptoms": [], "language": "en"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["accepted"] is True
    assert body["transcript"] == "patient has a sore throat"
    assert body["ai_summary"] is None
    assert body["ai_summary_error"]
