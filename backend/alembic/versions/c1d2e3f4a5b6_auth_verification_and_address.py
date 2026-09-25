"""add email verification and structured user address

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-09-25 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("address_line", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("village_area", sa.String(120), nullable=True))
    op.add_column("users", sa.Column("city_district", sa.String(120), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(80), nullable=True))
    op.add_column("users", sa.Column("pincode", sa.String(6), nullable=True))
    op.add_column("users", sa.Column("landmark", sa.String(160), nullable=True))

    # Grandfather clause: accounts created before email verification existed
    # have no token to consume and may not read the mailbox used at
    # sign-up time. Mark every pre-existing user verified; the column
    # default (false) then governs all new rows going forward.
    op.execute("UPDATE users SET is_verified = true")

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("user_id", app.models.types.GUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_email_verification_tokens_user_id"),
        "email_verification_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_verification_tokens_token_hash"),
        "email_verification_tokens",
        ["token_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_email_verification_tokens_token_hash"), table_name="email_verification_tokens"
    )
    op.drop_index(
        op.f("ix_email_verification_tokens_user_id"), table_name="email_verification_tokens"
    )
    op.drop_table("email_verification_tokens")

    op.drop_column("users", "landmark")
    op.drop_column("users", "pincode")
    op.drop_column("users", "state")
    op.drop_column("users", "city_district")
    op.drop_column("users", "village_area")
    op.drop_column("users", "address_line")
    op.drop_column("users", "is_verified")
