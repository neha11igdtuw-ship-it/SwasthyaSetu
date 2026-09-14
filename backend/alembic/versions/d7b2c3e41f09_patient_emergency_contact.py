"""patient emergency contact

Revision ID: d7b2c3e41f09
Revises: c4e8f1a90b12
Create Date: 2026-09-12 16:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7b2c3e41f09"
down_revision: Union[str, None] = "c4e8f1a90b12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("emergency_contact", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "emergency_contact")
