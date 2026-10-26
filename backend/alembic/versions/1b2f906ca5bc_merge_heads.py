"""merge heads

Revision ID: 1b2f906ca5bc
Revises: 015bd328aea9, a72c91d4e6f8
Create Date: 2026-10-26 20:03:37.620030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1b2f906ca5bc'
down_revision: Union[str, None] = ('015bd328aea9', 'a72c91d4e6f8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
