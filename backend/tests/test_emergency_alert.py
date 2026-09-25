"""Patient-triggered emergency alert: notifies the registered-by health
worker and logs an EMERGENCY_ALERT encounter."""

import pytest

from app.models.enums import Role
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

pytestmark = pytest.mark.asyncio


async def _login(client, email, password="StrongPass123!"):
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _register_patient(client, db_session, facility, email="alert.patient@example.com"):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email=email,
            password="StrongPass123!",
            full_name="Alert Patient",
            role=Role.PATIENT,
            facility_id=facility.id,
            village="Rampur Village",
        )
    )
    return await _login(client, email)


async def test_emergency_alert_creates_notification_and_encounter(
    client, db_session, facility, auth_headers
):
    headers = await _register_patient(client, db_session, facility)
    me = (await client.get("/api/v1/patients/me", headers=headers)).json()

    # Simulate the patient having been registered by a health worker, so the
    # alert has someone to notify (self-provisioned logins otherwise have no
    # registered_by_id).
    import uuid as uuid_module

    from app.repositories.patients import PatientRepository
    from app.repositories.users import UserRepository

    worker = await UserRepository(db_session).get_by_email("worker@example.com")
    patient_row = await PatientRepository(db_session).get(uuid_module.UUID(me["id"]))
    patient_row.registered_by_id = worker.id
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/patients/{me['id']}/emergency-alert",
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["notified_health_worker"] is True
    assert body["encounter_id"]

    # A notification should now exist for this patient.
    from app.repositories.queue import NotificationRepository
    import uuid as uuid_module

    notifications = await NotificationRepository(db_session).list_for_patient(
        uuid_module.UUID(me["id"])
    )
    assert len(notifications) == 1
    assert "Emergency alert" in notifications[0].title
    assert "Alert Patient" in notifications[0].body

    # An EMERGENCY_ALERT encounter should be logged.
    from app.repositories.maternal import EncounterRepository

    encounter = await EncounterRepository(db_session).get_or_404(
        uuid_module.UUID(body["encounter_id"])
    )
    assert encounter.encounter_type == "EMERGENCY_ALERT"
    assert str(encounter.patient_id) == me["id"]


async def test_emergency_alert_forbidden_for_other_patient(client, db_session, facility, auth_headers):
    await _register_patient(client, db_session, facility, email="one@example.com")
    headers2 = await _register_patient(client, db_session, facility, email="two@example.com")

    other = (
        await client.post("/api/v1/patients", json={"full_name": "Other Person"}, headers=auth_headers)
    ).json()

    resp = await client.post(
        f"/api/v1/patients/{other['id']}/emergency-alert",
        headers=headers2,
    )
    assert resp.status_code == 403
