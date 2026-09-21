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

from app.models.enums import NotificationChannel, NotificationStatus
from app.models.patient import Patient
from app.models.queue import Notification
from app.repositories.queue import NotificationRepository


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

    async def notify_joined(self, patient: Patient, queue_entry_id: uuid.UUID, token_number: int) -> None:
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

    async def notify_delayed(self, patient: Patient, queue_entry_id: uuid.UUID, reason: str) -> None:
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
