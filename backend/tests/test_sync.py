import uuid

import pytest

pytestmark = pytest.mark.asyncio


async def test_sync_push_create_is_idempotent(client, auth_headers, facility):
    entity_id = str(uuid.uuid4())
    change = {
        "client_change_id": "c1",
        "entity_type": "PATIENT",
        "operation": "CREATE",
        "entity_id": entity_id,
        "payload": {
            "id": entity_id,
            "full_name": "Offline Patient",
            "village": "Nowhere",
            "facility_id": str(facility.id),
        },
    }
    resp = await client.post(
        "/api/v1/sync/push",
        json={"device_id": "device-1", "changes": [change]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["status"] == "APPLIED"
    assert result["version"] == 1

    # Resend the exact same push (e.g. client retried after dropped response).
    resp2 = await client.post(
        "/api/v1/sync/push",
        json={"device_id": "device-1", "changes": [change]},
        headers=auth_headers,
    )
    result2 = resp2.json()["results"][0]
    assert result2["status"] == "ALREADY_APPLIED"

    resp = await client.get(f"/api/v1/patients/{entity_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Offline Patient"


async def test_sync_push_conflict_on_stale_version(client, auth_headers):
    create = await client.post(
        "/api/v1/patients", json={"full_name": "Server Patient"}, headers=auth_headers
    )
    patient = create.json()

    # Server-side update bumps version to 2.
    await client.patch(
        f"/api/v1/patients/{patient['id']}",
        json={"base_version": 1, "phone": "1111111111"},
        headers=auth_headers,
    )

    # Device still thinks it's at version 1 -> conflict, not a hard error.
    change = {
        "client_change_id": "c2",
        "entity_type": "PATIENT",
        "operation": "UPDATE",
        "entity_id": patient["id"],
        "base_version": 1,
        "payload": {"phone": "2222222222"},
    }
    resp = await client.post(
        "/api/v1/sync/push",
        json={"device_id": "device-1", "changes": [change]},
        headers=auth_headers,
    )
    result = resp.json()["results"][0]
    assert result["status"] == "CONFLICT"
    assert result["server_state"]["phone"] == "1111111111"


async def test_sync_pull_returns_changes(client, auth_headers):
    await client.post("/api/v1/patients", json={"full_name": "Pullable"}, headers=auth_headers)
    resp = await client.post("/api/v1/sync/pull", json={}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert any(p["full_name"] == "Pullable" for p in body["patients"])
