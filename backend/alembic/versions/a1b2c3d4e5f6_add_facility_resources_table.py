"""add facility resources table

Revision ID: a1b2c3d4e5f6
Revises: c1d2e3f4a5b6
Create Date: 2026-09-25 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

import app.models.types
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "c1d2e3f4a5b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "facility_resources",
        sa.Column("id", app.models.types.GUID(), primary_key=True),
        sa.Column(
            "facility_id",
            app.models.types.GUID(),
            sa.ForeignKey("facilities.id"),
            nullable=False,
        ),
        sa.Column("beds_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("beds_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("icu_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("icu_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("oxygen_units", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ambulances_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blood_units", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vaccine_doses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("facility_id", name="uq_facility_resources_facility_id"),
    )


def downgrade() -> None:
    op.drop_table("facility_resources")
