"""Mock doctor-availability and services dataset for nearby facilities.

OpenStreetMap has no reliable data on which doctor is on duty, what hours
they work, or which departments/services a facility offers "right now" — so
this module fills that gap with a deterministic mock dataset. It is seeded
per facility name so the same facility always reports the same roster
(stable across repeated searches / map refreshes), but availability
("is a doctor on duty right now") is computed live against the current
time, so a search at 9 AM and a search at 9 PM for the same hospital can
correctly report different results.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, time
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
ALL_DAYS = tuple(range(7))
WEEKDAYS_ONLY = (0, 1, 2, 3, 4, 5)  # Mon-Sat


@dataclass(frozen=True)
class ShiftTemplate:
    name: str
    specialization: str
    days: tuple[int, ...]
    start: time
    end: time


# Shift pools per normalized facility type. Each facility gets a stable
# subset of these (seeded by name) rather than every facility sharing an
# identical roster.
DOCTOR_POOL_BY_TYPE: dict[str, list[ShiftTemplate]] = {
    "hospital": [
        ShiftTemplate("Dr. Ramesh Gupta", "General Medicine", ALL_DAYS, time(9, 0), time(17, 0)),
        ShiftTemplate(
            "Dr. Kavita Sharma", "Gynecology & Obstetrics", WEEKDAYS_ONLY, time(9, 0), time(15, 0)
        ),
        ShiftTemplate("Dr. Arvind Yadav", "Orthopedics", WEEKDAYS_ONLY, time(10, 0), time(18, 0)),
        ShiftTemplate("Dr. Nisha Verma", "Pediatrics", ALL_DAYS, time(8, 0), time(14, 0)),
        ShiftTemplate(
            "Dr. Sanjay Mishra", "Emergency Medicine", ALL_DAYS, time(0, 0), time(23, 59)
        ),
        ShiftTemplate(
            "Dr. Pooja Tiwari", "Pathology & Lab Medicine", WEEKDAYS_ONLY, time(9, 0), time(16, 0)
        ),
        ShiftTemplate("Dr. Manoj Singh", "General Surgery", (0, 2, 4, 5), time(11, 0), time(19, 0)),
        ShiftTemplate("Dr. Farah Khan", "Anesthesiology", WEEKDAYS_ONLY, time(9, 0), time(17, 0)),
    ],
    "clinic": [
        ShiftTemplate(
            "Dr. Alok Pandey", "General Physician", WEEKDAYS_ONLY, time(10, 0), time(20, 0)
        ),
        ShiftTemplate(
            "Dr. Shalini Rao", "Family Medicine", WEEKDAYS_ONLY, time(9, 30), time(14, 0)
        ),
        ShiftTemplate("Dr. Vikram Chauhan", "Dermatology", (1, 3, 5), time(11, 0), time(17, 0)),
        ShiftTemplate("Dr. Anjali Bose", "ENT", (0, 2, 4), time(10, 0), time(16, 0)),
    ],
    "doctors": [
        ShiftTemplate(
            "Dr. Suresh Nair", "General Physician", WEEKDAYS_ONLY, time(9, 0), time(18, 0)
        ),
        ShiftTemplate(
            "Dr. Ritu Agarwal", "General Physician", WEEKDAYS_ONLY, time(10, 0), time(19, 0)
        ),
    ],
}

SERVICES_BY_TYPE: dict[str, list[str]] = {
    "hospital": [
        "Emergency Care",
        "General Medicine",
        "Gynecology & Maternity",
        "Pediatrics",
        "Orthopedics",
        "Pathology Lab",
        "Blood Bank",
        "Ultrasound / Imaging",
        "Pharmacy",
        "Ambulance",
    ],
    "clinic": [
        "General Consultation",
        "Minor Procedures",
        "Vaccination",
        "Pharmacy",
        "Basic Diagnostics",
    ],
    "doctors": [
        "General Consultation",
        "Pharmacy",
    ],
}

DEFAULT_TYPE = "clinic"


def _normalize_type(facility_type: str | None) -> str:
    if not facility_type:
        return DEFAULT_TYPE
    key = facility_type.strip().lower()
    if key in DOCTOR_POOL_BY_TYPE:
        return key
    if "hospital" in key:
        return "hospital"
    if "doctor" in key:
        return "doctors"
    return DEFAULT_TYPE


def _seeded_rng(facility_name: str) -> random.Random:
    # Stable per-name seed so the same facility always gets the same roster.
    return random.Random(f"swasthyasetu-facility::{facility_name}")


def _format_hours(shift: ShiftTemplate) -> str:
    return f"{shift.start.strftime('%I:%M %p').lstrip('0')} – {shift.end.strftime('%I:%M %p').lstrip('0')}"


def _is_on_duty(shift: ShiftTemplate, at: datetime) -> bool:
    if at.weekday() not in shift.days:
        return False
    current = at.time()
    return shift.start <= current <= shift.end


def get_facility_availability(
    facility_name: str,
    facility_type: str | None,
    at: datetime | None = None,
) -> dict:
    """Return a stable-per-facility, live-per-time availability snapshot.

    `at` defaults to the current time in IST — the same facility will report
    different doctors/status depending on when the caller searches, which is
    the whole point (e.g. a 9 AM search vs. a 9 PM search).
    """
    check_time = (at or datetime.now(IST)).astimezone(IST)
    norm_type = _normalize_type(facility_type)
    rng = _seeded_rng(facility_name)

    doctor_pool = DOCTOR_POOL_BY_TYPE.get(norm_type, DOCTOR_POOL_BY_TYPE["clinic"])
    roster_size = min(len(doctor_pool), rng.randint(2, 4))
    roster = rng.sample(doctor_pool, roster_size)

    services_pool = SERVICES_BY_TYPE.get(norm_type, SERVICES_BY_TYPE["clinic"])
    services_lower_bound = min(3, len(services_pool))
    services_size = rng.randint(services_lower_bound, len(services_pool))
    services = rng.sample(services_pool, services_size)

    doctors = []
    any_on_duty = False
    for shift in roster:
        on_duty = _is_on_duty(shift, check_time)
        any_on_duty = any_on_duty or on_duty
        doctors.append(
            {
                "name": shift.name,
                "specialization": shift.specialization,
                "on_duty_now": on_duty,
                "days": [WEEKDAY_NAMES[d] for d in shift.days],
                "hours": _format_hours(shift),
            }
        )

    # Doctors on duty first, so the UI can lead with who's actually available.
    doctors.sort(key=lambda d: d["on_duty_now"], reverse=True)

    return {
        "doctor_status": "Available" if any_on_duty else "Unavailable",
        "doctors": doctors,
        "services_available": sorted(services),
        "checked_at": check_time.isoformat(),
    }
