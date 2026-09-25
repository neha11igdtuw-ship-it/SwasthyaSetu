"""add doctor availability note

Revision ID: f3c4d5e6f7a8
Revises: e1a2b3c4d5f6
Create Date: 2026-09-23 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f3c4d5e6f7a8"
down_revision: str | None = "e1a2b3c4d5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "doctor_availability",
        sa.Column("note", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("doctor_availability", "note")
