"""add care messaging tables: conversations and messages

Revision ID: c1d2e3f4a5b7
Revises: f9a1c2d3e4b5
Create Date: 2026-10-01 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

import app.models.types
from alembic import op

revision: str = "c1d2e3f4a5b7"
down_revision: str | None = "f9a1c2d3e4b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        message_category_enum = postgresql.ENUM(
            "GENERAL",
            "SYMPTOM",
            "MEDICINE",
            "APPOINTMENT",
            "REFERRAL",
            "FOLLOW_UP",
            name="message_category_enum",
            create_type=False,
        )
        message_priority_enum = postgresql.ENUM(
            "NORMAL", "URGENT", name="message_priority_enum", create_type=False
        )
        message_category_enum.create(bind, checkfirst=True)
        message_priority_enum.create(bind, checkfirst=True)
    else:
        message_category_enum = sa.Enum(
            "GENERAL",
            "SYMPTOM",
            "MEDICINE",
            "APPOINTMENT",
            "REFERRAL",
            "FOLLOW_UP",
            name="message_category_enum",
        )
        message_priority_enum = sa.Enum("NORMAL", "URGENT", name="message_priority_enum")
        message_category_enum.create(bind, checkfirst=True)
        message_priority_enum.create(bind, checkfirst=True)

    op.create_table(
        "care_conversations",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("patient_id", app.models.types.GUID(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.id"], name="fk_care_conversations_patient_id"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("patient_id", name="uq_care_conversations_patient_id"),
    )
    op.create_index("ix_care_conversations_patient_id", "care_conversations", ["patient_id"])

    op.create_table(
        "care_messages",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("conversation_id", app.models.types.GUID(), nullable=False),
        sa.Column("sender_user_id", app.models.types.GUID(), nullable=False),
        sa.Column("sender_role", sa.String(32), nullable=False),
        sa.Column("sender_display_name", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("category", message_category_enum, nullable=False, server_default="GENERAL"),
        sa.Column("priority", message_priority_enum, nullable=False, server_default="NORMAL"),
        sa.Column("related_type", sa.String(32), nullable=True),
        sa.Column("related_id", app.models.types.GUID(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["care_conversations.id"]),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_care_messages_conversation_id", "care_messages", ["conversation_id"])
    op.create_index("ix_care_messages_sender_user_id", "care_messages", ["sender_user_id"])
    op.create_index("ix_care_messages_created_at", "care_messages", ["created_at"])
    op.create_index("ix_care_messages_priority", "care_messages", ["priority"])
    op.create_index(
        "ix_care_messages_conversation_created",
        "care_messages",
        ["conversation_id", "created_at"],
    )

    op.create_table(
        "care_message_reads",
        sa.Column("id", app.models.types.GUID(), nullable=False),
        sa.Column("message_id", app.models.types.GUID(), nullable=False),
        sa.Column("conversation_id", app.models.types.GUID(), nullable=False),
        sa.Column("user_id", app.models.types.GUID(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["care_conversations.id"]),
        sa.ForeignKeyConstraint(["message_id"], ["care_messages.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_care_message_reads_message_user"),
    )
    op.create_index("ix_care_message_reads_user_id", "care_message_reads", ["user_id"])
    op.create_index(
        "ix_care_message_reads_conversation_id", "care_message_reads", ["conversation_id"]
    )
    op.create_index(
        "ix_care_message_reads_user_conversation",
        "care_message_reads",
        ["user_id", "conversation_id"],
    )


def downgrade() -> None:
    op.drop_table("care_message_reads")
    op.drop_table("care_messages")
    op.drop_table("care_conversations")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="message_priority_enum").drop(bind, checkfirst=True)
        sa.Enum(name="message_category_enum").drop(bind, checkfirst=True)
