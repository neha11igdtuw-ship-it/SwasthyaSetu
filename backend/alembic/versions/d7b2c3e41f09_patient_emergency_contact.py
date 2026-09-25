"""patient emergency contact

Revision ID: d7b2c3e41f09
Revises: c4e8f1a90b12
Create Date: 2026-09-12 16:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d7b2c3e41f09"
down_revision: str | None = "c4e8f1a90b12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("emergency_contact", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "emergency_contact")
