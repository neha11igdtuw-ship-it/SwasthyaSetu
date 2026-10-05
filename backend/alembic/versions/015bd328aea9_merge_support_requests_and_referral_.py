"""merge support_requests and referral_outcomes branches

Revision ID: 015bd328aea9
Revises: d2e3f4a5b6c8, d4e5f6a7b8c9
Create Date: 2026-10-05 13:16:37.643069

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '015bd328aea9'
down_revision: Union[str, None] = ('d2e3f4a5b6c8', 'd4e5f6a7b8c9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
