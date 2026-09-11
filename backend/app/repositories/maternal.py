from app.models.maternal import Encounter, Pregnancy, Screening, Symptom, Vital
from app.repositories.base import SyncableRepository


class PregnancyRepository(SyncableRepository[Pregnancy]):
    model = Pregnancy


class EncounterRepository(SyncableRepository[Encounter]):
    model = Encounter


class SymptomRepository(SyncableRepository[Symptom]):
    model = Symptom


class VitalRepository(SyncableRepository[Vital]):
    model = Vital


class ScreeningRepository(SyncableRepository[Screening]):
    model = Screening
