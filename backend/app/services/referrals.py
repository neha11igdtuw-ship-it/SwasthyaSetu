import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, ValidationAppError
from app.models.enums import (
    REFERRAL_OUTCOME_CLOSED_STATUSES,
    REFERRAL_TRANSITIONS,
    UNSUCCESSFUL_REFERRAL_OUTCOMES,
    ReferralOutcome,
    ReferralStatus,
    Role,
)
from app.models.patient import Patient
from app.models.referral import Referral
from app.models.user import User
from app.repositories.facilities import FacilityRepository
from app.repositories.referrals import ReferralRepository
from app.repositories.users import UserRepository
from app.schemas.referral import ReferralCreate
from app.services.notifications import NotificationService


class ReferralService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReferralRepository(db)

    async def create(self, data: ReferralCreate, created_by_id: uuid.UUID | None) -> Referral:
        referral = await self.repo.create(
            patient_id=data.patient_id,
            from_facility_id=data.from_facility_id,
            to_facility_id=data.to_facility_id,
            reason=data.reason,
            specialty_needed=data.specialty_needed,
            urgency=data.urgency,
            notes=data.notes,
            status=ReferralStatus.CREATED,
            created_by_id=created_by_id,
        )
        await self.db.commit()
        return referral

    async def transition(
        self,
        referral_id: uuid.UUID,
        base_version: int,
        new_status: ReferralStatus,
        notes: str | None,
    ) -> Referral:
        referral = await self.repo.get_or_404(referral_id)
        allowed = REFERRAL_TRANSITIONS.get(referral.status, set())
        if new_status not in allowed:
            raise ValidationAppError(
                f"Cannot transition referral from {referral.status.value} to {new_status.value}",
                details={"allowed_next_states": [s.value for s in allowed]},
            )
        changes = {"status": new_status}
        if notes is not None:
            changes["notes"] = notes
        referral = await self.repo.apply_update(referral_id, base_version, changes)
        await self.db.commit()
        return referral

    async def _follow_up_recipients(self, patient: Patient, referral: Referral) -> list[User]:
        """The health worker(s) responsible for this patient's referral.

        Preference order: the active health worker who registered the patient;
        otherwise the active health workers at the referring facility (or, if
        the referral has none, the patient's own facility). Never a health
        worker at an unrelated facility.
        """
        users = UserRepository(self.db)
        if patient.registered_by_id is not None:
            owner = await users.get(patient.registered_by_id)
            if owner is not None and owner.is_active and owner.role == Role.HEALTH_WORKER:
                return [owner]
        facility_id = referral.from_facility_id or patient.facility_id
        if facility_id is None:
            return []
        return await users.list_by_facility_and_role(facility_id, Role.HEALTH_WORKER)

    async def report_outcome(
        self,
        referral: Referral,
        patient: Patient,
        outcome: ReferralOutcome,
        notes: str | None,
    ) -> Referral:
        """Persist the patient's reported outcome and, for unsuccessful
        outcomes only, notify the responsible health worker(s) in-app.

        The caller must already have verified that `patient` owns `referral`.
        An outcome can be reported once per referral.
        """
        # Lock the row (no-op on SQLite) so two simultaneous submissions can't
        # both pass the "not yet reported" check below.
        locked = await self.db.execute(
            select(Referral)
            .where(Referral.id == referral.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        referral = locked.scalar_one()

        if referral.status in REFERRAL_OUTCOME_CLOSED_STATUSES:
            raise ValidationAppError(
                f"Cannot report an outcome for a {referral.status.value.lower()} referral"
            )
        if referral.outcome is not None:
            raise ConflictError(
                "An outcome has already been reported for this referral",
                details={"outcome": referral.outcome.value},
            )

        referral.outcome = outcome
        referral.outcome_notes = notes
        referral.outcome_reported_at = datetime.utcnow()
        referral.version += 1

        if outcome in UNSUCCESSFUL_REFERRAL_OUTCOMES:
            facilities = FacilityRepository(self.db)
            from_fac = (
                await facilities.get(referral.from_facility_id)
                if referral.from_facility_id
                else None
            )
            to_fac = (
                await facilities.get(referral.to_facility_id) if referral.to_facility_id else None
            )
            body = NotificationService.referral_outcome_body(
                patient_name=patient.full_name,
                outcome=outcome,
                notes=notes,
                from_facility=from_fac.name if from_fac else None,
                to_facility=to_fac.name if to_fac else None,
            )
            notifier = NotificationService(self.db)
            for worker in await self._follow_up_recipients(patient, referral):
                await notifier.notify_referral_outcome(
                    recipient_user_id=worker.id,
                    patient=patient,
                    referral_id=referral.id,
                    body=body,
                )

        await self.db.commit()
        await self.db.refresh(referral)
        return referral
