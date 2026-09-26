"""Import the MOCK/DEMO doctor dataset (backend/data/mock_doctors.csv and
backend/data/mock_doctor_availability.csv) into the existing doctor
architecture: `User` (role=DOCTOR) + `DoctorProfile` + `DoctorAvailability`.

============================================================================
THESE ARE FICTIONAL, DEVELOPMENT-ONLY RECORDS.
They do not represent real healthcare professionals or real-world
availability. Every imported doctor/profile row is tagged
source_dataset = "MOCK_DEMO_DOCTORS" so it can be identified and excluded
from any production/real-data view.
============================================================================

Facility mapping (IMPORTANT): this script does NOT assume fixed facility
IDs like FAC001. It queries the REAL `facilities` table at import time:
  1. For each doctor, look for an active facility whose `capabilities`
     column mentions the doctor's speciality (case-insensitive substring).
  2. If no capability match exists, round-robin assign across ALL active
     facilities currently in the database (deterministic order by id).
  3. If there are ZERO facilities in the database, the doctor is SKIPPED
     (counted in the summary) — a fake facility is never created just to
     satisfy the mock doctor mapping.

Usage:
    python -m scripts.import_mock_doctors \
        [--doctors-csv backend/data/mock_doctors.csv] \
        [--availability-csv backend/data/mock_doctor_availability.csv]

Idempotent: re-running updates existing rows (matched by
source_dataset + source_record_id / doctor email) rather than duplicating.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.enums import Role  # noqa: E402
from app.models.facility import Facility  # noqa: E402
from app.models.staff import DoctorAvailability, DoctorProfile  # noqa: E402
from app.models.user import User  # noqa: E402

SOURCE_DATASET = "MOCK_DEMO_DOCTORS"
DAY_NAME_TO_INDEX = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6,
}


@dataclass
class ImportSummary:
    doctors_read: int = 0
    doctors_inserted: int = 0
    doctors_updated: int = 0
    doctors_skipped_no_facility: int = 0
    facility_capability_matches: int = 0
    facility_round_robin_assignments: int = 0
    availability_read: int = 0
    availability_inserted: int = 0
    availability_updated: int = 0
    availability_skipped_unknown_doctor: int = 0
    availability_skipped_facility_mismatch: int = 0
    specialities_seen: set = field(default_factory=set)


async def _get_active_facilities(db) -> list[Facility]:
    result = await db.execute(select(Facility).where(Facility.is_active.is_(True)).order_by(Facility.id))
    return list(result.scalars().all())


def _find_facility_for_speciality(facilities: list[Facility], speciality: str) -> Facility | None:
    speciality_lower = speciality.lower()
    for f in facilities:
        if f.capabilities and speciality_lower in f.capabilities.lower():
            return f
    return None


async def import_doctors(doctors_csv: Path, summary: ImportSummary) -> dict[str, "User"]:
    """Returns a map of source_record_id -> User for use by the
    availability import step."""
    doctor_user_by_source_id: dict[str, User] = {}

    async with AsyncSessionLocal() as db:
        facilities = await _get_active_facilities(db)
        if not facilities:
            print(
                "WARNING: no active facilities found in the database. "
                "Import the government facility datasets (scripts/import_facilities.py) "
                "first, or seed at least one facility — mock doctors cannot be mapped "
                "to a facility that doesn't exist, and none will be fabricated."
            )

        with open(doctors_csv, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            rows = list(reader)

        for idx, row in enumerate(rows):
            summary.doctors_read += 1
            source_record_id = row["source_record_id"].strip()
            speciality = row.get("speciality", "").strip()
            summary.specialities_seen.add(speciality)

            if not facilities:
                summary.doctors_skipped_no_facility += 1
                continue

            facility = _find_facility_for_speciality(facilities, row.get("preferred_speciality_keyword", speciality))
            if facility:
                summary.facility_capability_matches += 1
            else:
                facility = facilities[idx % len(facilities)]
                summary.facility_round_robin_assignments += 1

            email = row["email"].strip()
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            if user is None:
                user = User(
                    email=email,
                    hashed_password=hash_password("MockDemoDoctor#2026"),
                    full_name=row["doctor_name"].strip(),
                    role=Role.DOCTOR,
                    phone=row.get("phone", "").strip() or None,
                    facility_id=facility.id,
                    is_active=(row.get("status", "Active").strip() == "Active"),
                )
                db.add(user)
                await db.flush()
                summary.doctors_inserted += 1
            else:
                user.full_name = row["doctor_name"].strip()
                user.phone = row.get("phone", "").strip() or None
                user.facility_id = facility.id
                user.is_active = row.get("status", "Active").strip() == "Active"
                summary.doctors_updated += 1

            result = await db.execute(
                select(DoctorProfile).where(
                    DoctorProfile.source_dataset == SOURCE_DATASET,
                    DoctorProfile.source_record_id == source_record_id,
                )
            )
            profile = result.scalar_one_or_none()
            profile_fields = dict(
                user_id=user.id,
                facility_id=facility.id,
                speciality=speciality or None,
                qualification=row.get("qualification", "").strip() or None,
                experience_years=int(row["experience_years"]) if row.get("experience_years") else None,
                languages=row.get("languages", "").strip() or None,
                status=row.get("status", "Active").strip(),
                source_dataset=SOURCE_DATASET,
                source_record_id=source_record_id,
            )
            if profile is None:
                profile = DoctorProfile(**profile_fields)
                db.add(profile)
            else:
                for k, v in profile_fields.items():
                    setattr(profile, k, v)

            doctor_user_by_source_id[source_record_id] = user

        await db.commit()

    return doctor_user_by_source_id


def _next_occurrence(day_of_week: str, start_hhmm: str) -> datetime:
    """Computes the next upcoming datetime (within the next 7 days) for a
    weekly-template day/time — used to turn the mock 'Monday 10:00-14:00'
    style template rows into concrete, bookable DoctorAvailability slots."""
    target_idx = DAY_NAME_TO_INDEX[day_of_week]
    now = datetime.utcnow()
    hour, minute = (int(p) for p in start_hhmm.split(":"))
    days_ahead = (target_idx - now.weekday()) % 7
    candidate = (now + timedelta(days=days_ahead)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=7)
    return candidate


async def import_availability(
    availability_csv: Path, doctor_user_by_source_id: dict[str, "User"], summary: ImportSummary
) -> None:
    async with AsyncSessionLocal() as db:
        # Re-fetch DoctorProfiles for facility-consistency checks.
        result = await db.execute(
            select(DoctorProfile).where(DoctorProfile.source_dataset == SOURCE_DATASET)
        )
        profile_by_source_id = {p.source_record_id: p for p in result.scalars().all()}

        with open(availability_csv, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            rows = list(reader)

        for row in rows:
            summary.availability_read += 1
            doctor_source_id = row["doctor_source_record_id"].strip()
            user = doctor_user_by_source_id.get(doctor_source_id)
            profile = profile_by_source_id.get(doctor_source_id)

            if user is None or profile is None:
                summary.availability_skipped_unknown_doctor += 1
                continue
            if profile.facility_id != user.facility_id:
                # Defensive consistency check — should not happen given the
                # import order above, but never insert an inconsistent slot.
                summary.availability_skipped_facility_mismatch += 1
                continue

            start_dt = _next_occurrence(row["day_of_week"].strip(), row["start_time"].strip())
            end_hour, end_minute = (int(p) for p in row["end_time"].strip().split(":"))
            end_dt = start_dt.replace(hour=end_hour, minute=end_minute)

            existing = await db.execute(
                select(DoctorAvailability).where(
                    DoctorAvailability.doctor_id == user.id,
                    DoctorAvailability.start_time == start_dt,
                    DoctorAvailability.end_time == end_dt,
                )
            )
            slot = existing.scalar_one_or_none()
            fee = row.get("consultation_fee", "").strip()
            fields = dict(
                doctor_id=user.id,
                facility_id=user.facility_id,
                start_time=start_dt,
                end_time=end_dt,
                consultation_type=row.get("consultation_type", "").strip() or None,
                consultation_fee=float(fee) if fee else None,
                note=f"Mock demo slot ({SOURCE_DATASET})",
            )
            if slot is None:
                db.add(DoctorAvailability(**fields, is_booked=False))
                summary.availability_inserted += 1
            else:
                for k, v in fields.items():
                    setattr(slot, k, v)
                summary.availability_updated += 1

        await db.commit()


def _print_summary(s: ImportSummary) -> None:
    print("\n" + "=" * 70)
    print("MOCK DOCTOR IMPORT SUMMARY (actual counts from this run)")
    print("=" * 70)
    print(f"Doctors read from CSV         : {s.doctors_read}")
    print(f"Doctors inserted               : {s.doctors_inserted}")
    print(f"Doctors updated                 : {s.doctors_updated}")
    print(f"Doctors skipped (no facility)  : {s.doctors_skipped_no_facility}")
    print(f"  - matched by capability      : {s.facility_capability_matches}")
    print(f"  - round-robin assigned       : {s.facility_round_robin_assignments}")
    print(f"Specialities seen              : {sorted(s.specialities_seen)}")
    print(f"Availability rows read         : {s.availability_read}")
    print(f"Availability inserted          : {s.availability_inserted}")
    print(f"Availability updated           : {s.availability_updated}")
    print(f"Availability skipped (unknown doctor)      : {s.availability_skipped_unknown_doctor}")
    print(f"Availability skipped (facility mismatch)   : {s.availability_skipped_facility_mismatch}")
    print("=" * 70)
    print("Reminder: all rows above are FICTIONAL MOCK DATA (source_dataset = "
          f"'{SOURCE_DATASET}'), for development/testing only.\n")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    default_dir = Path(__file__).resolve().parents[1] / "data"
    parser.add_argument("--doctors-csv", type=Path, default=default_dir / "mock_doctors.csv")
    parser.add_argument("--availability-csv", type=Path, default=default_dir / "mock_doctor_availability.csv")
    args = parser.parse_args()

    if not args.doctors_csv.exists():
        parser.error(f"File not found: {args.doctors_csv}")
    if not args.availability_csv.exists():
        parser.error(f"File not found: {args.availability_csv}")

    summary = ImportSummary()
    doctor_map = await import_doctors(args.doctors_csv, summary)
    await import_availability(args.availability_csv, doctor_map, summary)
    _print_summary(summary)


if __name__ == "__main__":
    asyncio.run(main())
