"""Referral outcome reporting, HW follow-up notifications, teleconsult fallback."""

import pytest

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio

ALL_OUTCOMES = [
    "REACHED_FACILITY",
    "COULD_NOT_TRAVEL",
    "FACILITY_CLOSED",
    "DOCTOR_UNAVAILABLE",
    "TEST_NOT_COMPLETED",
    "MEDICINE_NOT_RECEIVED",
]
UNSUCCESSFUL = [o for o in ALL_OUTCOMES if o != "REACHED_FACILITY"]


async def _login(client, email, password="StrongPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _patient(client, db_session, facility, email, name):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name=name,
            role=Role.PATIENT,
            facility_id=facility.id,
        )
    )
    headers = await _login(client, email)
    me = await client.get("/api/v1/patients/me", headers=headers)
    assert me.status_code == 200, me.text
    return headers, me.json()["id"]


async def _referral(client, worker_headers, patient_id):
    resp = await client.post(
        "/api/v1/referrals",
        json={"patient_id": patient_id, "reason": "Suspected anaemia"},
        headers=worker_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _worker_notifications(client, worker_headers):
    resp = await client.get("/api/v1/notifications/me", headers=worker_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.parametrize("outcome", UNSUCCESSFUL)
async def test_unsuccessful_outcome_persists_and_notifies_health_worker(
    client, db_session, facility, auth_headers, outcome
):
    headers, patient_id = await _patient(client, db_session, facility, "p1@example.com", "Priya S")
    referral_id = await _referral(client, auth_headers, patient_id)

    resp = await client.post(
        f"/api/v1/referrals/{referral_id}/outcome",
        json={"outcome": outcome, "notes": "Could not get help."},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["outcome"] == outcome
    assert body["outcome_notes"] == "Could not get help."
    assert body["outcome_reported_at"]

    # Persisted: visible on the patient's own referral list.
    mine = await client.get("/api/v1/referrals/me", headers=headers)
    assert mine.json()[0]["outcome"] == outcome

    notes = await _worker_notifications(client, auth_headers)
    assert len(notes) == 1
    assert notes[0]["title"] == "Referral outcome reported"
    assert notes[0]["referral_id"] == referral_id
    assert "Priya S reported:" in notes[0]["body"]
    assert "Could not get help." in notes[0]["body"]
    # No clinical reason leaks into the alert.
    assert "anaemia" not in notes[0]["body"].lower()


async def test_successful_outcome_creates_no_follow_up_alert(
    client, db_session, facility, auth_headers
):
    headers, patient_id = await _patient(client, db_session, facility, "p2@example.com", "Ok Pat")
    referral_id = await _referral(client, auth_headers, patient_id)

    resp = await client.post(
        f"/api/v1/referrals/{referral_id}/outcome",
        json={"outcome": "REACHED_FACILITY"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["outcome"] == "REACHED_FACILITY"
    assert await _worker_notifications(client, auth_headers) == []


async def test_invalid_outcome_value_rejected(client, db_session, facility, auth_headers):
    headers, patient_id = await _patient(client, db_session, facility, "p3@example.com", "Bad Val")
    referral_id = await _referral(client, auth_headers, patient_id)
    resp = await client.post(
        f"/api/v1/referrals/{referral_id}/outcome",
        json={"outcome": "SOMETHING_ELSE"},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_outcome_cannot_be_reported_twice(client, db_session, facility, auth_headers):
    headers, patient_id = await _patient(client, db_session, facility, "p4@example.com", "Dup Pat")
    referral_id = await _referral(client, auth_headers, patient_id)
    url = f"/api/v1/referrals/{referral_id}/outcome"
    first = await client.post(url, json={"outcome": "FACILITY_CLOSED"}, headers=headers)
    assert first.status_code == 200
    second = await client.post(url, json={"outcome": "FACILITY_CLOSED"}, headers=headers)
    assert second.status_code == 409
    # Only one alert, not two.
    assert len(await _worker_notifications(client, auth_headers)) == 1


async def test_other_patient_cannot_report_outcome(client, db_session, facility, auth_headers):
    _, owner_patient_id = await _patient(client, db_session, facility, "own@example.com", "Owner")
    other_headers, _ = await _patient(client, db_session, facility, "oth@example.com", "Other")
    referral_id = await _referral(client, auth_headers, owner_patient_id)

    resp = await client.post(
        f"/api/v1/referrals/{referral_id}/outcome",
        json={"outcome": "COULD_NOT_TRAVEL"},
        headers=other_headers,
    )
    assert resp.status_code == 403
    assert await _worker_notifications(client, auth_headers) == []


async def test_staff_cannot_report_outcome_for_patient(
    client, db_session, facility, auth_headers, admin_headers
):
    _, patient_id = await _patient(client, db_session, facility, "st@example.com", "Staffed")
    referral_id = await _referral(client, auth_headers, patient_id)
    for headers in (auth_headers, admin_headers):
        resp = await client.post(
            f"/api/v1/referrals/{referral_id}/outcome",
            json={"outcome": "REACHED_FACILITY"},
            headers=headers,
        )
        assert resp.status_code == 403


async def test_unrelated_health_worker_is_not_notified(client, db_session, facility, auth_headers):
    from app.models.facility import Facility

    other_fac = Facility(name="Elsewhere PHC", facility_type="PHC")
    db_session.add(other_fac)
    await db_session.commit()
    await db_session.refresh(other_fac)
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="other-worker@example.com",
            password="StrongPass123!",
            full_name="Other Worker",
            role=Role.HEALTH_WORKER,
            facility_id=other_fac.id,
        )
    )
    other_worker = await _login(client, "other-worker@example.com")

    headers, patient_id = await _patient(
        client, db_session, facility, "pp@example.com", "Private P"
    )
    referral_id = await _referral(client, auth_headers, patient_id)
    resp = await client.post(
        f"/api/v1/referrals/{referral_id}/outcome",
        json={"outcome": "DOCTOR_UNAVAILABLE"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(await _worker_notifications(client, auth_headers)) == 1
    assert await _worker_notifications(client, other_worker) == []


async def test_patient_does_not_see_staff_alert_and_worker_can_mark_read(
    client, db_session, facility, auth_headers
):
    headers, patient_id = await _patient(client, db_session, facility, "pr@example.com", "Read Pat")
    referral_id = await _referral(client, auth_headers, patient_id)
    await client.post(
        f"/api/v1/referrals/{referral_id}/outcome",
        json={"outcome": "MEDICINE_NOT_RECEIVED"},
        headers=headers,
    )
    patient_notes = await client.get("/api/v1/notifications/me", headers=headers)
    assert patient_notes.json() == []

    note = (await _worker_notifications(client, auth_headers))[0]
    # The patient may not touch the staff notification.
    forbidden = await client.post(f"/api/v1/notifications/{note['id']}/read", headers=headers)
    assert forbidden.status_code == 403
    ok = await client.post(f"/api/v1/notifications/{note['id']}/read", headers=auth_headers)
    assert ok.status_code == 200
    assert ok.json()["status"] == "READ"


# ---------------------------------------------------------------- teleconsult


async def _teleconsult(client, headers, patient_id, facility, **extra):
    return await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "facility_id": str(facility.id),
            "mode": "TELECONSULT",
            "scheduled_at": "2026-10-05T10:00:00",
            "reason": "Fever",
            **extra,
        },
        headers=headers,
    )


@pytest.mark.parametrize(
    "option",
    ["VIDEO_CONSULTATION", "AUDIO_ONLY", "PHONE_CALLBACK", "PHYSICAL_FACILITY_REFERRAL"],
)
async def test_teleconsult_fallback_persists(client, db_session, facility, option):
    headers, patient_id = await _patient(client, db_session, facility, "tc@example.com", "Tele P")
    created = await _teleconsult(client, headers, patient_id, facility)
    assert created.status_code == 201, created.text
    # Defaults to the video consultation being booked.
    assert created.json()["fallback_option"] == "VIDEO_CONSULTATION"

    updated = await client.patch(
        f"/api/v1/appointments/{created.json()['id']}/fallback-option",
        json={"base_version": created.json()["version"], "fallback_option": option},
        headers=headers,
    )
    assert updated.status_code == 200, updated.text

    mine = await client.get("/api/v1/appointments/me", headers=headers)
    assert mine.json()[0]["fallback_option"] == option


async def test_fallback_rejected_for_in_person_and_other_patients(client, db_session, facility):
    headers, patient_id = await _patient(client, db_session, facility, "ip@example.com", "In Pers")
    other_headers, _ = await _patient(client, db_session, facility, "ot@example.com", "Other One")

    bad = await client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "facility_id": str(facility.id),
            "mode": "IN_PERSON",
            "scheduled_at": "2026-10-05T10:00:00",
            "fallback_option": "AUDIO_ONLY",
        },
        headers=headers,
    )
    assert bad.status_code == 422

    created = await _teleconsult(client, headers, patient_id, facility)
    appt = created.json()
    forbidden = await client.patch(
        f"/api/v1/appointments/{appt['id']}/fallback-option",
        json={"base_version": appt["version"], "fallback_option": "AUDIO_ONLY"},
        headers=other_headers,
    )
    assert forbidden.status_code == 403
