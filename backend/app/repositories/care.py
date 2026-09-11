from app.models.care import Appointment, DiagnosticOrder, DiagnosticReport, Prescription
from app.repositories.base import SyncableRepository


class AppointmentRepository(SyncableRepository[Appointment]):
    model = Appointment


class DiagnosticOrderRepository(SyncableRepository[DiagnosticOrder]):
    model = DiagnosticOrder


class DiagnosticReportRepository(SyncableRepository[DiagnosticReport]):
    model = DiagnosticReport


class PrescriptionRepository(SyncableRepository[Prescription]):
    model = Prescription
