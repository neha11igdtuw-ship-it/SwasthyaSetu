"""Queue management service.

Ordering algorithm: within a queue desk + day, active entries are ordered by
`active_order` first (lower = earlier), then `joined_at` (earlier first).
`active_order` starts at `priority` passed at join time (0 = normal, higher
values move a patient earlier — used for urgent referrals/appointments) and
is later overwritten to `max_active_order + 1` when a SKIPPED entry rejoins,
so a rejoined patient always lands at the end of the current line while
keeping their original token number for audit purposes.

Skip / rejoin / audit trail: a SKIPPED entry is never deleted. `POST
/queues/{id}/rejoin` transitions that same row SKIPPED -> REJOINED -> WAITING
(all three transitions are logged as separate QueueEvent rows so the full
history is visible), assigns a new `active_order` at the end of the active
queue, and clears `skipped_at`/`skip_reason` is intentionally *not* cleared —
they stay on the row as history; the QueueEvent log carries the authoritative
timeline. `token_number` is immutable for the lifetime of the row.
"""

from __future__ import annotations

import json
import secrets
import uuid
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access
from app.core.errors import ForbiddenError, NotFoundError, ValidationAppError
from app.models.enums import OPEN_REFERRAL_STATUSES, QueueEntryStatus, Role
from app.models.maternal import Pregnancy
from app.models.patient import Patient
from app.models.queue import QueueDesk, QueueEntry
from app.models.referral import Referral
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.repositories.queue import QueueDeskRepository, QueueEntryRepository, QueueEventRepository
from app.repositories.referrals import ReferralRepository
from app.repositories.users import UserRepository
from app.schemas.queue import (
    QueueDeskCreate,
    QueueDeskUpdate,
    QueueJoinByQrRequest,
    QueueJoinRequest,
)
from app.services.notifications import NotificationService


def _is_facility_scoped(user: User) -> bool:
    return user.role in {Role.FACILITY_ADMIN, Role.DOCTOR, Role.HEALTH_WORKER, Role.FACILITY_STAFF}


class QueueService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.desks = QueueDeskRepository(db)
        self.entries = QueueEntryRepository(db)
        self.events = QueueEventRepository(db)
        self.patients = PatientRepository(db)
        self.referrals = ReferralRepository(db)
        self.users = UserRepository(db)
        self.notifications = NotificationService(db)

    # -- queue desks ---------------------------------------------------

    def _assert_desk_manage_access(self, user: User, desk: QueueDesk) -> None:
        if user.role == Role.ADMIN:
            return
        if user.role == Role.FACILITY_ADMIN:
            if user.facility_id != desk.facility_id:
                raise ForbiddenError("You do not manage queues at this facility")
            return
        if user.role == Role.DOCTOR:
            if user.id != desk.doctor_id:
                raise ForbiddenError("You may only manage your own queue desk")
            return
        raise ForbiddenError("Not authorized to manage this queue desk")

    async def create_desk(self, data: QueueDeskCreate, user: User) -> QueueDesk:
        if user.role not in (Role.ADMIN, Role.FACILITY_ADMIN):
            raise ForbiddenError("Only facility admins can create queue desks")
        if user.role == Role.FACILITY_ADMIN and user.facility_id != data.facility_id:
            raise ForbiddenError("You may only create desks for your own facility")
        doctor = await self.users.get(data.doctor_id)
        if doctor is None or doctor.role != Role.DOCTOR:
            raise ValidationAppError("doctor_id must belong to a doctor account")
        if doctor.facility_id != data.facility_id:
            raise ValidationAppError("This doctor is not assigned to the selected facility")
        desk = await self.desks.create(
            **data.model_dump(),
            qr_code_key=secrets.token_urlsafe(16),
        )
        await self.db.commit()
        await self.db.refresh(desk)
        return desk

    async def update_desk(self, desk_id: uuid.UUID, data: QueueDeskUpdate, user: User) -> QueueDesk:
        desk = await self.desks.get_or_404(desk_id)
        self._assert_desk_manage_access(user, desk)
        changes = data.model_dump(exclude={"base_version"}, exclude_none=True)
        desk = await self.desks.apply_update(desk_id, data.base_version, changes)
        await self.db.commit()
        return desk

    async def get_qr(self, desk_id: uuid.UUID, user: User) -> QueueDesk:
        desk = await self.desks.get_or_404(desk_id)
        self._assert_desk_manage_access(user, desk)
        return desk

    async def pause(self, desk_id: uuid.UUID, reason: str, user: User) -> QueueDesk:
        desk = await self.desks.get_or_404(desk_id)
        self._assert_desk_manage_access(user, desk)
        desk.is_paused = True
        desk.pause_reason = reason
        desk.version += 1
        await self.db.flush()
        await self._notify_waiting_patients_delayed(desk, reason)
        await self.db.commit()
        return desk

    async def resume(self, desk_id: uuid.UUID, user: User) -> QueueDesk:
        desk = await self.desks.get_or_404(desk_id)
        self._assert_desk_manage_access(user, desk)
        desk.is_paused = False
        desk.pause_reason = None
        desk.version += 1
        await self.db.flush()
        await self.db.commit()
        return desk

    async def _notify_waiting_patients_delayed(self, desk: QueueDesk, reason: str) -> None:
        waiting = await self.entries.waiting_entries_for_desk(desk.id, date.today())
        for entry in waiting:
            patient = await self.patients.get(entry.patient_id)
            if patient:
                await self.notifications.notify_delayed(patient, entry.id, reason)

    # -- joining ---------------------------------------------------------

    async def _resolve_join_patient(
        self, user: User, requested_patient_id: uuid.UUID | None
    ) -> Patient:
        if user.role == Role.PATIENT:
            rows = await self.patients.list_active(user_id=user.id)
            if not rows:
                raise ValidationAppError("No patient record linked to this login")
            return rows[0]
        if user.role == Role.HEALTH_WORKER:
            if requested_patient_id is None:
                raise ValidationAppError(
                    "patient_id is required for a health worker joining on behalf"
                )
            patient = await self.patients.get_or_404(requested_patient_id)
            if patient.facility_id != user.facility_id:
                raise ForbiddenError("You may only assist patients linked to your own facility")
            return patient
        raise ForbiddenError("Only patients or health workers can join a queue")

    async def _join(
        self,
        desk: QueueDesk,
        patient: Patient,
        referral_id: uuid.UUID | None,
        appointment_id: uuid.UUID | None,
        priority: int,
    ) -> QueueEntry:
        if not desk.is_active:
            raise ValidationAppError("This queue desk is not currently active")
        today = date.today()
        existing = await self.entries.active_for_patient_doctor_department(
            patient.id, desk.id, today
        )
        if existing is not None:
            raise ValidationAppError(
                "You already have an active queue entry for this doctor/department today",
                details={"queue_entry_id": str(existing.id)},
            )
        token_number = await self.entries.next_token_number(desk.id, today)
        max_order = await self.entries.max_active_order(desk.id, today)
        entry = await self.entries.create(
            queue_desk_id=desk.id,
            patient_id=patient.id,
            facility_id=desk.facility_id,
            doctor_id=desk.doctor_id,
            referral_id=referral_id,
            appointment_id=appointment_id,
            queue_date=today,
            token_number=token_number,
            active_order=max_order + 1 - priority,
            status=QueueEntryStatus.WAITING,
            joined_at=datetime.utcnow(),
            estimated_wait_minutes=0,
        )
        await self.events.log(
            entry.id, "JOINED", patient.user_id, None, QueueEntryStatus.WAITING.value
        )
        await self._recompute_wait_times(desk.id, today)
        await self.notifications.notify_joined(patient, entry.id, token_number)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def join(self, data: QueueJoinRequest, user: User) -> QueueEntry:
        desk = await self.desks.get_or_404(data.queue_desk_id)
        patient = await self._resolve_join_patient(user, data.patient_id)
        referral_id = await self._resolve_join_referral(user, patient, desk, data.referral_id)
        return await self._join(desk, patient, referral_id, data.appointment_id, data.priority)

    async def join_by_qr(self, data: QueueJoinByQrRequest, user: User) -> QueueEntry:
        desk = await self.desks.get_by_qr_key(data.qr_payload)
        if desk is None:
            raise NotFoundError("No queue desk matches this QR code")
        patient = await self._resolve_join_patient(user, data.patient_id)
        referral_id = await self._resolve_join_referral(user, patient, desk, data.referral_id)
        return await self._join(desk, patient, referral_id, data.appointment_id, data.priority)

    async def _open_referrals_for_patient(self, patient_id: uuid.UUID) -> list[Referral]:
        return await self.referrals.list_open_for_patient(patient_id)

    async def _matching_open_referral(
        self, patient_id: uuid.UUID, facility_id: uuid.UUID
    ) -> Referral | None:
        for referral in await self._open_referrals_for_patient(patient_id):
            if referral.to_facility_id == facility_id:
                return referral
        return None

    async def _resolve_join_referral(
        self,
        user: User,
        patient: Patient,
        desk: QueueDesk,
        requested_referral_id: uuid.UUID | None,
    ) -> uuid.UUID | None:
        matching = await self._matching_open_referral(patient.id, desk.facility_id)
        if requested_referral_id is not None:
            referral = await self.referrals.get_or_404(requested_referral_id)
            if referral.patient_id != patient.id:
                raise ForbiddenError("Referral does not belong to this patient")
            if referral.status not in OPEN_REFERRAL_STATUSES:
                raise ValidationAppError("This referral is no longer active")
            if referral.to_facility_id != desk.facility_id:
                raise ValidationAppError(
                    "This referral is not for the selected queue desk's facility"
                )
            return referral.id
        if desk.facility_id == patient.facility_id:
            return matching.id if matching else None
        if matching is not None:
            return matching.id
        if user.role == Role.HEALTH_WORKER:
            raise ForbiddenError(
                "This patient has no active referral to the selected queue desk's facility"
            )
        return None

    # -- lifecycle ---------------------------------------------------------

    async def _assert_own_entry_or_linked(
        self, user: User, entry: QueueEntry, patient: Patient
    ) -> None:
        if user.role == Role.ADMIN:
            return
        if user.role == Role.PATIENT:
            if patient.user_id != user.id:
                raise ForbiddenError("You may only manage your own queue entry")
            return
        if _is_facility_scoped(user):
            if patient.facility_id == user.facility_id:
                return
            desk = await self.desks.get(entry.queue_desk_id)
            if desk is not None and desk.facility_id == user.facility_id:
                return
            raise ForbiddenError("You may only access patients linked to your own facility")
        raise ForbiddenError("Not authorized for this queue entry")

    async def cancel(self, entry_id: uuid.UUID, user: User) -> QueueEntry:
        entry = await self.entries.get_or_404(entry_id)
        patient = await self.patients.get_or_404(entry.patient_id)
        await self._assert_own_entry_or_linked(user, entry, patient)
        if entry.status != QueueEntryStatus.WAITING:
            raise ValidationAppError("Only a waiting queue entry can be cancelled")
        previous = entry.status
        entry.status = QueueEntryStatus.CANCELLED
        entry.cancelled_at = datetime.utcnow()
        entry.version += 1
        await self.events.log(entry.id, "CANCELLED", user.id, previous.value, entry.status.value)
        await self._recompute_wait_times(entry.queue_desk_id, entry.queue_date)
        await self.db.commit()
        return entry

    async def rejoin(self, entry_id: uuid.UUID, user: User) -> QueueEntry:
        entry = await self.entries.get_or_404(entry_id)
        patient = await self.patients.get_or_404(entry.patient_id)
        await self._assert_own_entry_or_linked(user, entry, patient)
        if entry.status != QueueEntryStatus.SKIPPED:
            raise ValidationAppError("Only a skipped entry can be rejoined")
        max_order = await self.entries.max_active_order(entry.queue_desk_id, entry.queue_date)
        previous = entry.status
        entry.status = QueueEntryStatus.REJOINED
        entry.version += 1
        await self.events.log(entry.id, "REJOINED", user.id, previous.value, entry.status.value)
        entry.status = QueueEntryStatus.WAITING
        entry.active_order = max_order + 1
        entry.rejoined_at = datetime.utcnow()
        entry.version += 1
        await self.events.log(
            entry.id,
            "REJOIN_CONFIRMED",
            user.id,
            QueueEntryStatus.REJOINED.value,
            QueueEntryStatus.WAITING.value,
        )
        await self._recompute_wait_times(entry.queue_desk_id, entry.queue_date)
        await self.db.commit()
        return entry

    def _assert_doctor_owns_desk(self, user: User, desk: QueueDesk) -> None:
        if user.role == Role.ADMIN:
            return
        if user.role == Role.DOCTOR and user.id == desk.doctor_id:
            return
        if user.role == Role.FACILITY_ADMIN and user.facility_id == desk.facility_id:
            return
        raise ForbiddenError("You may only manage your own queue")

    async def call_next(self, queue_desk_id: uuid.UUID, user: User) -> QueueEntry:
        desk = await self.desks.get_or_404(queue_desk_id)
        self._assert_doctor_owns_desk(user, desk)
        if desk.is_paused:
            raise ValidationAppError("Queue is paused", details={"pause_reason": desk.pause_reason})
        current = await self.entries.current_serving(desk.id, date.today())
        if current is not None:
            raise ValidationAppError(
                "A patient is already being served — complete or skip them first",
                details={"queue_entry_id": str(current.id)},
            )
        waiting = await self.entries.waiting_entries_for_desk(desk.id, date.today())
        if not waiting:
            raise NotFoundError("No waiting patients in this queue")
        entry = waiting[0]
        previous = entry.status
        entry.status = QueueEntryStatus.CALLED
        entry.called_at = datetime.utcnow()
        entry.version += 1
        await self.events.log(entry.id, "CALLED", user.id, previous.value, entry.status.value)
        await self.db.commit()
        await self._notify_next_in_line(desk, date.today())
        return entry

    async def start_consultation(self, entry_id: uuid.UUID, user: User) -> QueueEntry:
        entry = await self.entries.get_or_404(entry_id)
        desk = await self.desks.get_or_404(entry.queue_desk_id)
        self._assert_doctor_owns_desk(user, desk)
        if entry.status != QueueEntryStatus.CALLED:
            raise ValidationAppError("Only a called entry can start consultation")
        previous = entry.status
        entry.status = QueueEntryStatus.IN_CONSULTATION
        entry.consultation_started_at = datetime.utcnow()
        entry.version += 1
        await self.events.log(
            entry.id, "CONSULTATION_STARTED", user.id, previous.value, entry.status.value
        )
        await self.db.commit()
        return entry

    async def complete(self, entry_id: uuid.UUID, user: User) -> QueueEntry:
        entry = await self.entries.get_or_404(entry_id)
        desk = await self.desks.get_or_404(entry.queue_desk_id)
        self._assert_doctor_owns_desk(user, desk)
        if entry.status not in (QueueEntryStatus.CALLED, QueueEntryStatus.IN_CONSULTATION):
            raise ValidationAppError("Only a called or in-consultation entry can be completed")
        previous = entry.status
        entry.status = QueueEntryStatus.COMPLETED
        entry.completed_at = datetime.utcnow()
        entry.version += 1
        await self.events.log(entry.id, "COMPLETED", user.id, previous.value, entry.status.value)
        await self._recompute_wait_times(desk.id, entry.queue_date)
        await self.db.commit()
        return entry

    async def skip(self, entry_id: uuid.UUID, reason: str | None, user: User) -> QueueEntry:
        entry = await self.entries.get_or_404(entry_id)
        desk = await self.desks.get_or_404(entry.queue_desk_id)
        self._assert_doctor_owns_desk(user, desk)
        if entry.status not in (
            QueueEntryStatus.CALLED,
            QueueEntryStatus.IN_CONSULTATION,
            QueueEntryStatus.WAITING,
        ):
            raise ValidationAppError("This entry cannot be skipped from its current status")
        previous = entry.status
        entry.status = QueueEntryStatus.SKIPPED
        entry.skipped_at = datetime.utcnow()
        entry.skip_reason = reason
        entry.version += 1
        await self.events.log(
            entry.id,
            "SKIPPED",
            user.id,
            previous.value,
            entry.status.value,
            metadata_json=json.dumps({"reason": reason}) if reason else None,
        )
        await self._recompute_wait_times(desk.id, entry.queue_date)
        patient = await self.patients.get(entry.patient_id)
        if patient:
            await self.notifications.notify_skipped(patient, entry.id)
        await self.db.commit()
        return entry

    # -- reads ---------------------------------------------------------

    async def _entry_detail(self, entry: QueueEntry) -> dict:
        desk = await self.desks.get_or_404(entry.queue_desk_id)
        active = await self.entries.active_entries_for_desk(desk.id, entry.queue_date)
        current = await self.entries.current_serving(desk.id, entry.queue_date)
        patients_ahead = 0
        if entry.status == QueueEntryStatus.WAITING:
            for other in active:
                if other.id == entry.id:
                    break
                patients_ahead += 1
        return {
            "patients_ahead": patients_ahead,
            "current_token_number": current.token_number if current else None,
            "desk_display_name": desk.display_name,
            "desk_is_paused": desk.is_paused,
            "desk_pause_reason": desk.pause_reason,
        }

    async def get_detail(self, entry_id: uuid.UUID, user: User) -> tuple[QueueEntry, dict]:
        entry = await self.entries.get_or_404(entry_id)
        patient = await self.patients.get_or_404(entry.patient_id)
        await self._assert_own_entry_or_linked(user, entry, patient)
        return entry, await self._entry_detail(entry)

    async def list_mine(self, user: User) -> list[tuple[QueueEntry, dict]]:
        if user.role != Role.PATIENT:
            raise ForbiddenError("Only patients can use this action")
        rows = await self.patients.list_active(user_id=user.id)
        if not rows:
            return []
        patient = rows[0]
        entries = await self.entries.list_for_patient(patient.id)
        out = []
        for entry in entries:
            out.append((entry, await self._entry_detail(entry)))
        return out

    async def doctor_current(self, user: User) -> dict:
        if user.role not in (Role.DOCTOR, Role.ADMIN):
            raise ForbiddenError("Only doctors can view their own queue")
        stmt = (
            select(QueueDesk)
            .where(QueueDesk.doctor_id == user.id, QueueDesk.is_deleted.is_(False))
            .order_by(QueueDesk.is_active.desc(), QueueDesk.display_name.asc())
        )
        result = await self.db.execute(stmt)
        desks = list(result.scalars().all())
        if not desks:
            raise NotFoundError("No queue desk assigned to this doctor")
        today = date.today()
        desk = desks[0]
        best_waiting = -1
        for candidate in desks:
            if not candidate.is_active and any(d.is_active for d in desks):
                continue
            waiting_rows = await self.entries.waiting_entries_for_desk(candidate.id, today)
            if len(waiting_rows) > best_waiting:
                best_waiting = len(waiting_rows)
                desk = candidate
        active = await self.entries.active_entries_for_desk(desk.id, today)
        current = await self.entries.current_serving(desk.id, today)
        completed = await self.entries.count_for_desk_status(
            desk.id, today, QueueEntryStatus.COMPLETED
        )
        skipped = await self.entries.count_for_desk_status(desk.id, today, QueueEntryStatus.SKIPPED)
        waiting = [e for e in active if e.status == QueueEntryStatus.WAITING]

        entries_out = []
        for e in active:
            patient = await self.patients.get(e.patient_id)
            risk_flag = None
            if patient:
                pstmt = (
                    select(Pregnancy)
                    .where(Pregnancy.patient_id == patient.id, Pregnancy.is_deleted.is_(False))
                    .order_by(Pregnancy.created_at.desc())
                )
                presult = await self.db.execute(pstmt)
                pregnancy = presult.scalars().first()
                if pregnancy is not None:
                    risk_flag = pregnancy.risk_level.value
            referral_reason = None
            if e.referral_id is not None:
                referral = await self.referrals.get(e.referral_id)
                if referral is not None:
                    referral_reason = referral.reason
            wait_minutes = int((datetime.utcnow() - e.joined_at).total_seconds() // 60)
            entries_out.append(
                {
                    "id": e.id,
                    "token_number": e.token_number,
                    "active_order": e.active_order,
                    "status": e.status,
                    "patient_id": e.patient_id,
                    "patient_name": patient.full_name if patient else "Unknown",
                    "risk_flag": risk_flag,
                    "referral_reason": referral_reason,
                    "joined_at": e.joined_at,
                    "wait_minutes": wait_minutes,
                    "estimated_wait_minutes": e.estimated_wait_minutes,
                }
            )
        return {
            "summary": {
                "queue_desk_id": desk.id,
                "waiting_count": len(waiting),
                "current_token_number": current.token_number if current else None,
                "completed_today": completed,
                "skipped_today": skipped,
                "average_consultation_minutes": desk.average_consultation_minutes,
                "is_paused": desk.is_paused,
                "pause_reason": desk.pause_reason,
            },
            "entries": entries_out,
        }

    async def facility_overview(self, facility_id: uuid.UUID, user: User) -> dict:
        if user.role == Role.ADMIN:
            pass
        elif _is_facility_scoped(user):
            if user.facility_id != facility_id:
                raise ForbiddenError("You may only view your own facility's queues")
        else:
            raise ForbiddenError("Not authorized for facility queue data")
        desks = await self.desks.list_active(facility_id=facility_id)
        today = date.today()
        out = []
        for desk in desks:
            active = await self.entries.active_entries_for_desk(desk.id, today)
            current = await self.entries.current_serving(desk.id, today)
            waiting = [e for e in active if e.status == QueueEntryStatus.WAITING]
            avg_wait = (
                sum(e.estimated_wait_minutes for e in waiting) // len(waiting) if waiting else 0
            )
            out.append(
                {
                    "queue_desk_id": desk.id,
                    "department": desk.department,
                    "room_number": desk.room_number,
                    "doctor_id": desk.doctor_id,
                    "display_name": desk.display_name,
                    "current_token_number": current.token_number if current else None,
                    "waiting_count": len(waiting),
                    "is_paused": desk.is_paused,
                    "pause_reason": desk.pause_reason,
                    "average_wait_minutes": avg_wait,
                }
            )
        return {"desks": out}

    async def list_desks(
        self,
        facility_id: uuid.UUID | None,
        user: User,
        patient_id: uuid.UUID | None = None,
    ) -> list[QueueDesk]:
        if patient_id is not None:
            return await self._list_desks_for_patient(patient_id, user, facility_id)
        if user.role == Role.ADMIN:
            if facility_id is not None:
                return await self.desks.list_open_at_facilities([facility_id])
            return [d for d in await self.desks.list_active() if d.is_active]
        if user.role == Role.PATIENT:
            if facility_id is None:
                if user.facility_id is None:
                    return []
                return await self.desks.list_open_at_facilities([user.facility_id])
            return await self.desks.list_open_at_facilities([facility_id])
        if user.facility_id is None:
            raise ForbiddenError("Your account is not linked to a facility")
        if facility_id is not None and facility_id != user.facility_id:
            raise ForbiddenError("You may only list queue desks for your own facility")
        return await self.desks.list_open_at_facilities([user.facility_id])

    async def _list_desks_for_patient(
        self,
        patient_id: uuid.UUID,
        user: User,
        facility_id: uuid.UUID | None,
    ) -> list[QueueDesk]:
        patient = await self.patients.get_or_404(patient_id)
        assert_patient_access(user, patient)
        allowed: list[uuid.UUID] = []
        if patient.facility_id is not None:
            allowed.append(patient.facility_id)
        for referral in await self._open_referrals_for_patient(patient.id):
            if referral.to_facility_id is not None and referral.to_facility_id not in allowed:
                allowed.append(referral.to_facility_id)
        if facility_id is not None:
            if facility_id not in allowed:
                raise ForbiddenError(
                    "This patient has no active referral (or home facility match) for that facility"
                )
            allowed = [facility_id]
        return await self.desks.list_open_at_facilities(allowed)

    # -- wait-time recomputation ---------------------------------------

    async def _recompute_wait_times(self, queue_desk_id: uuid.UUID, queue_date: date) -> None:
        desk = await self.desks.get_or_404(queue_desk_id)
        waiting = await self.entries.waiting_entries_for_desk(queue_desk_id, queue_date)
        delay_minutes = 15 if desk.is_paused else 0
        newly_three_ahead: list[QueueEntry] = []
        newly_next: list[QueueEntry] = []
        for position, entry in enumerate(waiting):
            estimate = position * desk.average_consultation_minutes + delay_minutes
            if entry.estimated_wait_minutes != estimate:
                entry.estimated_wait_minutes = estimate
                entry.version += 1
            if position == 3:
                newly_three_ahead.append(entry)
            if position == 0:
                newly_next.append(entry)
        await self.db.flush()
        for entry in newly_three_ahead:
            patient = await self.patients.get(entry.patient_id)
            if patient:
                await self.notifications.notify_three_ahead(patient, entry.id)
        for entry in newly_next:
            patient = await self.patients.get(entry.patient_id)
            if patient:
                await self.notifications.notify_next(patient, entry.id)

    async def _notify_next_in_line(self, desk: QueueDesk, queue_date: date) -> None:
        waiting = await self.entries.waiting_entries_for_desk(desk.id, queue_date)
        if waiting:
            patient = await self.patients.get(waiting[0].patient_id)
            if patient:
                await self.notifications.notify_next(patient, waiting[0].id)
