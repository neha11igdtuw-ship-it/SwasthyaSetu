import pytest

pytestmark = pytest.mark.asyncio


async def test_fhir_patient_resource_shape(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Anita Devi",
            "gender": "F",
            "village": "Rampur",
            "age": 24,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    patient = resp.json()

    resp = await client.get(f"/api/v1/fhir/Patient/{patient['id']}", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    fhir_patient = resp.json()

    assert fhir_patient["resourceType"] == "Patient"
    assert fhir_patient["id"] == patient["id"]
    assert fhir_patient["gender"] == "female"
    assert fhir_patient["birthDate"] == patient["date_of_birth"]
    assert fhir_patient["name"][0]["text"] == "Anita Devi"


async def test_fhir_patient_unknown_gender_maps_to_unknown(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients",
        json={"full_name": "No Gender Given"},
        headers=auth_headers,
    )
    patient = resp.json()

    resp = await client.get(f"/api/v1/fhir/Patient/{patient['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["gender"] == "unknown"


async def test_fhir_patient_encounter_bundle(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Meena Kumari",
            "gender": "F",
            "village": "Rampur",
            "age": 25,
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "pulse": 72,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    patient = resp.json()

    resp = await client.get(f"/api/v1/fhir/Patient/{patient['id']}/Encounter", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    bundle = resp.json()

    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "searchset"
    assert bundle["total"] >= 1
    assert len(bundle["entry"]) == bundle["total"]

    encounter_resource = bundle["entry"][0]["resource"]
    assert encounter_resource["resourceType"] == "Encounter"
    assert encounter_resource["status"] == "finished"
    assert encounter_resource["subject"]["reference"] == f"Patient/{patient['id']}"
    # Baseline vitals recorded at registration should surface as contained
    # Observation-shaped entries.
    assert "contained" in encounter_resource
    assert encounter_resource["contained"][0]["resourceType"] == "Observation"
