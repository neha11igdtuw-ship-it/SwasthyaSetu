import uuid
from datetime import UTC, datetime

from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError, ValidationAppError
from app.models.care_gap import CareGap
from app.models.enums import CareGapStatus, ReferralStatus, SyncEntityType, SyncOperation
from app.models.patient import Patient
from app.models.referral import Referral
from app.repositories.care_gaps import CareGapRepository
from app.repositories.patients import PatientRepository
from app.repositories.referrals import ReferralRepository
from app.repositories.sync_changes import SyncedChangeRepository
from app.schemas.sync import SyncChange, SyncChangeResult, SyncPullResponse

_ENTITY_REPOS = {
    SyncEntityType.PATIENT: (PatientRepository, Patient),
    SyncEntityType.REFERRAL: (ReferralRepository, Referral),
    SyncEntityType.CARE_GAP: (CareGapRepository, CareGap),
}


def _serialize(obj) -> dict:
    out = {}
    for c in obj.__table__.columns:
        value = getattr(obj, c.key)
        if isinstance(value, uuid.UUID):
            value = str(value)
        elif hasattr(value, "value") and not isinstance(value, int | str | float | bool):
            value = value.value  # enums
        elif isinstance(value, datetime):
            value = value.isoformat()
        out[c.key] = value
    return out


class SyncService:
    """Handles offline-first push/pull.

    Push: each change carries a client-generated `client_change_id`. If that
    id was already recorded for this device (e.g. the client retried after a
    dropped response), we return the previously recorded outcome instead of
    re-applying — making push idempotent. Updates/deletes carry `base_version`
    for optimistic concurrency; a mismatch yields a CONFLICT result (not an
    HTTP error) so the rest of the batch keeps processing.

    Pull: returns every row updated after `since`, so a device can merge
    server-side changes made by other users/devices.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.changes = SyncedChangeRepository(db)

    async def push(
        self, device_id: str, user_id: uuid.UUID | None, changes: list[SyncChange]
    ) -> list[SyncChangeResult]:
        results: list[SyncChangeResult] = []
        for change in changes:
            existing = await self.changes.find(device_id, change.client_change_id)
            if existing is not None:
                results.append(
                    SyncChangeResult(
                        client_change_id=change.client_change_id,
                        status="ALREADY_APPLIED",
                        entity_id=existing.entity_id,
                        version=existing.result_version,
                    )
                )
                continue

            try:
                result = await self._apply_one(device_id, user_id, change)
            except ConflictError as exc:
                result = SyncChangeResult(
                    client_change_id=change.client_change_id,
                    status="CONFLICT",
                    entity_id=change.entity_id,
                    server_state=(
                        jsonable_encoder(exc.details.get("current_state")) if exc.details else None
                    ),
                    error=exc.message,
                )
                await self.changes.record(
                    device_id=device_id,
                    client_change_id=change.client_change_id,
                    entity_type=change.entity_type,
                    entity_id=change.entity_id or uuid.uuid4(),
                    operation=change.operation,
                    status="CONFLICT",
                    user_id=user_id,
                )
                await self.db.commit()
            except (NotFoundError, ValidationAppError) as exc:
                result = SyncChangeResult(
                    client_change_id=change.client_change_id,
                    status="ERROR",
                    entity_id=change.entity_id,
                    error=str(exc.message if hasattr(exc, "message") else exc),
                )
                await self.db.rollback()
            results.append(result)
        return results

    async def _apply_one(
        self, device_id: str, user_id: uuid.UUID | None, change: SyncChange
    ) -> SyncChangeResult:
        repo_cls, model_cls = _ENTITY_REPOS[change.entity_type]
        repo = repo_cls(self.db)

        if change.operation == SyncOperation.CREATE:
            payload = dict(change.payload)
            entity_id = change.entity_id or payload.pop("id", None) or uuid.uuid4()
            payload.pop("id", None)
            payload.pop("version", None)
            payload.pop("is_deleted", None)
            self._coerce_enums(model_cls, payload)
            obj = await repo.create(id=entity_id, **payload)
            await self.changes.record(
                device_id=device_id,
                client_change_id=change.client_change_id,
                entity_type=change.entity_type,
                entity_id=obj.id,
                operation=change.operation,
                status="APPLIED",
                result_version=obj.version,
                user_id=user_id,
            )
            await self.db.commit()
            return SyncChangeResult(
                client_change_id=change.client_change_id,
                status="APPLIED",
                entity_id=obj.id,
                version=obj.version,
            )

        if change.entity_id is None or change.base_version is None:
            raise ValidationAppError("entity_id and base_version are required for update/delete")

        if change.operation == SyncOperation.UPDATE:
            payload = dict(change.payload)
            self._coerce_enums(model_cls, payload)
            obj = await repo.apply_update(change.entity_id, change.base_version, payload)
        else:
            obj = await repo.apply_delete(change.entity_id, change.base_version)

        await self.changes.record(
            device_id=device_id,
            client_change_id=change.client_change_id,
            entity_type=change.entity_type,
            entity_id=obj.id,
            operation=change.operation,
            status="APPLIED",
            result_version=obj.version,
            user_id=user_id,
        )
        await self.db.commit()
        return SyncChangeResult(
            client_change_id=change.client_change_id,
            status="APPLIED",
            entity_id=obj.id,
            version=obj.version,
        )

    @staticmethod
    def _coerce_enums(model_cls, payload: dict) -> None:
        if model_cls is Referral and "status" in payload and payload["status"] is not None:
            payload["status"] = ReferralStatus(payload["status"])
        if model_cls is CareGap and "status" in payload and payload["status"] is not None:
            payload["status"] = CareGapStatus(payload["status"])

    async def pull(self, since: datetime | None) -> SyncPullResponse:
        patients = await PatientRepository(self.db).list_since(since)
        referrals = await ReferralRepository(self.db).list_since(since)
        care_gaps = await CareGapRepository(self.db).list_since(since)
        return SyncPullResponse(
            server_time=datetime.now(UTC),
            patients=[_serialize(p) for p in patients],
            referrals=[_serialize(r) for r in referrals],
            care_gaps=[_serialize(c) for c in care_gaps],
        )
