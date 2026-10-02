import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import SyncableMixin
from app.models.types import GUID


class MessageCategory(enum.StrEnum):
    GENERAL = "GENERAL"
    SYMPTOM = "SYMPTOM"
    MEDICINE = "MEDICINE"
    APPOINTMENT = "APPOINTMENT"
    REFERRAL = "REFERRAL"
    FOLLOW_UP = "FOLLOW_UP"


class MessagePriority(enum.StrEnum):
    NORMAL = "NORMAL"
    URGENT = "URGENT"


class CareConversation(SyncableMixin, Base):
    __tablename__ = "care_conversations"
    __table_args__ = (
        UniqueConstraint("patient_id", name="uq_care_conversations_patient_id"),
        Index("ix_care_conversations_patient_id", "patient_id"),
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("patients.id"), nullable=False)

    messages = relationship(
        "CareMessage", back_populates="conversation", cascade="all, delete-orphan"
    )
    message_reads = relationship(
        "CareMessageRead", back_populates="conversation", cascade="all, delete-orphan"
    )


class CareMessage(SyncableMixin, Base):
    __tablename__ = "care_messages"
    __table_args__ = (
        Index("ix_care_messages_conversation_id", "conversation_id"),
        Index("ix_care_messages_sender_user_id", "sender_user_id"),
        Index("ix_care_messages_created_at", "created_at"),
        Index("ix_care_messages_priority", "priority"),
        Index("ix_care_messages_conversation_created", "conversation_id", "created_at"),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("care_conversations.id"), nullable=False
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )
    sender_role: Mapped[str] = mapped_column(String(32), nullable=False)
    sender_display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[MessageCategory] = mapped_column(
        Enum(MessageCategory, name="message_category_enum"),
        nullable=False,
        default=MessageCategory.GENERAL,
    )
    priority: Mapped[MessagePriority] = mapped_column(
        Enum(MessagePriority, name="message_priority_enum"),
        nullable=False,
        default=MessagePriority.NORMAL,
    )
    # For linking to real entities without exposing details in messages
    related_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    related_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), nullable=True)

    conversation = relationship("CareConversation", back_populates="messages")
    sender = relationship("User")
    reads = relationship("CareMessageRead", back_populates="message", cascade="all, delete-orphan")


class CareMessageRead(SyncableMixin, Base):
    __tablename__ = "care_message_reads"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_care_message_reads_message_user"),
        Index("ix_care_message_reads_user_id", "user_id"),
        Index("ix_care_message_reads_conversation_id", "conversation_id"),
        Index("ix_care_message_reads_user_conversation", "user_id", "conversation_id"),
    )

    message_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("care_messages.id"), nullable=False
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("care_conversations.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id"), nullable=False)
    read_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    message = relationship("CareMessage", back_populates="reads")
    conversation = relationship("CareConversation", back_populates="message_reads")
    user = relationship("User")
