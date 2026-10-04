"""Patient notification service.

Every notification is persisted as a `Notification` row first (so it is
visible in-app and auditable even if delivery fails), then handed to a
channel adapter for delivery. The SMS adapter is an env-gated, credential-
gated no-op placeholder — see `SmsNotificationAdapter` below and the README
"SMS provider configuration" section. It never actually sends an SMS unless
real provider credentials are configured AND the patient has given
`sms_consent`.
"""

from __future__ import annotations

import abc
import os
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import (
    REFERRAL_OUTCOME_LABELS,
    NotificationChannel,
    NotificationStatus,
    ReferralOutcome,
)
from app.models.patient import Patient
from app.models.queue import Notification
from app.repositories.queue import NotificationRepository


REFERRAL_OUTCOME_NOTIFICATION_TITLE = "Referral outcome reported"


class NotificationChannelAdapter(abc.ABC):
    """Interface every delivery channel must implement."""

    channel: NotificationChannel

    @abc.abstractmethod
    async def send(self, notification: Notification, patient: Patient) -> tuple[bool, str | None]:
        """Return (success, error_message)."""


class InAppNotificationAdapter(NotificationChannelAdapter):
    """In-app notifications are "delivered" the moment they're persisted —
    the patient app polls GET /queues/me and the notifications list, so
    there is no separate transport step."""

    channel = NotificationChannel.IN_APP

    async def send(self, notification: Notification, patient: Patient) -> tuple[bool, str | None]:
        return True, None


class SmsNotificationAdapter(NotificationChannelAdapter):
    """SMS provider abstraction. Reads provider credentials from env vars
    (SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID — see README). If they are not
    configured, or the patient has not given `sms_consent`, this adapter
    no-ops and marks the notification FAILED with a clear, non-crashing
    reason. This intentionally never sends a real SMS in this codebase.
    """

    channel = NotificationChannel.SMS

    def _is_configured(self) -> bool:
        return bool(os.getenv("SMS_PROVIDER") and os.getenv("SMS_API_KEY"))

    async def send(self, notification: Notification, patient: Patient) -> tuple[bool, str | None]:
        if not patient.sms_consent:
            return False, "Patient has not given SMS consent"
        if not self._is_configured():
            return False, "SMS provider not configured (SMS_PROVIDER/SMS_API_KEY unset) — no-op"
        # Real provider integration would go here. Left unimplemented on
        # purpose: this environment must never send a real SMS.
        return False, "SMS sending is not implemented in this environment"


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)
        self._adapters: dict[NotificationChannel, NotificationChannelAdapter] = {
            NotificationChannel.IN_APP: InAppNotificationAdapter(),
            NotificationChannel.SMS: SmsNotificationAdapter(),
        }

    @staticmethod
    def sms_safe_body(hospital: str, department: str) -> str:
        """SMS bodies must never include medical details."""
        return (
            f"SwasthyaSetu: Your OPD token is approaching at {hospital}, {department}. "
            "Please reach the counter soon."
        )

    async def notify(
        self,
        patient: Patient,
        title: str,
        body: str,
        queue_entry_id: uuid.UUID | None = None,
        channel: NotificationChannel = NotificationChannel.IN_APP,
    ) -> Notification:
        notification = await self.repo.create(
            patient_id=patient.id,
            queue_entry_id=queue_entry_id,
            channel=channel,
            title=title,
            body=body,
            status=NotificationStatus.PENDING,
        )
        adapter = self._adapters[channel]
        success, error = await adapter.send(notification, patient)
        if success:
            notification.status = NotificationStatus.SENT
            from datetime import datetime

            notification.sent_at = datetime.utcnow()
        else:
            notification.status = NotificationStatus.FAILED
            notification.error_message = error
        await self.db.flush()
        return notification

    async def notify_staff(
        self,
        *,
        recipient_user_id: uuid.UUID,
        title: str,
        body: str,
        patient_id: uuid.UUID | None = None,
        referral_id: uuid.UUID | None = None,
    ) -> Notification:
        """In-app-only notification for a staff recipient (e.g. a doctor
        being told about an incoming teleconsultation request). There is no
        SMS/consent concept for staff, so this always delivers immediately
        rather than going through the patient-oriented channel adapters."""
        from datetime import datetime

        notification = await self.repo.create(
            patient_id=patient_id,
            recipient_user_id=recipient_user_id,
            referral_id=referral_id,
            channel=NotificationChannel.IN_APP,
            title=title,
            body=body,
            status=NotificationStatus.SENT,
            sent_at=datetime.utcnow(),
        )
        return notification

    async def notify_teleconsult_requested(
        self, *, doctor_id: uuid.UUID, patient: Patient, appointment_id: uuid.UUID
    ) -> Notification:
        return await self.notify_staff(
            recipient_user_id=doctor_id,
            patient_id=patient.id,
            title="New teleconsultation request",
            body=f"{patient.full_name} has requested a teleconsultation with you.",
        )

    @staticmethod
    def referral_outcome_body(
        *,
        patient_name: str,
        outcome: ReferralOutcome,
        notes: str | None,
        from_facility: str | None,
        to_facility: str | None,
    ) -> str:
        """Body for the health-worker follow-up alert. Deliberately limited to
        the patient's name, the reported outcome/notes and facility names — it
        never includes diagnosis, symptoms or the referral's clinical reason."""
        label = REFERRAL_OUTCOME_LABELS[outcome]
        body = f"{patient_name} reported: {label}."
        if notes:
            body += f" Notes: {notes}"
        if from_facility or to_facility:
            body += f" Referral: {from_facility or 'Unknown facility'} to {to_facility or 'Unknown facility'}."
        return body

    async def notify_referral_outcome(
        self,
        *,
        recipient_user_id: uuid.UUID,
        patient: Patient,
        referral_id: uuid.UUID,
        body: str,
    ) -> Notification:
        return await self.notify_staff(
            recipient_user_id=recipient_user_id,
            patient_id=patient.id,
            referral_id=referral_id,
            title=REFERRAL_OUTCOME_NOTIFICATION_TITLE,
            body=body,
        )

    async def notify_teleconsult_confirmed(self, patient: Patient) -> None:
        await self.notify(
            patient,
            title="Teleconsultation confirmed",
            body="Your teleconsultation request has been confirmed by the doctor. "
            "You can join at the scheduled time.",
        )

    async def notify_joined(
        self, patient: Patient, queue_entry_id: uuid.UUID, token_number: int
    ) -> None:
        await self.notify(
            patient,
            title="You joined the queue",
            body=f"You joined the OPD queue. Your token number is #{token_number}.",
            queue_entry_id=queue_entry_id,
        )

    async def notify_three_ahead(self, patient: Patient, queue_entry_id: uuid.UUID) -> None:
        await self.notify(
            patient,
            title="Almost your turn",
            body="3 patients are ahead of you. Please be ready.",
            queue_entry_id=queue_entry_id,
        )

    async def notify_next(self, patient: Patient, queue_entry_id: uuid.UUID) -> None:
        await self.notify(
            patient,
            title="You are next",
            body="You are next in the queue. Please proceed to the counter.",
            queue_entry_id=queue_entry_id,
        )

    async def notify_delayed(
        self, patient: Patient, queue_entry_id: uuid.UUID, reason: str
    ) -> None:
        await self.notify(
            patient,
            title="Queue delayed",
            body=f"The doctor is currently delayed ({reason}). We will notify you when the queue resumes.",
            queue_entry_id=queue_entry_id,
        )

    async def notify_skipped(self, patient: Patient, queue_entry_id: uuid.UUID) -> None:
        await self.notify(
            patient,
            title="You were missed",
            body="You were marked as missed since you were not present when called. "
            "You can rejoin the queue and keep your original token.",
            queue_entry_id=queue_entry_id,
        )
