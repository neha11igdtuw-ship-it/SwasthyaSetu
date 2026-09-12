"""Extract spoken/typed symptom duration phrases (EN / HI / MR)."""

from __future__ import annotations

import re

_UNSPECIFIED = {"", "not specified", "उल्लेख नहीं", "नमूद नाही"}

_RELATIVE: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bsince\s+last\s+night\b", re.I), "since last night"),
    (re.compile(r"\blast\s+night\b", re.I), "last night"),
    (re.compile(r"\byesterday\s+night\b", re.I), "yesterday night"),
    (re.compile(r"\bsince\s+yesterday\b", re.I), "since yesterday"),
    (re.compile(r"\byesterday\b", re.I), "yesterday"),
    (re.compile(r"\bsince\s+this\s+morning\b", re.I), "since this morning"),
    (re.compile(r"\bthis\s+morning\b", re.I), "this morning"),
    (re.compile(r"\bsince\s+morning\b", re.I), "since morning"),
    (re.compile(r"\bsince\s+this\s+evening\b", re.I), "since this evening"),
    (re.compile(r"\bthis\s+evening\b", re.I), "this evening"),
    (re.compile(r"\bsince\s+evening\b", re.I), "since evening"),
    (re.compile(r"\ball\s+day\b", re.I), "all day"),
    (re.compile(r"\ba\s+few\s+hours?\b", re.I), "a few hours"),
    (re.compile(r"\bfew\s+hours?\b", re.I), "few hours"),
    (re.compile(r"\bfor\s+a\s+day\b", re.I), "for a day"),
    (re.compile(r"\bone\s+day\b", re.I), "one day"),
    (re.compile(r"\ba\s+day\b", re.I), "one day"),
    (re.compile(r"कल\s*रात\s*से"), "कल रात से"),
    (re.compile(r"कल\s*रात"), "कल रात"),
    (re.compile(r"पिछली\s*रात\s*से"), "पिछली रात से"),
    (re.compile(r"पिछली\s*रात"), "पिछली रात"),
    (re.compile(r"रात\s*से"), "रात से"),
    (re.compile(r"कल\s*से"), "कल से"),
    (re.compile(r"आज\s*सुबह\s*से"), "आज सुबह से"),
    (re.compile(r"सुबह\s*से"), "सुबह से"),
    (re.compile(r"शाम\s*से"), "शाम से"),
    (re.compile(r"एक\s*दिन\s*से"), "एक दिन से"),
    (re.compile(r"एक\s*दिन"), "एक दिन"),
    (re.compile(r"दो\s*दिनों?\s*से"), "दो दिनों से"),
    (re.compile(r"कुछ\s*घंट[ेों]"), "कुछ घंटे"),
    (re.compile(r"एक\s*हफ्ते\s*से"), "एक हफ्ते से"),
    (re.compile(r"एक\s*सप्ताह"), "एक सप्ताह"),
    (re.compile(r"काल\s*रात्रीपासून"), "काल रात्रीपासून"),
    (re.compile(r"काल\s*रात्री"), "काल रात्री"),
    (re.compile(r"सकाळीपासून"), "सकाळीपासून"),
    (re.compile(r"एक\s*दिवस"), "एक दिवस"),
]

_QUANTIFIED = re.compile(
    r"(?:for|since|from)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)"
    r"\s*(?:days?|weeks?|months?|hours?|minutes?|दिनों?|दिन|हफ़्त[ेों]|हफ्त[ेों]|सप्ताह|महीन[ेों]|घंट[ेों]|दिवस)",
    re.I,
)


def is_unspecified_duration(value: str | None) -> bool:
    return (value or "").strip().lower() in _UNSPECIFIED


def extract_duration(text: str | None) -> str | None:
    raw = (text or "").strip()
    if not raw:
        return None
    for pattern, label in _RELATIVE:
        if pattern.search(raw):
            return label
    match = _QUANTIFIED.search(raw)
    if match:
        return match.group(0).strip()
    return None


def resolve_duration(preferred: str | None, transcript: str) -> str:
    if preferred and not is_unspecified_duration(preferred):
        return preferred.strip()
    extracted = extract_duration(transcript)
    if extracted:
        return extracted
    return (preferred or "").strip() or "Not specified"
