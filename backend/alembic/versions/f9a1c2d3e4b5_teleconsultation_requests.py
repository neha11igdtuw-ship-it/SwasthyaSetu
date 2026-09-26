"""teleconsultation requests: appointment doctor/mode + staff notifications

Revision ID: f9a1c2d3e4b5
Revises: a1b2c3d4e5f6
Create Date: 2026-09-26 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "f9a1c2d3e4b5"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # ALTER TYPE ... ADD VALUE cannot run inside the migration's
        # transaction on Postgres.
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS 'REQUESTED'")

    appointment_mode_enum = sa.Enum("IN_PERSON", "TELECONSULT", name="appointment_mode_enum")
    appointment_mode_enum.create(bind, checkfirst=True)

    op.add_column(
        "appointments",
        sa.Column(
            "mode",
            appointment_mode_enum,
            nullable=False,
            server_default="IN_PERSON",
        ),
    )
    op.add_column(
        "appointments",
        sa.Column("doctor_id", app.models.types.GUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_appointments_doctor_id"), "appointments", ["doctor_id"], unique=False
    )
    op.create_foreign_key(
        "fk_appointments_doctor_id_users",
        "appointments",
        "users",
        ["doctor_id"],
        ["id"],
    )

    op.alter_column("notifications", "patient_id", existing_type=app.models.types.GUID(), nullable=True)
    op.add_column(
        "notifications",
        sa.Column("recipient_user_id", app.models.types.GUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_notifications_recipient_user_id"),
        "notifications",
        ["recipient_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_notifications_recipient_user_id_users",
        "notifications",
        "users",
        ["recipient_user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_notifications_recipient_user_id_users", "notifications", type_="foreignkey"
    )
    op.drop_index(op.f("ix_notifications_recipient_user_id"), table_name="notifications")
    op.drop_column("notifications", "recipient_user_id")
    op.alter_column("notifications", "patient_id", existing_type=app.models.types.GUID(), nullable=False)

    op.drop_constraint("fk_appointments_doctor_id_users", "appointments", type_="foreignkey")
    op.drop_index(op.f("ix_appointments_doctor_id"), table_name="appointments")
    op.drop_column("appointments", "doctor_id")
    op.drop_column("appointments", "mode")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="appointment_mode_enum").drop(bind, checkfirst=True)
    # Postgres enum values (REQUESTED on appointment_status_enum) cannot be
    # dropped without recreating the type; left in place on downgrade.
