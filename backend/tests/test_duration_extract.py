from unittest.mock import patch

import pytest

from app.core.config import get_settings
from app.schemas.symptom_summary import SymptomSummarizeRequest
from app.services.duration_extract import extract_duration, resolve_duration
from app.services.symptom_summary import SymptomSummaryService, _build_fallback_summary


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("I have had a severe headache since last night", "since last night"),
        ("headache last night and dizziness", "last night"),
        ("pain for one day", "one day"),
        ("fever for 2 days", "for 2 days"),
        ("मुझे कल रात से तेज सिरदर्द है", "कल रात से"),
        ("मला काल रात्रीपासून डोकेदुखी आहे", "काल रात्रीपासून"),
        ("no time mentioned at all", None),
    ],
)
def test_extract_duration_phrases(text, expected):
    assert extract_duration(text) == expected


def test_resolve_duration_fills_unspecified():
    assert resolve_duration("Not specified", "vomiting since last night") == "since last night"
    assert resolve_duration("3 days", "vomiting since last night") == "3 days"


def test_fallback_summary_detects_last_night():
    summary = _build_fallback_summary(
        SymptomSummarizeRequest(
            transcript="I have had a severe headache since last night and feel dizzy",
            language="en",
        )
    )
    assert summary.duration == "since last night"
    assert "Headache" in summary.reportedSymptoms


async def test_summarize_overlays_duration_when_model_omits_it(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    get_settings.cache_clear()
    fake_json = (
        '{"reportedSymptoms": ["headache"], "duration": "Not specified", '
        '"severity": "severe", "additionalContext": "", '
        '"possibleWarningSigns": [], "summary": "Patient reports headache.", '
        '"language": "en"}'
    )
    with patch("app.services.symptom_summary._call_gemini_sync", return_value=fake_json):
        result = await SymptomSummaryService().summarize(
            SymptomSummarizeRequest(
                transcript="severe headache since last night",
                language="en",
            )
        )
    assert result.ai_summary is not None
    assert result.ai_summary.duration == "since last night"
