"""merge support_requests and referral_outcomes branches

Revision ID: 015bd328aea9
Revises: d2e3f4a5b6c8, d4e5f6a7b8c9
Create Date: 2026-10-05 13:16:37.643069

"""
from collections.abc import Sequence

revision: str = '015bd328aea9'
down_revision: str | tuple[str, ...] | None = ('d2e3f4a5b6c8', 'd4e5f6a7b8c9')
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
