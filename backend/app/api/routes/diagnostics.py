import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access, get_current_user
from app.core.errors import ForbiddenError
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.care import DiagnosticOrderRepository, DiagnosticReportRepository
from app.repositories.patients import PatientRepository
from app.schemas.care import (
    DiagnosticOrderCreate,
    DiagnosticOrderOut,
    DiagnosticOrderUpdate,
    DiagnosticReportCreate,
    DiagnosticReportOut,
)

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.get("/orders", response_model=list[DiagnosticOrderOut])
async def list_orders(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = await PatientRepository(db).get_or_404(patient_id)
    assert_patient_access(user, patient)
    return await DiagnosticOrderRepository(db).list_active(patient_id=patient_id)


@router.post("/orders", response_model=DiagnosticOrderOut, status_code=201)
async def create_order(
    data: DiagnosticOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot order diagnostics")
    patient = await PatientRepository(db).get_or_404(data.patient_id)
    assert_patient_access(user, patient)
    payload = data.model_dump()
    if user.facility_id is not None:
        payload["facility_id"] = payload.get("facility_id") or user.facility_id
    repo = DiagnosticOrderRepository(db)
    order = await repo.create(**payload, ordered_by_id=user.id)
    await db.commit()
    return order


@router.get("/orders/{order_id}", response_model=DiagnosticOrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = DiagnosticOrderRepository(db)
    order = await repo.get_or_404(order_id)
    patient = await PatientRepository(db).get_or_404(order.patient_id)
    assert_patient_access(user, patient)
    return order


@router.patch("/orders/{order_id}", response_model=DiagnosticOrderOut)
async def update_order(
    order_id: uuid.UUID,
    data: DiagnosticOrderUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot modify diagnostic orders")
    repo = DiagnosticOrderRepository(db)
    order = await repo.get_or_404(order_id)
    patient = await PatientRepository(db).get_or_404(order.patient_id)
    assert_patient_access(user, patient)
    changes = data.model_dump(exclude={"base_version"})
    order = await repo.apply_update(order_id, data.base_version, changes)
    await db.commit()
    return order


@router.post("/reports", response_model=DiagnosticReportOut, status_code=201)
async def create_report(
    data: DiagnosticReportCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.PATIENT:
        raise ForbiddenError("Patients cannot file diagnostic reports")
    order = await DiagnosticOrderRepository(db).get_or_404(data.diagnostic_order_id)
    patient = await PatientRepository(db).get_or_404(order.patient_id)
    assert_patient_access(user, patient)
    repo = DiagnosticReportRepository(db)
    report = await repo.create(**data.model_dump(), reported_by_id=user.id)
    await db.commit()
    return report


@router.get("/reports/{report_id}", response_model=DiagnosticReportOut)
async def get_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    repo = DiagnosticReportRepository(db)
    report = await repo.get_or_404(report_id)
    order = await DiagnosticOrderRepository(db).get_or_404(report.diagnostic_order_id)
    patient = await PatientRepository(db).get_or_404(order.patient_id)
    assert_patient_access(user, patient)
    return report
