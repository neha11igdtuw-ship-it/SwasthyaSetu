"""Care-pathway classification for new-patient onboarding.

This does NOT diagnose the patient. It only buckets the patient's own
free-text (or voice-transcribed) description of why they are seeking care
into one of the application's existing care-pathway categories, so the
onboarding UI can suggest a pathway for the patient to confirm or change.

Mirrors the existing `symptom_summary.py` pattern: try the configured AI
provider (Gemini) first, but ALWAYS fall back to a deterministic, offline
keyword classifier if the AI call is unavailable, mis-configured, times out,
or returns something unusable. The classifier must never be a hard
dependency for onboarding to work.
"""

from __future__ import annotations

import asyncio
import json
import logging

from app.core.config import get_settings
from app.schemas.care_pathway import CarePathwayClassification

logger = logging.getLogger(__name__)

# Canonical pathway values — must exactly match src/lib/carePathways.ts and
# the values already accepted by PATCH /patients/me (care_pathway is a plain
# string column, see backend/app/models/patient.py). Do not invent a second
# representation (e.g. enum) that would produce a mismatched value.
GENERAL = "General Primary Care"
MATERNAL = "Maternal Care"
CHILD = "Child Care"
CHRONIC = "Chronic Care"
EMERGENCY = "Emergency"
OTHER = "Other"

VALID_PATHWAYS = {GENERAL, MATERNAL, CHILD, CHRONIC, EMERGENCY, OTHER}

_REQUEST_TIMEOUT_SECONDS = 12
_CANDIDATE_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b"]

_SYSTEM_PROMPT = """You are helping route a rural healthcare patient to the right care \
pathway inside an app. You are NOT diagnosing any disease. You are only classifying the \
patient's own description of why they are seeking care into exactly one of these \
categories:
- "General Primary Care"
- "Maternal Care"
- "Child Care"
- "Chronic Care"
- "Emergency"
- "Other"

Rules:
1. Do not diagnose. Do not suggest medicines or treatments.
2. Never default to "Maternal Care" unless the patient's own words indicate pregnancy or \
a maternal-health concern.
3. If the description suggests an immediately life-threatening situation (e.g. unconscious, \
not breathing, severe/uncontrolled bleeding, chest pain, seizure, major injury), classify as \
"Emergency".
4. If unsure, prefer "General Primary Care" over guessing a more specific category.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly \
this shape:
{
  "care_pathway": "General Primary Care",
  "confidence": 0.0,
  "reason": "one short sentence explaining the classification, referencing only what the \
patient said"
}
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
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
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    last_exc: Exception | None = None
    for model_name in _CANDIDATE_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = getattr(response, "text", None)
            if text:
                return text
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning("care_pathway_classifier: model %s failed: %s", model_name, exc)
    if last_exc:
        raise last_exc
    raise ValueError("Empty response from Gemini")


# ---------------------------------------------------------------------------
# Deterministic fallback — keyword based, safe, no medical claims. This is
# the ONLY classifier used when no AI provider is configured, and is always
# used if the AI call fails, so onboarding never breaks.
# ---------------------------------------------------------------------------

_EMERGENCY_KEYWORDS = [
    "unconscious", "not breathing", "cannot breathe", "can't breathe",
    "severe bleeding", "heavy bleeding", "chest pain", "seizure", "convuls",
    "accident", "poison", "unresponsive",
]
_MATERNAL_KEYWORDS = [
    "pregnan", "expecting a baby", "delivery", "labour", "labor pain",
    "गर्भवती", "गरोदर",
]
_CHILD_KEYWORDS = [
    "my child", "my son", "my daughter", "my baby", "infant", "toddler",
    "बच्चा", "बच्चे",
]
_CHRONIC_KEYWORDS = [
    "diabetes", "blood pressure", "hypertension", "asthma", "thyroid",
    "kidney", "heart disease", "chronic", "long term", "ongoing treatment",
    "regular checkup",
]


def _keyword_classify(description: str) -> CarePathwayClassification:
    text = (description or "").lower()

    def has(words: list[str]) -> bool:
        return any(w in text for w in words)

    if has(_EMERGENCY_KEYWORDS):
        return CarePathwayClassification(
            care_pathway=EMERGENCY,
            confidence=0.9,
            reason="The description mentions symptoms that may need immediate emergency attention.",
        )
    if has(_MATERNAL_KEYWORDS):
        return CarePathwayClassification(
            care_pathway=MATERNAL,
            confidence=0.75,
            reason="The description mentions pregnancy-related care.",
        )
    if has(_CHILD_KEYWORDS):
        return CarePathwayClassification(
            care_pathway=CHILD,
            confidence=0.7,
            reason="The description mentions a child's health.",
        )
    if has(_CHRONIC_KEYWORDS):
        return CarePathwayClassification(
            care_pathway=CHRONIC,
            confidence=0.65,
            reason="The description mentions an ongoing/chronic condition.",
        )
    if not text.strip():
        return CarePathwayClassification(
            care_pathway=GENERAL,
            confidence=0.3,
            reason="No description provided; defaulting to general care for you to confirm.",
        )
    return CarePathwayClassification(
        care_pathway=GENERAL,
        confidence=0.55,
        reason="The description sounds like a general health concern.",
    )


class CarePathwayClassifierService:
    async def classify(self, description: str, language: str = "en") -> CarePathwayClassification:
        settings = get_settings()

        if not settings.gemini_api_key:
            return _keyword_classify(description)

        prompt = f"{_SYSTEM_PROMPT}\n---\nPatient's own description (language code: {language}):\n{description}"
        try:
            raw_text = await asyncio.wait_for(
                asyncio.to_thread(_call_gemini_sync, settings.gemini_api_key, prompt),
                timeout=_REQUEST_TIMEOUT_SECONDS,
            )
            parsed = _extract_json(raw_text)
            pathway = parsed.get("care_pathway")
            if pathway not in VALID_PATHWAYS:
                raise ValueError(f"Model returned an unrecognized pathway: {pathway!r}")
            confidence = float(parsed.get("confidence", 0.6))
            confidence = max(0.0, min(1.0, confidence))
            reason = str(parsed.get("reason") or "Classified from the patient's description.")
            return CarePathwayClassification(
                care_pathway=pathway,
                confidence=confidence,
                reason=reason,
            )
        except Exception as exc:  # noqa: BLE001 - any AI failure falls back deterministically
            logger.warning("care_pathway_classifier: AI classification failed, using fallback: %s", exc)
            return _keyword_classify(description)
