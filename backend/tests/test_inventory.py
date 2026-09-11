import pytest

pytestmark = pytest.mark.asyncio


async def test_inventory_adjust_and_low_stock(client, auth_headers, facility):
    facility_id = str(facility.id)
    resp = await client.post(
        "/api/v1/inventory",
        json={
            "facility_id": facility_id,
            "name": "Paracetamol",
            "quantity": 5,
            "reorder_level": 10,
        },
        headers=auth_headers,
    )
    item = resp.json()

    resp = await client.post(
        f"/api/v1/inventory/{item['id']}/adjust",
        json={"delta": 20, "reason": "RESTOCK"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["resulting_quantity"] == 25

    resp = await client.post(
        f"/api/v1/inventory/{item['id']}/adjust",
        json={"delta": -30, "reason": "DISPENSE"},
        headers=auth_headers,
    )
    assert resp.status_code == 409  # would go negative

    resp = await client.get(
        "/api/v1/inventory/low-stock", params={"facility_id": facility_id}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json() == []  # 25 > reorder_level 10
