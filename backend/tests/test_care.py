import pytest

pytestmark = pytest.mark.asyncio


async def _make_patient(client, headers, name="Care Patient"):
    resp = await client.post("/api/v1/patients", json={"full_name": name}, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _make_item(client, headers, facility_id, quantity=10):
    resp = await client.post(
        "/api/v1/inventory",
        json={"facility_id": facility_id, "name": "Iron Folic Acid", "quantity": quantity},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


async def test_appointment_crud(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "scheduled_at": "2026-01-01T10:00:00",
            "reason": "Checkup",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    appt = resp.json()
    assert appt["status"] == "SCHEDULED"

    resp = await client.patch(
        f"/api/v1/appointments/{appt['id']}",
        json={"base_version": appt["version"], "status": "COMPLETED"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "COMPLETED"


async def test_diagnostic_order_and_report(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)
    resp = await client.post(
        "/api/v1/diagnostics/orders",
        json={"patient_id": patient_id, "test_type": "Urine protein"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    order = resp.json()
    assert order["status"] == "ORDERED"

    resp = await client.post(
        "/api/v1/diagnostics/reports",
        json={"diagnostic_order_id": order["id"], "result_summary": "Protein 2+"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    report = resp.json()
    assert report["diagnostic_order_id"] == order["id"]

    resp = await client.patch(
        f"/api/v1/diagnostics/orders/{order['id']}",
        json={"base_version": order["version"], "status": "COMPLETED"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "COMPLETED"


async def test_prescription_decrements_inventory(client, auth_headers, facility):
    """Integration test: creating a prescription must go through the same
    InventoryRepository.adjust_stock ledger used by manual dispensing —
    stock decrements and an insufficient-stock request is rejected."""
    patient_id = await _make_patient(client, auth_headers)
    item = await _make_item(client, auth_headers, str(facility.id), quantity=10)

    resp = await client.post(
        "/api/v1/prescriptions",
        json={
            "patient_id": patient_id,
            "inventory_item_id": item["id"],
            "quantity": 4,
            "dosage_instructions": "1 tablet daily",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    prescription = resp.json()
    assert prescription["quantity"] == 4

    resp = await client.get(
        "/api/v1/inventory", params={"facility_id": str(facility.id)}, headers=auth_headers
    )
    updated_item = next(i for i in resp.json() if i["id"] == item["id"])
    assert updated_item["quantity"] == 6  # 10 - 4

    # Requesting more than remains in stock is rejected (409), matching the
    # existing inventory-adjustment contract.
    resp = await client.post(
        "/api/v1/prescriptions",
        json={"patient_id": patient_id, "inventory_item_id": item["id"], "quantity": 100},
        headers=auth_headers,
    )
    assert resp.status_code == 409
