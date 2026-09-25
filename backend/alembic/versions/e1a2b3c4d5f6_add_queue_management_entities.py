"""add queue management entities

Revision ID: e1a2b3c4d5f6
Revises: d7b2c3e41f09
Create Date: 2026-09-22 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "e1a2b3c4d5f6"
down_revision: str | None = "d7b2c3e41f09"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "patients",
        sa.Column("sms_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "queue_desks",
        sa.Column("facility_id", app.models.types.GUID(), nullable=False),
        sa.Column("department", sa.String(length=128), nullable=False),
        sa.Column("room_number", sa.String(length=32), nullable=True),
        sa.Column("doctor_id", app.models.types.GUID(), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("opd_start_time", sa.Time(), nullable=True),
        sa.Column("opd_end_time", sa.Time(), nullable=True),
        sa.Column("average_consultation_minutes", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_paused", sa.Boolean(), nullable=False),
        sa.Column("pause_reason", sa.String(length=255), nullable=True),
        sa.Column("qr_code_key", sa.String(length=64), nullable=False),
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"]),
        sa.ForeignKeyConstraint(["doctor_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("qr_code_key"),
    )
    op.create_index(
        op.f("ix_queue_desks_facility_id"), "queue_desks", ["facility_id"], unique=False
    )
    op.create_index(op.f("ix_queue_desks_doctor_id"), "queue_desks", ["doctor_id"], unique=False)
    op.create_index(op.f("ix_queue_desks_qr_code_key"), "queue_desks", ["qr_code_key"], unique=True)

    op.create_table(
        "queue_desk_counters",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("queue_desk_id", app.models.types.GUID(), nullable=False),
        sa.Column("queue_date", sa.Date(), nullable=False),
        sa.Column("last_token_number", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["queue_desk_id"], ["queue_desks.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("queue_desk_id", "queue_date", name="uq_queue_desk_counter_desk_date"),
    )
    op.create_index(
        op.f("ix_queue_desk_counters_queue_desk_id"),
        "queue_desk_counters",
        ["queue_desk_id"],
        unique=False,
    )

    op.create_table(
        "queue_entries",
        sa.Column("queue_desk_id", app.models.types.GUID(), nullable=False),
        sa.Column("patient_id", app.models.types.GUID(), nullable=False),
        sa.Column("referral_id", app.models.types.GUID(), nullable=True),
        sa.Column("appointment_id", app.models.types.GUID(), nullable=True),
        sa.Column("queue_date", sa.Date(), nullable=False),
        sa.Column("token_number", sa.Integer(), nullable=False),
        sa.Column("active_order", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "WAITING",
                "CALLED",
                "IN_CONSULTATION",
                "COMPLETED",
                "SKIPPED",
                "CANCELLED",
                "REJOINED",
                name="queue_entry_status_enum",
            ),
            nullable=False,
        ),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.Column("called_at", sa.DateTime(), nullable=True),
        sa.Column("consultation_started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("skipped_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("rejoined_at", sa.DateTime(), nullable=True),
        sa.Column("skip_reason", sa.String(length=255), nullable=True),
        sa.Column("original_entry_id", app.models.types.GUID(), nullable=True),
        sa.Column("estimated_wait_minutes", sa.Integer(), nullable=False),
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["queue_desk_id"], ["queue_desks.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["referral_id"], ["referrals.id"]),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.ForeignKeyConstraint(["original_entry_id"], ["queue_entries.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_queue_entries_queue_desk_id"), "queue_entries", ["queue_desk_id"], unique=False
    )
    op.create_index(
        op.f("ix_queue_entries_patient_id"), "queue_entries", ["patient_id"], unique=False
    )
    op.create_index(
        op.f("ix_queue_entries_queue_date"), "queue_entries", ["queue_date"], unique=False
    )

    op.create_table(
        "queue_events",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("queue_entry_id", app.models.types.GUID(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("performed_by_user_id", app.models.types.GUID(), nullable=True),
        sa.Column("previous_status", sa.String(length=32), nullable=True),
        sa.Column("new_status", sa.String(length=32), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["queue_entry_id"], ["queue_entries.id"]),
        sa.ForeignKeyConstraint(["performed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_queue_events_queue_entry_id"), "queue_events", ["queue_entry_id"], unique=False
    )

    op.create_table(
        "notifications",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("patient_id", app.models.types.GUID(), nullable=False),
        sa.Column("queue_entry_id", app.models.types.GUID(), nullable=True),
        sa.Column(
            "channel", sa.Enum("IN_APP", "SMS", name="notification_channel_enum"), nullable=False
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SENT", "FAILED", "READ", name="notification_status_enum"),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["queue_entry_id"], ["queue_entries.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_notifications_patient_id"), "notifications", ["patient_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_patient_id"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_index(op.f("ix_queue_events_queue_entry_id"), table_name="queue_events")
    op.drop_table("queue_events")
    op.drop_index(op.f("ix_queue_entries_queue_date"), table_name="queue_entries")
    op.drop_index(op.f("ix_queue_entries_patient_id"), table_name="queue_entries")
    op.drop_index(op.f("ix_queue_entries_queue_desk_id"), table_name="queue_entries")
    op.drop_table("queue_entries")
    op.drop_index(op.f("ix_queue_desk_counters_queue_desk_id"), table_name="queue_desk_counters")
    op.drop_table("queue_desk_counters")
    op.drop_index(op.f("ix_queue_desks_qr_code_key"), table_name="queue_desks")
    op.drop_index(op.f("ix_queue_desks_doctor_id"), table_name="queue_desks")
    op.drop_index(op.f("ix_queue_desks_facility_id"), table_name="queue_desks")
    op.drop_table("queue_desks")
    op.drop_column("patients", "sms_consent")
