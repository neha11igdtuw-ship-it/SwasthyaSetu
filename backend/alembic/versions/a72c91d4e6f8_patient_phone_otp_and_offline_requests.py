"""patient phone OTP login and idempotent offline requests

Revision ID: a72c91d4e6f8
Revises: d4e5f6a7b8c9, d2e3f4a5b6c8
Create Date: 2026-10-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "a72c91d4e6f8"
down_revision: str | Sequence[str] | None = ("d4e5f6a7b8c9", "d2e3f4a5b6c8")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=True)
    op.add_column("referrals", sa.Column("client_request_id", sa.String(length=64), nullable=True))
    op.add_column(
        "appointments", sa.Column("client_request_id", sa.String(length=64), nullable=True)
    )
    op.create_index(
        "uq_referrals_creator_client_request",
        "referrals",
        ["created_by_id", "client_request_id"],
        unique=True,
        postgresql_where=sa.text("client_request_id IS NOT NULL"),
        sqlite_where=sa.text("client_request_id IS NOT NULL"),
    )
    op.create_index(
        "uq_appointments_patient_client_request",
        "appointments",
        ["patient_id", "client_request_id"],
        unique=True,
        postgresql_where=sa.text("client_request_id IS NOT NULL"),
        sqlite_where=sa.text("client_request_id IS NOT NULL"),
    )
    op.create_table(
        "phone_otps",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("user_id", app.models.types.GUID(), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_phone_otps_user_id", "phone_otps", ["user_id"])
    op.create_index("ix_phone_otps_phone", "phone_otps", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_phone_otps_phone", table_name="phone_otps")
    op.drop_index("ix_phone_otps_user_id", table_name="phone_otps")
    op.drop_table("phone_otps")
    op.drop_index("uq_appointments_patient_client_request", table_name="appointments")
    op.drop_index("uq_referrals_creator_client_request", table_name="referrals")
    op.drop_column("appointments", "client_request_id")
    op.drop_column("referrals", "client_request_id")
    # Keep email nullable on downgrade so accounts registered without one remain valid.
