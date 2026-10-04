import enum


class Role(enum.StrEnum):
    ADMIN = "ADMIN"
    FACILITY_ADMIN = "FACILITY_ADMIN"
    DOCTOR = "DOCTOR"
    HEALTH_WORKER = "HEALTH_WORKER"
    FACILITY_STAFF = "FACILITY_STAFF"
    PATIENT = "PATIENT"


# Roles whose access to patients/referrals/encounters/etc. is scoped to their
# own facility_id (as opposed to ADMIN, which sees everything, and PATIENT,
# which is scoped to its own patient record).
FACILITY_SCOPED_ROLES: set[Role] = {
    Role.FACILITY_ADMIN,
    Role.DOCTOR,
    Role.HEALTH_WORKER,
    Role.FACILITY_STAFF,
}


class ReferralStatus(enum.StrEnum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# Allowed transitions for the referral state machine.
# Referrals that still authorize a health worker to join a destination
# facility's OPD queue on the patient's behalf.
OPEN_REFERRAL_STATUSES: set[ReferralStatus] = {
    ReferralStatus.CREATED,
    ReferralStatus.PENDING,
    ReferralStatus.ACCEPTED,
    ReferralStatus.IN_TRANSIT,
}


REFERRAL_TRANSITIONS: dict[ReferralStatus, set[ReferralStatus]] = {
    ReferralStatus.CREATED: {
        ReferralStatus.PENDING,
        ReferralStatus.ACCEPTED,
        ReferralStatus.CANCELLED,
    },
    ReferralStatus.PENDING: {
        ReferralStatus.ACCEPTED,
        ReferralStatus.REJECTED,
        ReferralStatus.CANCELLED,
    },
    ReferralStatus.ACCEPTED: {ReferralStatus.IN_TRANSIT, ReferralStatus.CANCELLED},
    ReferralStatus.IN_TRANSIT: {ReferralStatus.COMPLETED, ReferralStatus.CANCELLED},
    ReferralStatus.REJECTED: set(),
    ReferralStatus.COMPLETED: set(),
    ReferralStatus.CANCELLED: set(),
}


class ReferralOutcome(enum.StrEnum):
    """What happened after the patient received a referral (patient-reported)."""

    REACHED_FACILITY = "REACHED_FACILITY"
    COULD_NOT_TRAVEL = "COULD_NOT_TRAVEL"
    FACILITY_CLOSED = "FACILITY_CLOSED"
    DOCTOR_UNAVAILABLE = "DOCTOR_UNAVAILABLE"
    TEST_NOT_COMPLETED = "TEST_NOT_COMPLETED"
    MEDICINE_NOT_RECEIVED = "MEDICINE_NOT_RECEIVED"


# Short labels used in health-worker notifications ("<patient> reported: <label>.").
REFERRAL_OUTCOME_LABELS: dict[ReferralOutcome, str] = {
    ReferralOutcome.REACHED_FACILITY: "Reached the facility",
    ReferralOutcome.COULD_NOT_TRAVEL: "Could not travel",
    ReferralOutcome.FACILITY_CLOSED: "Facility closed",
    ReferralOutcome.DOCTOR_UNAVAILABLE: "Doctor unavailable",
    ReferralOutcome.TEST_NOT_COMPLETED: "Test not completed",
    ReferralOutcome.MEDICINE_NOT_RECEIVED: "Medicine not received",
}

# Every outcome except REACHED_FACILITY needs health-worker follow-up.
UNSUCCESSFUL_REFERRAL_OUTCOMES: set[ReferralOutcome] = {
    o for o in ReferralOutcome if o != ReferralOutcome.REACHED_FACILITY
}

# Referral statuses for which a patient may no longer report an outcome.
REFERRAL_OUTCOME_CLOSED_STATUSES: set[ReferralStatus] = {
    ReferralStatus.REJECTED,
    ReferralStatus.CANCELLED,
}


class CareGapStatus(enum.StrEnum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class SyncOperation(enum.StrEnum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class SyncEntityType(enum.StrEnum):
    PATIENT = "PATIENT"
    REFERRAL = "REFERRAL"
    CARE_GAP = "CARE_GAP"


class PregnancyStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"


class RiskLevel(enum.StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AppointmentStatus(enum.StrEnum):
    REQUESTED = "REQUESTED"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class AppointmentMode(enum.StrEnum):
    IN_PERSON = "IN_PERSON"
    TELECONSULT = "TELECONSULT"


class TeleconsultFallback(enum.StrEnum):
    """Patient-selected way to proceed if a teleconsultation cannot run as video."""

    VIDEO_CONSULTATION = "VIDEO_CONSULTATION"
    AUDIO_ONLY = "AUDIO_ONLY"
    PHONE_CALLBACK = "PHONE_CALLBACK"
    PHYSICAL_FACILITY_REFERRAL = "PHYSICAL_FACILITY_REFERRAL"


class DiagnosticOrderStatus(enum.StrEnum):
    ORDERED = "ORDERED"
    COLLECTED = "COLLECTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PrescriptionStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"


class HealthWorkerCadre(enum.StrEnum):
    ASHA = "ASHA"
    ANM = "ANM"
    OTHER = "OTHER"


class QueueEntryStatus(enum.StrEnum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_CONSULTATION = "IN_CONSULTATION"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"
    REJOINED = "REJOINED"


# Statuses that count as "active"/occupying a live slot in the queue for
# ordering, position-counting and wait-time calculations.
ACTIVE_QUEUE_STATUSES: set[QueueEntryStatus] = {
    QueueEntryStatus.WAITING,
    QueueEntryStatus.CALLED,
    QueueEntryStatus.IN_CONSULTATION,
}


class NotificationChannel(enum.StrEnum):
    IN_APP = "IN_APP"
    SMS = "SMS"


class NotificationStatus(enum.StrEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    READ = "READ"
