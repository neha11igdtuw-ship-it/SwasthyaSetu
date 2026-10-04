"""Week-wise antenatal care guide, based on India's MoHFW ANC schedule.

Pure/static domain data — no DB access. Given the patient's current
pregnancy week, returns what she needs to do next: next ANC visit window,
required check-ups/tests, medicine & supplement reminders, vaccination
reminders, and warning signs for her trimester.
"""

TOTAL_WEEKS = 40


def _trimester(week: int) -> int:
    if week <= 12:
        return 1
    if week <= 26:
        return 2
    return 3


# Each stage covers a week range (inclusive) within a trimester, keyed by the
# upper bound of the range it applies to the first time a week <= bound.
_STAGES = [
    {
        "max_week": 12,
        "next_anc_label": "ANC registration visit (by week 12)",
        "checkups": [
            "Blood test: hemoglobin, blood group & Rh factor",
            "Blood test: HIV, Syphilis (VDRL), Hepatitis B",
            "Urine routine test",
            "Blood pressure and weight check",
            "Early (dating) ultrasound scan",
        ],
        "medicines": [
            "Folic acid tablet — once daily",
        ],
        "vaccinations": [
            "Td/Tetanus-Diphtheria 1st dose can start from week 14 — not due yet",
        ],
        "warning_signs": [
            "Heavy vaginal bleeding",
            "Severe abdominal cramping",
            "High fever",
            "Severe vomiting that won't stop",
        ],
    },
    {
        "max_week": 19,
        "next_anc_label": "ANC visit + anomaly scan (week 18–20)",
        "checkups": [
            "Hemoglobin (Hb) recheck",
            "Blood pressure and weight check",
            "Urine routine test",
            "Anomaly (level-2) ultrasound scan — week 18–20",
        ],
        "medicines": [
            "Iron + Folic Acid (IFA) tablet — once daily",
            "Calcium supplement — once daily",
        ],
        "vaccinations": [
            "Td/Tetanus-Diphtheria 1st dose — due now",
        ],
        "warning_signs": [
            "No fetal movement felt yet by week 20",
            "Swelling of face or hands",
            "Severe headache or blurred vision",
            "Vaginal bleeding or fluid leakage",
        ],
    },
    {
        "max_week": 26,
        "next_anc_label": "ANC visit (week 24–26)",
        "checkups": [
            "Hemoglobin (Hb) recheck",
            "Blood pressure and weight check",
            "Urine routine test (check for protein)",
            "Blood sugar test (GCT/OGTT) for gestational diabetes",
        ],
        "medicines": [
            "Iron + Folic Acid (IFA) tablet — once daily",
            "Calcium supplement — once daily",
        ],
        "vaccinations": [
            "Td/Tetanus-Diphtheria 2nd dose — 4 weeks after the 1st dose",
        ],
        "warning_signs": [
            "Reduced fetal movement",
            "Swelling of face, hands, or feet",
            "Severe headache or blurred vision",
            "Vaginal bleeding",
        ],
    },
    {
        "max_week": 32,
        "next_anc_label": "ANC visit (week 30–32)",
        "checkups": [
            "Hemoglobin (Hb) recheck",
            "Blood pressure and weight check",
            "Urine routine test (check for protein)",
            "Growth ultrasound scan",
        ],
        "medicines": [
            "Iron + Folic Acid (IFA) tablet — once daily",
            "Calcium supplement — once daily",
        ],
        "vaccinations": [
            "Confirm both Td doses are complete",
        ],
        "warning_signs": [
            "Reduced fetal movement",
            "Severe swelling of face or hands",
            "Severe headache, blurred vision, or upper abdominal pain",
            "Regular contractions or bleeding before week 37",
        ],
    },
    {
        "max_week": 36,
        "next_anc_label": "ANC visit (week 34–36)",
        "checkups": [
            "Hemoglobin (Hb) recheck",
            "Blood pressure and weight check",
            "Urine routine test (check for protein)",
            "Group B Streptococcus (GBS) screening",
            "Discuss birth plan and nearest facility with delivery services",
        ],
        "medicines": [
            "Iron + Folic Acid (IFA) tablet — once daily",
            "Calcium supplement — once daily",
        ],
        "vaccinations": [
            "No new vaccination due — confirm records are complete",
        ],
        "warning_signs": [
            "Reduced fetal movement",
            "Water breaking or fluid leakage",
            "Regular, painful contractions",
            "Severe headache, blurred vision, or swelling",
        ],
    },
    {
        "max_week": TOTAL_WEEKS,
        "next_anc_label": "Weekly ANC visit until delivery (week 37+)",
        "checkups": [
            "Weekly blood pressure and weight check",
            "Weekly fetal movement and heart rate check",
            "Urine routine test (check for protein)",
            "Discuss signs of labor and facility readiness",
        ],
        "medicines": [
            "Iron + Folic Acid (IFA) tablet — once daily",
            "Calcium supplement — once daily",
        ],
        "vaccinations": [
            "No new vaccination due — confirm records are complete",
        ],
        "warning_signs": [
            "Reduced fetal movement",
            "Water breaking, bleeding, or regular contractions — go to facility immediately",
            "Severe headache, blurred vision, or swelling",
            "Decreased urination",
        ],
    },
]


def get_pregnancy_timeline(week: int) -> dict:
    """Return the ANC guide for a given pregnancy week (clamped to 1–40)."""
    clamped_week = max(1, min(week, TOTAL_WEEKS))
    stage = next(s for s in _STAGES if clamped_week <= s["max_week"])

    return {
        "current_week": clamped_week,
        "total_weeks": TOTAL_WEEKS,
        "trimester": _trimester(clamped_week),
        "weeks_remaining": max(0, TOTAL_WEEKS - clamped_week),
        "next_anc_visit": stage["next_anc_label"],
        "checkups": stage["checkups"],
        "medicines": stage["medicines"],
        "vaccinations": stage["vaccinations"],
        "warning_signs": stage["warning_signs"],
    }
