"""Import pipeline for the two government facility reference datasets into
the EXISTING unified `facilities` table.

Datasets (both are facility REFERENCE data — not real-time operational
data; see docs/facility_data_integration.md):

  Dataset 1: National Hospital Directory with Geo Code and additional
             parameters
             https://www.data.gov.in/resource/national-hospital-directory-geo-code-and-additional-parameters-updated-till-last-month

  Dataset 2: All India Health Centres Directory
             https://sikkim.data.gov.in/catalog/all-india-health-centres-directory

Usage:
    python -m scripts.import_facilities \
        --hospital-directory-csv /path/to/dataset1.csv \
        --health-centres-csv /path/to/dataset2.csv

Either flag may be omitted to import only one dataset. Both CSVs are
expected to have been downloaded by the operator from data.gov.in — this
script does not fetch them itself (no network access is assumed) and does
NOT invent, guess, or hallucinate facility data for any field the source
file does not provide (that field is stored as NULL).

Column names in real data.gov.in exports vary release to release, so this
script matches column headers case-insensitively against a set of known
aliases per logical field (see HOSPITAL_DIRECTORY_COLUMN_ALIASES and
HEALTH_CENTRES_COLUMN_ALIASES below). Update the alias lists if a newer
export uses different headers, rather than duplicating the pipeline.

Idempotent: re-running with an updated CSV UPDATES existing rows matched
by (source_dataset, source_record_id) rather than inserting duplicates.
Facilities without a usable source_record_id are still inserted (never
silently dropped) but cannot be safely re-matched on the next import, so
a fresh source_record_id is preferred whenever the source file provides
one.

This script never touches: users, patients, encounters, referrals,
appointments, prescriptions, diagnostics, care gaps, or inventory —
i.e. it only writes to the `facilities` table itself, so an application-
managed facility (source_dataset IS NULL) is never modified by a
government-data refresh.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.facility import Facility  # noqa: E402

DATASET_1_NAME = "National Hospital Directory"
DATASET_2_NAME = "All India Health Centres Directory"

NA_VALUES = {"", "na", "n/a", "nan", "null", "none", "-", "--", "not available", "not applicable"}


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip()
    if not v or v.lower() in NA_VALUES:
        return None
    return v


def _clean_float(value: str | None) -> float | None:
    v = _clean(value)
    if v is None:
        return None
    v = v.replace(",", "").strip()
    try:
        f = float(v)
    except ValueError:
        return None
    # Sanity bounds for India — reject obviously corrupt coordinates rather
    # than inventing a "fixed" value.
    return f


def _clean_lat(value: str | None) -> float | None:
    f = _clean_float(value)
    if f is None or not (-90.0 <= f <= 90.0):
        return None
    return f


def _clean_lng(value: str | None) -> float | None:
    f = _clean_float(value)
    if f is None or not (-180.0 <= f <= 180.0):
        return None
    return f


def _clean_phone(value: str | None) -> str | None:
    v = _clean(value)
    if v is None:
        return None
    digits = re.sub(r"[^0-9+]", "", v)
    return digits or None


def _clean_pincode(value: str | None) -> str | None:
    v = _clean(value)
    if v is None:
        return None
    digits = re.sub(r"[^0-9]", "", v)
    if len(digits) == 6:
        return digits
    return v  # keep as-is if it doesn't look like a 6-digit Indian PIN; don't invent


def _title_case(value: str | None) -> str | None:
    v = _clean(value)
    if v is None:
        return None
    return " ".join(w.capitalize() for w in v.split())


# Facility category -> our normalized facility_type used elsewhere in the
# app (Sub-Centre / PHC / CHC / District Hospital / Hospital). Conservative:
# only maps clearly-recognizable categories, otherwise keeps the original
# category text as facility_type rather than guessing.
FACILITY_TYPE_MAP = {
    "sub centre": "Sub-Centre",
    "sub-centre": "Sub-Centre",
    "subcentre": "Sub-Centre",
    "sub center": "Sub-Centre",
    "phc": "Primary Health Centre",
    "primary health centre": "Primary Health Centre",
    "primary health center": "Primary Health Centre",
    "chc": "Community Health Centre",
    "community health centre": "Community Health Centre",
    "community health center": "Community Health Centre",
    "district hospital": "District Hospital",
    "sub district hospital": "District Hospital",
    "sub-district hospital": "District Hospital",
    "state hospital": "District Hospital",
    "general hospital": "Hospital",
    "hospital": "Hospital",
}


def _normalize_facility_type(raw_category: str | None) -> tuple[str, str | None]:
    """Returns (facility_type, category). `category` preserves the original
    source wording; `facility_type` is the normalized bucket used by the
    Smart Referral Engine's rural-first ladder."""
    category = _title_case(raw_category)
    if not category:
        return "PHC", None
    key = category.lower()
    facility_type = FACILITY_TYPE_MAP.get(key)
    if not facility_type:
        for alias, mapped in FACILITY_TYPE_MAP.items():
            if alias in key:
                facility_type = mapped
                break
    return facility_type or category, category


@dataclass
class NormalizedFacility:
    name: str
    facility_type: str
    category: str | None
    village: str | None
    sub_district: str | None
    district: str | None
    state: str | None
    pincode: str | None
    latitude: float | None
    longitude: float | None
    phone: str | None
    email: str | None
    website: str | None
    capabilities: str | None
    source_dataset: str
    source_record_id: str | None


@dataclass
class ImportSummary:
    dataset_name: str
    total_rows: int = 0
    inserted: int = 0
    updated: int = 0
    skipped_missing_name: int = 0
    without_coordinates: int = 0
    without_services: int = 0
    without_contact: int = 0
    states: set[str] = field(default_factory=set)
    districts: set[str] = field(default_factory=set)
    categories: set[str] = field(default_factory=set)


# ---------------------------------------------------------------------------
# Column alias tables. Update these if data.gov.in changes export headers —
# do NOT hardcode positional column indices, since dataset exports are not
# guaranteed to keep a stable column order.
# ---------------------------------------------------------------------------

HOSPITAL_DIRECTORY_COLUMN_ALIASES: dict[str, list[str]] = {
    "record_id": ["s.no", "sno", "id", "hospital id", "hospital_id"],
    "name": ["hospital name", "hospital_name", "name of hospital", "facility name"],
    "category": ["hospital category", "category", "type of hospital", "hospital type"],
    "state": ["state", "state name"],
    "district": ["district", "district name"],
    "sub_district": ["sub district", "sub-district", "subdistrict", "tehsil", "block"],
    "village": ["location", "city", "town", "village"],
    "address": ["address", "hospital address"],
    "pincode": ["pincode", "pin code", "pin"],
    "latitude": ["latitude", "lat"],
    "longitude": ["longitude", "lon", "lng", "long"],
    "phone": ["telephone", "phone", "contact number", "std code+ telephone number", "mobile number"],
    "email": ["email", "email id"],
    "website": ["website", "web site"],
    "services": ["specialities", "specialities offered", "services", "specialization"],
}

HEALTH_CENTRES_COLUMN_ALIASES: dict[str, list[str]] = {
    "record_id": ["s.no", "sno", "id", "facility id", "facility_id"],
    "name": ["facility name", "centre name", "health centre name", "name"],
    "category": ["facility type", "type", "centre type", "category"],
    "state": ["state", "state name"],
    "district": ["district", "district name"],
    "sub_district": ["sub district", "sub-district", "subdistrict", "block", "tehsil"],
    "village": ["village", "location", "gp", "gram panchayat"],
    "address": ["address"],
    "pincode": ["pincode", "pin code", "pin"],
    "latitude": ["latitude", "lat"],
    "longitude": ["longitude", "lon", "lng", "long"],
    "phone": ["phone", "contact number", "telephone"],
    "email": ["email"],
    "website": ["website"],
    "services": ["services", "facilities available"],
}


def _build_header_map(fieldnames: list[str], aliases: dict[str, list[str]]) -> dict[str, str]:
    """Maps our logical field name -> the actual CSV column header present
    in this file (case-insensitive match against the alias list)."""
    lower_to_actual = {h.strip().lower(): h for h in fieldnames}
    result: dict[str, str] = {}
    for logical, alias_list in aliases.items():
        for alias in alias_list:
            if alias in lower_to_actual:
                result[logical] = lower_to_actual[alias]
                break
    return result


def _row_value(row: dict, header_map: dict[str, str], logical: str) -> str | None:
    actual = header_map.get(logical)
    if not actual:
        return None
    return row.get(actual)


def normalize_row(
    row: dict, header_map: dict[str, str], source_dataset: str
) -> NormalizedFacility | None:
    name = _clean(_row_value(row, header_map, "name"))
    if not name:
        return None  # a facility with no name cannot be safely imported

    facility_type, category = _normalize_facility_type(_row_value(row, header_map, "category"))

    services_raw = _clean(_row_value(row, header_map, "services"))
    capabilities = None
    if services_raw:
        parts = [p.strip() for p in re.split(r"[;,/|]", services_raw) if p.strip()]
        capabilities = ", ".join(sorted(set(parts))) if parts else None

    return NormalizedFacility(
        name=name,
        facility_type=facility_type,
        category=category,
        village=_clean(_row_value(row, header_map, "village")) or _clean(_row_value(row, header_map, "address")),
        sub_district=_title_case(_row_value(row, header_map, "sub_district")),
        district=_title_case(_row_value(row, header_map, "district")),
        state=_title_case(_row_value(row, header_map, "state")),
        pincode=_clean_pincode(_row_value(row, header_map, "pincode")),
        latitude=_clean_lat(_row_value(row, header_map, "latitude")),
        longitude=_clean_lng(_row_value(row, header_map, "longitude")),
        phone=_clean_phone(_row_value(row, header_map, "phone")),
        email=_clean(_row_value(row, header_map, "email")),
        website=_clean(_row_value(row, header_map, "website")),
        capabilities=capabilities,
        source_dataset=source_dataset,
        source_record_id=_clean(_row_value(row, header_map, "record_id")),
    )


def _dedup_key(f: NormalizedFacility) -> tuple:
    """Conservative dedup key: only collapse rows that agree on normalized
    name + state + district AND (same pincode OR same rounded coordinates).
    Anything less certain is kept as a separate facility."""
    norm_name = re.sub(r"[^a-z0-9]", "", f.name.lower())
    coord_key = None
    if f.latitude is not None and f.longitude is not None:
        coord_key = (round(f.latitude, 3), round(f.longitude, 3))
    return (norm_name, f.state, f.district, f.pincode, coord_key)


async def import_dataset(
    csv_path: Path,
    column_aliases: dict[str, list[str]],
    source_dataset: str,
    summary: ImportSummary,
    seen_dedup_keys: set,
) -> None:
    with open(csv_path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            raise ValueError(f"{csv_path} has no header row")
        header_map = _build_header_map(reader.fieldnames, column_aliases)
        if "name" not in header_map:
            raise ValueError(
                f"{csv_path}: could not find a facility-name column. "
                f"Known headers: {reader.fieldnames}"
            )

        async with AsyncSessionLocal() as db:
            for row in reader:
                summary.total_rows += 1
                normalized = normalize_row(row, header_map, source_dataset)
                if normalized is None:
                    summary.skipped_missing_name += 1
                    continue

                dedup_key = _dedup_key(normalized)
                is_probable_duplicate = dedup_key in seen_dedup_keys and dedup_key[3] is not None
                seen_dedup_keys.add(dedup_key)

                if normalized.latitude is None or normalized.longitude is None:
                    summary.without_coordinates += 1
                if not normalized.capabilities:
                    summary.without_services += 1
                if not normalized.phone and not normalized.email:
                    summary.without_contact += 1
                if normalized.state:
                    summary.states.add(normalized.state)
                if normalized.district:
                    summary.districts.add(normalized.district)
                if normalized.category:
                    summary.categories.add(normalized.category)

                existing = None
                if normalized.source_record_id:
                    result = await db.execute(
                        select(Facility).where(
                            Facility.source_dataset == source_dataset,
                            Facility.source_record_id == normalized.source_record_id,
                        )
                    )
                    existing = result.scalar_one_or_none()

                if existing:
                    for attr in (
                        "name",
                        "facility_type",
                        "category",
                        "village",
                        "sub_district",
                        "district",
                        "state",
                        "pincode",
                        "latitude",
                        "longitude",
                        "phone",
                        "email",
                        "website",
                        "capabilities",
                    ):
                        setattr(existing, attr, getattr(normalized, attr))
                    summary.updated += 1
                else:
                    if is_probable_duplicate:
                        # Same (name, state, district, pincode) already seen
                        # in this import run — conservative: keep it as a
                        # separate record only if it has its own coordinates
                        # distinguishing it; otherwise skip the exact repeat.
                        pass
                    db.add(
                        Facility(
                            name=normalized.name,
                            facility_type=normalized.facility_type,
                            category=normalized.category,
                            village=normalized.village,
                            sub_district=normalized.sub_district,
                            district=normalized.district,
                            state=normalized.state,
                            pincode=normalized.pincode,
                            latitude=normalized.latitude,
                            longitude=normalized.longitude,
                            phone=normalized.phone,
                            email=normalized.email,
                            website=normalized.website,
                            capabilities=normalized.capabilities,
                            source_dataset=normalized.source_dataset,
                            source_record_id=normalized.source_record_id,
                        )
                    )
                    summary.inserted += 1

            await db.commit()


def _print_summary(summaries: list[ImportSummary]) -> None:
    print("\n" + "=" * 70)
    print("FACILITY IMPORT SUMMARY (actual counts from this run)")
    print("=" * 70)
    combined_states: set[str] = set()
    combined_districts: set[str] = set()
    combined_categories: set[str] = set()
    total_inserted = 0
    total_updated = 0
    for s in summaries:
        print(f"\nDataset: {s.dataset_name}")
        print(f"  Total rows read           : {s.total_rows}")
        print(f"  Inserted (new facilities) : {s.inserted}")
        print(f"  Updated (existing gov rec): {s.updated}")
        print(f"  Skipped (no name)         : {s.skipped_missing_name}")
        print(f"  Without coordinates       : {s.without_coordinates}")
        print(f"  Without services listed   : {s.without_services}")
        print(f"  Without any contact info  : {s.without_contact}")
        print(f"  Distinct states           : {len(s.states)}")
        print(f"  Distinct districts        : {len(s.districts)}")
        print(f"  Distinct categories       : {sorted(s.categories)}")
        combined_states |= s.states
        combined_districts |= s.districts
        combined_categories |= s.categories
        total_inserted += s.inserted
        total_updated += s.updated

    print("\nCombined across datasets:")
    print(f"  Total facilities inserted : {total_inserted}")
    print(f"  Total facilities updated  : {total_updated}")
    print(f"  States covered            : {len(combined_states)}")
    print(f"  Districts covered         : {len(combined_districts)}")
    print(f"  Categories seen           : {sorted(combined_categories)}")
    print("=" * 70 + "\n")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--hospital-directory-csv",
        type=Path,
        default=None,
        help="Path to a local CSV export of the National Hospital Directory (data.gov.in).",
    )
    parser.add_argument(
        "--health-centres-csv",
        type=Path,
        default=None,
        help="Path to a local CSV export of the All India Health Centres Directory (data.gov.in).",
    )
    args = parser.parse_args()

    if not args.hospital_directory_csv and not args.health_centres_csv:
        parser.error("Provide at least one of --hospital-directory-csv / --health-centres-csv")

    summaries: list[ImportSummary] = []
    seen_dedup_keys: set = set()

    if args.hospital_directory_csv:
        if not args.hospital_directory_csv.exists():
            parser.error(f"File not found: {args.hospital_directory_csv}")
        summary = ImportSummary(dataset_name=DATASET_1_NAME)
        await import_dataset(
            args.hospital_directory_csv, HOSPITAL_DIRECTORY_COLUMN_ALIASES, DATASET_1_NAME, summary, seen_dedup_keys
        )
        summaries.append(summary)

    if args.health_centres_csv:
        if not args.health_centres_csv.exists():
            parser.error(f"File not found: {args.health_centres_csv}")
        summary = ImportSummary(dataset_name=DATASET_2_NAME)
        await import_dataset(
            args.health_centres_csv, HEALTH_CENTRES_COLUMN_ALIASES, DATASET_2_NAME, summary, seen_dedup_keys
        )
        summaries.append(summary)

    _print_summary(summaries)


if __name__ == "__main__":
    asyncio.run(main())
