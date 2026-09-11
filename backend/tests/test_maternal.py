import pytest

pytestmark = pytest.mark.asyncio


async def _make_patient(client, headers, name="Maternal Patient"):
    resp = await client.post("/api/v1/patients", json={"full_name": name}, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


async def test_pregnancy_crud(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)

    resp = await client.post(
        "/api/v1/pregnancies",
        json={"patient_id": patient_id, "risk_level": "HIGH", "risk_flags": "hypertension"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    pregnancy = resp.json()
    assert pregnancy["risk_level"] == "HIGH"

    resp = await client.get(
        "/api/v1/pregnancies", params={"patient_id": patient_id}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.patch(
        f"/api/v1/pregnancies/{pregnancy['id']}",
        json={"base_version": pregnancy["version"], "status": "COMPLETED"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "COMPLETED"


async def test_encounter_with_symptoms_and_vitals(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)

    resp = await client.post(
        "/api/v1/encounters",
        json={"patient_id": patient_id, "encounter_type": "ANTENATAL"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    encounter = resp.json()
    assert encounter["author_id"] is not None

    resp = await client.post(
        f"/api/v1/encounters/{encounter['id']}/symptoms",
        json={"encounter_id": encounter["id"], "description": "Headache", "severity": "MILD"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text

    resp = await client.post(
        f"/api/v1/encounters/{encounter['id']}/vitals",
        json={"encounter_id": encounter["id"], "systolic_bp": 140, "diastolic_bp": 95},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get(f"/api/v1/encounters/{encounter['id']}/symptoms", headers=auth_headers)
    assert len(resp.json()) == 1
    resp = await client.get(f"/api/v1/encounters/{encounter['id']}/vitals", headers=auth_headers)
    assert len(resp.json()) == 1


async def test_screening_creates_and_links_referral(client, auth_headers):
    """Integration test: a high-risk screening on an encounter can create and
    link a referral in one call, via Referral.screening_id."""
    patient_id = await _make_patient(client, auth_headers)

    resp = await client.post(
        "/api/v1/encounters",
        json={"patient_id": patient_id, "encounter_type": "ANTENATAL"},
        headers=auth_headers,
    )
    encounter = resp.json()

    resp = await client.post(
        f"/api/v1/encounters/{encounter['id']}/screenings",
        json={
            "encounter_id": encounter["id"],
            "screening_type": "pre-eclampsia risk",
            "result": "high BP",
            "risk_level": "HIGH",
            "create_referral": True,
            "referral_reason": "Suspected pre-eclampsia",
            "referral_specialty_needed": "obstetrics",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    screening = resp.json()
    assert screening["referral_id"] is not None

    resp = await client.get(f"/api/v1/referrals/{screening['referral_id']}", headers=auth_headers)
    assert resp.status_code == 200
    referral = resp.json()
    assert referral["patient_id"] == patient_id
    assert referral["specialty_needed"] == "obstetrics"

    # The list endpoint should also report the same linkage.
    resp = await client.get(
        f"/api/v1/encounters/{encounter['id']}/screenings", headers=auth_headers
    )
    assert resp.json()[0]["referral_id"] == screening["referral_id"]


async def test_screening_without_create_referral_flag_has_no_referral(client, auth_headers):
    patient_id = await _make_patient(client, auth_headers)
    resp = await client.post(
        "/api/v1/encounters",
        json={"patient_id": patient_id, "encounter_type": "GENERAL"},
        headers=auth_headers,
    )
    encounter = resp.json()

    resp = await client.post(
        f"/api/v1/encounters/{encounter['id']}/screenings",
        json={
            "encounter_id": encounter["id"],
            "screening_type": "routine check",
            "risk_level": "LOW",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["referral_id"] is None
