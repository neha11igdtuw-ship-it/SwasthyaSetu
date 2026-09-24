"""add patient latitude and longitude

Revision ID: b1c2d3e4f5a6
Revises: a9b8c7d6e5f4
Create Date: 2026-09-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a9b8c7d6e5f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("patients", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "longitude")
    op.drop_column("patients", "latitude")
