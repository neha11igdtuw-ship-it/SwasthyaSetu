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
