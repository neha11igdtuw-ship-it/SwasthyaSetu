"""Read-only FHIR-shaped export endpoints.

These sit on top of the existing internal data model without any schema
changes: they reuse the same auth/ownership rules as the internal
`/patients` and `/encounters` routes, and project the ORM rows into FHIR R4
resource dicts via `app.services.fhir_export`.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import assert_patient_access, get_current_user
from app.db.session import get_db
from app.models.maternal import Encounter
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.services.fhir_export import encounters_to_fhir_bundle, patient_to_fhir

router = APIRouter(prefix="/fhir", tags=["fhir"])


@router.get("/Patient/{patient_id}")
async def get_fhir_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return patient_to_fhir(patient)


@router.get("/Patient/{patient_id}/Encounter")
async def get_fhir_patient_encounters(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)

    stmt = (
        select(Encounter)
        .where(Encounter.patient_id == patient_id, Encounter.is_deleted.is_(False))
        .options(
            selectinload(Encounter.vitals),
            selectinload(Encounter.symptoms),
            selectinload(Encounter.screenings),
        )
    )
    result = await db.execute(stmt)
    encounters = list(result.scalars().all())

    return encounters_to_fhir_bundle(patient_id, encounters)
