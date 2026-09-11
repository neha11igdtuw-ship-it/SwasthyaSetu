import pytest

pytestmark = pytest.mark.asyncio


async def test_care_gap_lifecycle(client, auth_headers):
    patient = await client.post(
        "/api/v1/patients", json={"full_name": "Gap Patient"}, headers=auth_headers
    )
    patient_id = patient.json()["id"]

    resp = await client.post(
        "/api/v1/care-gaps",
        json={"patient_id": patient_id, "gap_type": "overdue_screening"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    gap = resp.json()
    assert gap["status"] == "OPEN"

    resp = await client.get(
        "/api/v1/care-gaps", params={"patient_id": patient_id}, headers=auth_headers
    )
    assert len(resp.json()) == 1

    resp = await client.post(
        f"/api/v1/care-gaps/{gap['id']}/close",
        json={"base_version": gap["version"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "CLOSED"
