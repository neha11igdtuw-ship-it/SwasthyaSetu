"""queue entry facility and doctor snapshots

Revision ID: a9b8c7d6e5f4
Revises: f3c4d5e6f7a8
Create Date: 2026-09-24 13:55:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "a9b8c7d6e5f4"
down_revision: str | None = "f3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("queue_entries", sa.Column("facility_id", app.models.types.GUID(), nullable=True))
    op.add_column("queue_entries", sa.Column("doctor_id", app.models.types.GUID(), nullable=True))
    op.execute(
        """
        UPDATE queue_entries AS e
        SET facility_id = d.facility_id,
            doctor_id = d.doctor_id
        FROM queue_desks AS d
        WHERE e.queue_desk_id = d.id
        """
    )
    op.alter_column("queue_entries", "facility_id", nullable=False)
    op.alter_column("queue_entries", "doctor_id", nullable=False)
    op.create_index(
        op.f("ix_queue_entries_facility_id"), "queue_entries", ["facility_id"], unique=False
    )
    op.create_index(
        op.f("ix_queue_entries_doctor_id"), "queue_entries", ["doctor_id"], unique=False
    )
    op.create_foreign_key(
        "fk_queue_entries_facility_id_facilities",
        "queue_entries",
        "facilities",
        ["facility_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_queue_entries_doctor_id_users",
        "queue_entries",
        "users",
        ["doctor_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_queue_entries_doctor_id_users", "queue_entries", type_="foreignkey")
    op.drop_constraint(
        "fk_queue_entries_facility_id_facilities", "queue_entries", type_="foreignkey"
    )
    op.drop_index(op.f("ix_queue_entries_doctor_id"), table_name="queue_entries")
    op.drop_index(op.f("ix_queue_entries_facility_id"), table_name="queue_entries")
    op.drop_column("queue_entries", "doctor_id")
    op.drop_column("queue_entries", "facility_id")
