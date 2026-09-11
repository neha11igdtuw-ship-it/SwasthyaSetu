import pytest

pytestmark = pytest.mark.asyncio


async def _make_patient(client, headers):
    resp = await client.post(
        "/api/v1/patients", json={"full_name": "Referral Patient"}, headers=headers
    )
    return resp.json()["id"]


async def test_referral_state_machine_happy_path(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)
    resp = await client.post(
        "/api/v1/referrals",
        json={
            "patient_id": patient_id,
            "reason": "Suspected TB",
            "specialty_needed": "pulmonology",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    referral = resp.json()
    assert referral["status"] == "CREATED"

    for target in ["PENDING", "ACCEPTED", "IN_TRANSIT", "COMPLETED"]:
        resp = await client.post(
            f"/api/v1/referrals/{referral['id']}/transition",
            json={"base_version": referral["version"], "status": target},
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        referral = resp.json()
        assert referral["status"] == target


async def test_referral_illegal_transition_rejected(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)
    resp = await client.post(
        "/api/v1/referrals",
        json={"patient_id": patient_id, "reason": "Checkup"},
        headers=auth_headers,
    )
    referral = resp.json()

    # CREATED -> COMPLETED is not a legal transition
    resp = await client.post(
        f"/api/v1/referrals/{referral['id']}/transition",
        json={"base_version": referral["version"], "status": "COMPLETED"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_referral_matching_ranks_by_specialty_and_distance(client, admin_headers):
    origin = await client.post(
        "/api/v1/facilities",
        json={"name": "Origin PHC", "latitude": 28.6, "longitude": 77.2, "capabilities": ""},
        headers=admin_headers,
    )
    near_match = await client.post(
        "/api/v1/facilities",
        json={
            "name": "Near Cardiology Hospital",
            "latitude": 28.7,
            "longitude": 77.3,
            "capabilities": "cardiology,general medicine",
        },
        headers=admin_headers,
    )
    far_match = await client.post(
        "/api/v1/facilities",
        json={
            "name": "Far Cardiology Hospital",
            "latitude": 31.0,
            "longitude": 81.0,
            "capabilities": "cardiology",
        },
        headers=admin_headers,
    )
    no_match = await client.post(
        "/api/v1/facilities",
        json={
            "name": "General Clinic",
            "latitude": 28.65,
            "longitude": 77.25,
            "capabilities": "dentistry",
        },
        headers=admin_headers,
    )

    resp = await client.get(
        "/api/v1/referrals/match/candidates",
        params={"from_facility_id": origin.json()["id"], "specialty_needed": "cardiology"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    candidates = resp.json()
    ids_in_order = [c["facility_id"] for c in candidates]
    assert ids_in_order.index(near_match.json()["id"]) < ids_in_order.index(far_match.json()["id"])
    assert no_match.json()["id"] not in ids_in_order
