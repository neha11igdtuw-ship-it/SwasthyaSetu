"""patient care pathway and language fields

Revision ID: c4e8f1a90b12
Revises: bd726bc84191
Create Date: 2026-09-12 15:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e8f1a90b12"
down_revision: Union[str, None] = "bd726bc84191"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("care_pathway", sa.String(length=64), nullable=True))
    op.add_column("patients", sa.Column("pregnancy_week", sa.Integer(), nullable=True))
    op.add_column("patients", sa.Column("preferred_language", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "preferred_language")
    op.drop_column("patients", "pregnancy_week")
    op.drop_column("patients", "care_pathway")
