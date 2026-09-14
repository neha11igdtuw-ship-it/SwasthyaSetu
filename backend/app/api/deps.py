import uuid

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import FACILITY_SCOPED_ROLES, Role
from app.models.patient import Patient
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.repositories.users import UserRepository


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing bearer token")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("Invalid or expired token")
    user_id = payload.get("sub")
    try:
        user = await UserRepository(db).get(uuid.UUID(user_id))
    except (ValueError, TypeError):
        user = None
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user


def require_roles(*roles: Role):
    async def _checker(user: User = Depends(get_current_user)) -> User:
        if roles and user.role not in roles:
            raise ForbiddenError(f"Requires one of roles: {[r.value for r in roles]}")
        return user

    return _checker


# ---------------------------------------------------------------------------
# Facility-ownership / patient-ownership enforcement.
#
# These are plain helper functions (not FastAPI dependencies) because
# ownership checks require the target row to already be loaded (e.g. a
# patient fetched by path param), so they're called from inside route
# handlers/services right after the row is fetched, not declared in the
# route signature.
# ---------------------------------------------------------------------------


def is_facility_scoped(user: User) -> bool:
    return user.role in FACILITY_SCOPED_ROLES


def assert_facility_access(user: User, facility_id: uuid.UUID | None) -> None:
    """Facility-scoped staff (health worker/doctor/facility staff/facility
    admin) may only touch rows belonging to their own facility. ADMIN bypasses
    this check entirely. PATIENT never has facility-level access."""
    if user.role == Role.ADMIN:
        return
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot access facility-scoped resources")
    if not is_facility_scoped(user):
        raise ForbiddenError("Not authorized for facility-scoped resources")
    if facility_id is None or user.facility_id is None or facility_id != user.facility_id:
        raise ForbiddenError("You do not have access to this facility's resources")


def assert_patient_access(user: User, patient: Patient) -> None:
    """ADMIN: unrestricted. Facility-scoped staff: only patients registered at
    their own facility. PATIENT: only their own linked patient record."""
    if user.role == Role.ADMIN:
        return
    if user.role == Role.PATIENT:
        if patient.user_id is None or patient.user_id != user.id:
            raise ForbiddenError("You may only access your own patient record")
        return
    if is_facility_scoped(user):
        assert_facility_access(user, patient.facility_id)
        return
    raise ForbiddenError("Not authorized for this patient record")


def assert_referral_access(user: User, referral) -> None:
    """ADMIN: unrestricted. Facility-scoped staff: must own either the from-
    or to-facility of the referral. PATIENT: only referrals for their own
    patient record (caller must pass the loaded patient in that case via
    assert_patient_access instead — this helper is for staff roles)."""
    if user.role == Role.ADMIN:
        return
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot access referrals directly")
    if not is_facility_scoped(user):
        raise ForbiddenError("Not authorized for referrals")
    if user.facility_id is None or user.facility_id not in {
        referral.from_facility_id,
        referral.to_facility_id,
    }:
        raise ForbiddenError("You do not have access to this referral")


async def get_own_patient(db: AsyncSession, user: User) -> Patient:
    """Return the care record linked to a PATIENT login.

    Existing accounts created before self-provisioning still get a linked
    row from the login profile instead of a 404 on every /me action.
    """
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only patients can use this action")
    repo = PatientRepository(db)
    rows = await repo.list_active(user_id=user.id)
    if rows:
        return rows[0]
    patient = await repo.create(
        full_name=user.full_name,
        phone=user.phone,
        village=None,
        preferred_language=None,
        user_id=user.id,
        facility_id=user.facility_id,
    )
    await db.commit()
    await db.refresh(patient)
    return patient
