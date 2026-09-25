import pytest

pytestmark = pytest.mark.asyncio


async def test_get_creates_zeroed_row_then_update_persists(client, auth_headers, facility):
    facility_id = str(facility.id)

    resp = await client.get(f"/api/v1/facilities/{facility_id}/resources", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["facility_id"] == facility_id
    assert data["beds_total"] == 0
    assert data["beds_available"] == 0
    assert data["icu_total"] == 0
    assert data["icu_available"] == 0
    assert data["oxygen_units"] == 0
    assert data["ambulances_available"] == 0
    assert data["blood_units"] == 0
    assert data["vaccine_doses"] == 0

    resp = await client.put(
        f"/api/v1/facilities/{facility_id}/resources",
        json={
            "beds_total": 40,
            "beds_available": 12,
            "icu_total": 8,
            "icu_available": 2,
            "oxygen_units": 15,
            "ambulances_available": 1,
            "blood_units": 20,
            "vaccine_doses": 100,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["beds_total"] == 40
    assert updated["beds_available"] == 12
    assert updated["icu_total"] == 8
    assert updated["vaccine_doses"] == 100

    resp = await client.get(f"/api/v1/facilities/{facility_id}/resources", headers=auth_headers)
    assert resp.status_code == 200
    refetched = resp.json()
    assert refetched["beds_total"] == 40
    assert refetched["beds_available"] == 12
    assert refetched["vaccine_doses"] == 100
