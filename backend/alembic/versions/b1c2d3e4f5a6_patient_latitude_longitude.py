"""add patient latitude and longitude

Revision ID: b1c2d3e4f5a6
Revises: a9b8c7d6e5f4
Create Date: 2026-09-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "a9b8c7d6e5f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("patients", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "longitude")
    op.drop_column("patients", "latitude")
