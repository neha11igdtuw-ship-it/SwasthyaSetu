"""add support_requests table

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b7
Create Date: 2026-10-04 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

import app.models.types
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "c1d2e3f4a5b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        reason_enum = postgresql.ENUM(
            "HEALTH_CONCERN",
            "UNDERSTANDING_HELP",
            "CANNOT_TRAVEL",
            "CALLBACK",
            "OTHER",
            name="support_request_reason_enum",
            create_type=False,
        )
        status_enum = postgresql.ENUM(
            "SUBMITTED",
            "ASSIGNED",
            "CALLBACK_PENDING",
            "CONTACTED",
            "RESOLVED",
            name="support_request_status_enum",
            create_type=False,
        )
        reason_enum.create(bind, checkfirst=True)
        status_enum.create(bind, checkfirst=True)
    else:
        reason_enum = sa.Enum(
            "HEALTH_CONCERN",
            "UNDERSTANDING_HELP",
            "CANNOT_TRAVEL",
            "CALLBACK",
            "OTHER",
            name="support_request_reason_enum",
        )
        status_enum = sa.Enum(
            "SUBMITTED",
            "ASSIGNED",
            "CALLBACK_PENDING",
            "CONTACTED",
            "RESOLVED",
            name="support_request_status_enum",
        )
        reason_enum.create(bind, checkfirst=True)
        status_enum.create(bind, checkfirst=True)

    op.create_table(
        "support_requests",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("patient_id", app.models.types.GUID(), nullable=False),
        sa.Column("facility_id", app.models.types.GUID(), nullable=True),
        sa.Column("reason", reason_enum, nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", status_enum, nullable=False, server_default="SUBMITTED"),
        sa.Column("assigned_to_id", app.models.types.GUID(), nullable=True),
        sa.Column("related_message_id", app.models.types.GUID(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"]),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["related_message_id"], ["care_messages.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_support_requests_patient_id", "support_requests", ["patient_id"])
    op.create_index("ix_support_requests_facility_id", "support_requests", ["facility_id"])
    op.create_index("ix_support_requests_status", "support_requests", ["status"])


def downgrade() -> None:
    op.drop_table("support_requests")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="support_request_status_enum").drop(bind, checkfirst=True)
        sa.Enum(name="support_request_reason_enum").drop(bind, checkfirst=True)
