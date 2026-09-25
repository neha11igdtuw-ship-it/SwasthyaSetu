"""Read-only FHIR-shaped export layer.

Maps existing internal ORM objects (Patient, Encounter, ...) to FHIR R4
resource dicts, without touching the underlying tables/migrations. This lets
the app expose an honest, defensible FHIR-compatible view of its data for
interoperability requirements, without a full internal FHIR remodel.

These are pure functions: no DB access, no side effects. Callers are
responsible for loading any relationships they want reflected (e.g.
`encounter.vitals`) before calling `encounter_to_fhir`.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from app.models.maternal import Encounter
from app.models.patient import Patient

ABDM_HEALTH_ID_SYSTEM = "https://healthid.ndhm.gov.in"

# FHIR administrative-gender only allows these four values. Internal data
# uses free-text/abbreviated values (e.g. "M", "F", "Male"), so map
# defensively and fall back to "unknown" rather than guessing.
_GENDER_MAP = {
    "M": "male",
    "MALE": "male",
    "F": "female",
    "FEMALE": "female",
    "O": "other",
    "OTHER": "other",
}


def _map_gender(gender: str | None) -> str:
    if not gender:
        return "unknown"
    return _GENDER_MAP.get(gender.strip().upper(), "unknown")


def _iso_date(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    return value.isoformat()


def _iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def patient_to_fhir(patient: Patient) -> dict[str, Any]:
    """Map a Patient ORM object to a FHIR R4 Patient resource dict."""

    identifiers: list[dict[str, Any]] = [
        {
            "system": "urn:swasthyasetu:patient-id",
            "value": str(patient.id),
        }
    ]
    if patient.abha_id:
        identifiers.append(
            {
                "system": ABDM_HEALTH_ID_SYSTEM,
                "value": patient.abha_id,
            }
        )

    resource: dict[str, Any] = {
        "resourceType": "Patient",
        "id": str(patient.id),
        "identifier": identifiers,
        "active": not getattr(patient, "is_deleted", False),
        "name": [
            {
                "text": patient.full_name,
            }
        ],
        "gender": _map_gender(patient.gender),
    }

    birth_date = _iso_date(patient.date_of_birth)
    if birth_date:
        resource["birthDate"] = birth_date

    telecom = []
    if patient.phone:
        telecom.append({"system": "phone", "value": patient.phone, "use": "mobile"})
    if patient.emergency_contact:
        telecom.append(
            {
                "system": "phone",
                "value": patient.emergency_contact,
                "use": "home",
                # No dedicated FHIR ContactPoint field for "emergency contact
                # phone number for someone else"; flagged via extension
                # instead of misrepresenting it as the patient's own line.
                "extension": [
                    {
                        "url": "https://swasthyasetu.example/fhir/StructureDefinition/emergency-contact",
                        "valueBoolean": True,
                    }
                ],
            }
        )
    if telecom:
        resource["telecom"] = telecom

    if patient.village:
        resource["address"] = [
            {
                "use": "home",
                "city": patient.village,
                "country": "IN",
            }
        ]
        if patient.latitude is not None and patient.longitude is not None:
            resource["address"][0]["extension"] = [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/geolocation",
                    "extension": [
                        {"url": "latitude", "valueDecimal": patient.latitude},
                        {"url": "longitude", "valueDecimal": patient.longitude},
                    ],
                }
            ]

    extensions = []
    if patient.preferred_language:
        extensions.append(
            {
                "url": "https://swasthyasetu.example/fhir/StructureDefinition/preferred-language",
                "valueString": patient.preferred_language,
            }
        )
    if patient.care_pathway:
        extensions.append(
            {
                "url": "https://swasthyasetu.example/fhir/StructureDefinition/care-pathway",
                "valueString": patient.care_pathway,
            }
        )
    if patient.pregnancy_week is not None:
        extensions.append(
            {
                "url": "https://swasthyasetu.example/fhir/StructureDefinition/pregnancy-week",
                "valueInteger": patient.pregnancy_week,
            }
        )
    if extensions:
        resource["extension"] = extensions

    if patient.facility_id:
        resource["managingOrganization"] = {"reference": f"Organization/{patient.facility_id}"}

    return resource


def _vital_to_observations(encounter: Encounter) -> list[dict[str, Any]]:
    """Map an Encounter's vitals into FHIR Observation-shaped dicts.

    These are plain dicts describing observations (not persisted/queryable
    resources), returned inline as a `contained`-style list on the Encounter
    export rather than as separate top-level resources, since there's no
    dedicated /fhir/Observation endpoint.
    """

    observations: list[dict[str, Any]] = []
    for vital in getattr(encounter, "vitals", None) or []:
        components = []
        if vital.systolic_bp is not None:
            components.append(
                {
                    "code": {"text": "Systolic blood pressure"},
                    "valueQuantity": {"value": vital.systolic_bp, "unit": "mmHg"},
                }
            )
        if vital.diastolic_bp is not None:
            components.append(
                {
                    "code": {"text": "Diastolic blood pressure"},
                    "valueQuantity": {"value": vital.diastolic_bp, "unit": "mmHg"},
                }
            )
        if vital.pulse is not None:
            components.append(
                {
                    "code": {"text": "Pulse"},
                    "valueQuantity": {"value": vital.pulse, "unit": "beats/minute"},
                }
            )
        if vital.temperature_c is not None:
            components.append(
                {
                    "code": {"text": "Body temperature"},
                    "valueQuantity": {"value": vital.temperature_c, "unit": "Cel"},
                }
            )
        if vital.weight_kg is not None:
            components.append(
                {
                    "code": {"text": "Body weight"},
                    "valueQuantity": {"value": vital.weight_kg, "unit": "kg"},
                }
            )
        if vital.spo2 is not None:
            components.append(
                {
                    "code": {"text": "Oxygen saturation"},
                    "valueQuantity": {"value": vital.spo2, "unit": "%"},
                }
            )

        observations.append(
            {
                "resourceType": "Observation",
                "id": str(vital.id),
                "status": "final",
                "category": [{"text": "vital-signs"}],
                "code": {"text": "Vital signs panel"},
                "subject": {"reference": f"Patient/{encounter.patient_id}"},
                "encounter": {"reference": f"Encounter/{encounter.id}"},
                "effectiveDateTime": _iso_datetime(vital.recorded_at),
                "component": components,
            }
        )
    return observations


def encounter_to_fhir(encounter: Encounter) -> dict[str, Any]:
    """Map an Encounter ORM object to a FHIR R4 Encounter resource dict.

    Assumes vitals/symptoms/screenings relationships are already loaded if
    the caller wants them reflected (e.g. via eager-loading in the query);
    lazy-load access is avoided by using getattr(..., None) defensively.
    """

    resource: dict[str, Any] = {
        "resourceType": "Encounter",
        "id": str(encounter.id),
        "status": "finished",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB",
            "display": "ambulatory",
        },
        "type": [{"text": encounter.encounter_type}],
        "subject": {"reference": f"Patient/{encounter.patient_id}"},
    }

    period_start = _iso_datetime(encounter.encounter_date)
    if period_start:
        resource["period"] = {"start": period_start}

    if encounter.facility_id:
        resource["serviceProvider"] = {"reference": f"Organization/{encounter.facility_id}"}

    if encounter.notes:
        resource["extension"] = [
            {
                "url": "https://swasthyasetu.example/fhir/StructureDefinition/encounter-notes",
                "valueString": encounter.notes,
            }
        ]

    symptoms = getattr(encounter, "symptoms", None) or []
    if symptoms:
        resource["reasonCode"] = [{"text": s.description} for s in symptoms]

    screenings = getattr(encounter, "screenings", None) or []
    if screenings:
        resource["diagnosis"] = [
            {
                "condition": {"text": f"{s.screening_type}: {s.result or 'no result recorded'}"},
            }
            for s in screenings
        ]

    observations = _vital_to_observations(encounter)
    if observations:
        resource["contained"] = observations

    return resource


def encounters_to_fhir_bundle(patient_id, encounters: list[Encounter]) -> dict[str, Any]:
    """Wrap a patient's Encounter resources in a FHIR searchset Bundle."""

    entries = [
        {
            "fullUrl": f"Encounter/{encounter.id}",
            "resource": encounter_to_fhir(encounter),
        }
        for encounter in encounters
    ]
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }
