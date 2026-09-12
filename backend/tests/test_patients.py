import pytest

pytestmark = pytest.mark.asyncio


async def test_create_and_get_patient(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients",
        json={"full_name": "Anita Devi", "gender": "F", "village": "Rampur", "age": 24},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    patient = resp.json()
    assert patient["version"] == 1

    resp = await client.get(f"/api/v1/patients/{patient['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Anita Devi"
    assert resp.json()["date_of_birth"] is not None


async def test_update_patient_optimistic_concurrency(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients", json={"full_name": "Sita Devi"}, headers=auth_headers
    )
    patient = resp.json()

    resp = await client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"base_version": 1, "phone": "9999999999"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["version"] == 2

    # stale base_version -> 409 conflict
    resp = await client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"base_version": 1, "phone": "8888888888"},
        headers=auth_headers,
    )
    assert resp.status_code == 409
    body = resp.json()
    assert body["error"]["code"] == "CONFLICT"


async def test_delete_patient_requires_base_version(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients", json={"full_name": "To Delete"}, headers=auth_headers
    )
    patient = resp.json()
    resp = await client.delete(
        f"/api/v1/patients/{patient['id']}",
        params={"base_version": 999},
        headers=auth_headers,
    )
    assert resp.status_code == 409

    resp = await client.delete(
        f"/api/v1/patients/{patient['id']}",
        params={"base_version": 1},
        headers=auth_headers,
    )
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/patients/{patient['id']}", headers=auth_headers)
    assert resp.status_code == 404


async def test_create_patient_persists_maternal_fields(client, auth_headers):
    resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Meena Kumari",
            "gender": "F",
            "village": "Rampur Village",
            "age": 25,
            "care_pathway": "Maternal Care",
            "pregnancy_week": 24,
            "preferred_language": "Hindi",
            "systolic_bp": 118,
            "diastolic_bp": 76,
            "pulse": 80,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["care_pathway"] == "Maternal Care"
    assert body["pregnancy_week"] == 24
    assert body["preferred_language"] == "Hindi"
    assert body["date_of_birth"] is not None
