"""merge heads

Revision ID: 1b2f906ca5bc
Revises: 015bd328aea9, a72c91d4e6f8
Create Date: 2026-10-26 20:03:37.620030

"""

from collections.abc import Sequence

revision: str = "1b2f906ca5bc"
down_revision: str | None = ("015bd328aea9", "a72c91d4e6f8")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
