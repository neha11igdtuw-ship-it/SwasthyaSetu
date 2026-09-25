"""Gemini-backed preliminary symptom summary.

This calls the Gemini API server-side only. The transcript itself is always
considered "accepted" (saved/acknowledged) regardless of whether the AI
summarization sub-step succeeds — callers must never lose the original
patient transcript just because Gemini timed out, rate-limited, or returned
garbage.
"""

from __future__ import annotations

import asyncio
import json
import logging

import google.generativeai as genai

from app.core.config import get_settings
from app.schemas.symptom_summary import (
    AISymptomSummary,
    SymptomSummarizeRequest,
    SymptomSummarizeResponse,
)
from app.services.duration_extract import resolve_duration

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are assisting with preliminary symptom documentation for a rural \
healthcare application. Your task is to summarize only the symptoms explicitly reported by \
the patient. Rules:
1. Do not diagnose any disease.
2. Do not invent symptoms, duration, severity, or medical history.
3. Do not recommend medicines.
4. Copy duration exactly when the patient mentions relative time, including 'last night', \
'since last night', 'yesterday', 'one day', 'a day', 'this morning', 'कल रात', 'एक दिन', \
or quantified spans like '2 days' / '3 hours'. Use 'Not specified' only when no time \
reference exists.
5. Preserve the user's selected language.
6. Keep the output concise and suitable for review by a health worker or doctor.
7. Clearly flag emergency warning signs only when directly supported by the patient's words.
8. This is an AI-assisted preliminary summary and not a medical diagnosis.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly \
this shape:
{
  "reportedSymptoms": [],
  "duration": "Not specified",
  "severity": "Not specified",
  "additionalContext": "",
  "possibleWarningSigns": [],
  "summary": "",
  "language": "en"
}
"""

_REQUEST_TIMEOUT_SECONDS = 20
_CANDIDATE_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]


def _build_prompt(data: SymptomSummarizeRequest) -> str:
    parts = [
        _SYSTEM_PROMPT,
        "\n---\nPatient transcript (verbatim):",
        data.transcript or "(none provided)",
    ]
    if data.selected_symptoms:
        parts.append(
            f"\nHealth worker/patient-selected symptom checklist: {data.selected_symptoms}"
        )
    if data.manual_symptoms:
        parts.append(f"\nManually added symptoms: {data.manual_symptoms}")
    if data.duration:
        parts.append(f"\nReported duration: {data.duration}")
    if data.severity:
        parts.append(f"\nReported severity: {data.severity}")
    parts.append(f"\nRespond in language code: {data.language}")
    return "\n".join(parts)


def _extract_json(text: str) -> dict:
    text = text.strip()
    # Strip common markdown code-fence wrapping some models add anyway.
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model response")
    return json.loads(text[start : end + 1])


def _call_gemini_sync(api_key: str, prompt: str) -> str:
    genai.configure(api_key=api_key)
    last_exc = None
    for model_name in _CANDIDATE_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = getattr(response, "text", None)
            if text:
                return text
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning("symptom_summary: model %s failed: %s", model_name, exc)
    if last_exc:
        raise last_exc
    raise ValueError("Empty response from Gemini")


def _build_fallback_summary(data: SymptomSummarizeRequest) -> AISymptomSummary:
    reported = list(data.selected_symptoms or []) + list(data.manual_symptoms or [])
    text = (data.transcript or "").strip()

    # Common warning sign keywords in English, Hindi, Marathi
    warning_keywords = [
        "chest pain",
        "bleeding",
        "severe",
        "fainting",
        "high fever",
        "breathlessness",
        "तेज सिरदर्द",
        "धुंधलापन",
        "रक्तस्राव",
        "सांस फूलना",
        "चक्कर",
        "खूप डोकेदुखी",
    ]
    warning_signs = [kw for kw in warning_keywords if kw.lower() in text.lower()]

    # Extract common symptom keywords
    symptom_map = {
        "headache": "Headache",
        "सिरदर्द": "Headache",
        "डोकेदुखी": "Headache",
        "fever": "Fever",
        "बुखार": "Fever",
        "ताप": "Fever",
        "stress": "Stress",
        "स्ट्रेस": "Stress",
        "तणाव": "Stress",
        "dizzy": "Dizziness",
        "चक्कर": "Dizziness",
        "pain": "Pain",
        "दर्द": "Pain",
        "दुखणे": "Pain",
    }
    for kw, label in symptom_map.items():
        if kw in text.lower() and label not in reported:
            reported.append(label)

    duration = resolve_duration(data.duration, text)

    # Severity extraction
    severity = data.severity or "Not specified"
    if severity == "Not specified":
        if any(w in text.lower() for w in ["severe", "tezz", "तेज", "खूप", "high", "bad"]):
            severity = "Severe"
        elif any(w in text.lower() for w in ["mild", "हल्का", "थोडा", "slight"]):
            severity = "Mild"
        elif any(w in text.lower() for w in ["moderate", "medium"]):
            severity = "Moderate"

    summary_text = (
        text if text else (", ".join(reported) if reported else "Reported symptoms recorded.")
    )

    return AISymptomSummary(
        reportedSymptoms=reported if reported else ["Reported Symptom"],
        duration=duration,
        severity=severity,
        additionalContext="Preliminary assessment derived from patient transcript.",
        possibleWarningSigns=warning_signs,
        summary=f"Patient reported: {summary_text}",
        language=data.language or "en",
    )


class SymptomSummaryService:
    async def summarize(self, data: SymptomSummarizeRequest) -> SymptomSummarizeResponse:
        settings = get_settings()

        if not settings.gemini_api_key:
            return SymptomSummarizeResponse(
                transcript=data.transcript,
                ai_summary=None,
                ai_summary_error="AI summary is not configured on this server (missing GEMINI_API_KEY).",
            )

        prompt = _build_prompt(data)
        try:
            raw_text = await asyncio.wait_for(
                asyncio.to_thread(_call_gemini_sync, settings.gemini_api_key, prompt),
                timeout=_REQUEST_TIMEOUT_SECONDS,
            )
        except TimeoutError:
            logger.warning("symptom_summary: Gemini call timed out")
            return SymptomSummarizeResponse(
                transcript=data.transcript,
                ai_summary=None,
                ai_summary_error="AI summary timed out. Please try again.",
            )
        except Exception as exc:  # noqa: BLE001 - broad by design
            message = str(exc)
            if "429" in message or "rate" in message.lower() or "quota" in message.lower():
                error = "AI summary is temporarily rate-limited. Please try again shortly."
            else:
                error = f"AI summary could not be generated right now: {message}"
            logger.warning("symptom_summary: Gemini call failed: %s", message)
            return SymptomSummarizeResponse(
                transcript=data.transcript,
                ai_summary=None,
                ai_summary_error=error,
            )

        try:
            parsed = _extract_json(raw_text)
            summary = AISymptomSummary.model_validate(parsed)
        except Exception as exc:  # noqa: BLE001 - malformed/invalid JSON from model
            logger.warning("symptom_summary: invalid JSON from Gemini: %s", exc)
            return SymptomSummarizeResponse(
                transcript=data.transcript,
                ai_summary=None,
                ai_summary_error="AI summary response was invalid and could not be parsed.",
            )

        filled_duration = resolve_duration(summary.duration, data.transcript)
        if filled_duration != summary.duration:
            summary = summary.model_copy(update={"duration": filled_duration})

        return SymptomSummarizeResponse(
            transcript=data.transcript,
            ai_summary=summary,
            ai_summary_error=None,
        )
