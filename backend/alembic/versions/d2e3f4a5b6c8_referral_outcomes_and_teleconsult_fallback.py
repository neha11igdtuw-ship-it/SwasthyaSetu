"""referral outcome tracking + teleconsultation fallback option

Adds:
  * referrals.outcome / outcome_notes / outcome_reported_at
  * appointments.fallback_option
  * notifications.referral_id (links staff follow-up alerts to a referral)

Revision ID: d2e3f4a5b6c8
Revises: c1d2e3f4a5b7
Create Date: 2026-10-04 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "d2e3f4a5b6c8"
down_revision: str | None = "c1d2e3f4a5b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_OUTCOME_VALUES = (
    "REACHED_FACILITY",
    "COULD_NOT_TRAVEL",
    "FACILITY_CLOSED",
    "DOCTOR_UNAVAILABLE",
    "TEST_NOT_COMPLETED",
    "MEDICINE_NOT_RECEIVED",
)
_FALLBACK_VALUES = (
    "VIDEO_CONSULTATION",
    "AUDIO_ONLY",
    "PHONE_CALLBACK",
    "PHYSICAL_FACILITY_REFERRAL",
)


def upgrade() -> None:
    bind = op.get_bind()

    outcome_enum = sa.Enum(*_OUTCOME_VALUES, name="referral_outcome_enum")
    fallback_enum = sa.Enum(*_FALLBACK_VALUES, name="teleconsult_fallback_enum")
    outcome_enum.create(bind, checkfirst=True)
    fallback_enum.create(bind, checkfirst=True)

    op.add_column("referrals", sa.Column("outcome", outcome_enum, nullable=True))
    op.add_column("referrals", sa.Column("outcome_notes", sa.Text(), nullable=True))
    op.add_column("referrals", sa.Column("outcome_reported_at", sa.DateTime(), nullable=True))

    op.add_column("appointments", sa.Column("fallback_option", fallback_enum, nullable=True))

    op.add_column(
        "notifications",
        sa.Column("referral_id", app.models.types.GUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_notifications_referral_id"), "notifications", ["referral_id"], unique=False
    )
    op.create_foreign_key(
        "fk_notifications_referral_id_referrals",
        "notifications",
        "referrals",
        ["referral_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_notifications_referral_id_referrals", "notifications", type_="foreignkey")
    op.drop_index(op.f("ix_notifications_referral_id"), table_name="notifications")
    op.drop_column("notifications", "referral_id")

    op.drop_column("appointments", "fallback_option")

    op.drop_column("referrals", "outcome_reported_at")
    op.drop_column("referrals", "outcome_notes")
    op.drop_column("referrals", "outcome")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="teleconsult_fallback_enum").drop(bind, checkfirst=True)
        sa.Enum(name="referral_outcome_enum").drop(bind, checkfirst=True)
