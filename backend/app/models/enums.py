import enum


class Role(str, enum.Enum):
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


class ReferralStatus(str, enum.Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# Allowed transitions for the referral state machine.
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


class CareGapStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class SyncOperation(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class SyncEntityType(str, enum.Enum):
    PATIENT = "PATIENT"
    REFERRAL = "REFERRAL"
    CARE_GAP = "CARE_GAP"


class PregnancyStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class DiagnosticOrderStatus(str, enum.Enum):
    ORDERED = "ORDERED"
    COLLECTED = "COLLECTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PrescriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"


class HealthWorkerCadre(str, enum.Enum):
    ASHA = "ASHA"
    ANM = "ANM"
    OTHER = "OTHER"
