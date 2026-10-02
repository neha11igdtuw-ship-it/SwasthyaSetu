import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.messages import MessageCategory, MessagePriority
from app.schemas.common import ORMBase


class CareMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)
    category: MessageCategory = MessageCategory.GENERAL
    priority: MessagePriority = MessagePriority.NORMAL
    related_type: str | None = None
    related_id: uuid.UUID | None = None


class CareMessageOut(ORMBase):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID
    sender_role: str
    sender_display_name: str
    body: str
    category: MessageCategory
    priority: MessagePriority
    related_type: str | None
    related_id: uuid.UUID | None
    created_at: datetime
    is_read: bool = False
    read_at: datetime | None = None


class CareConversationSummaryOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: str
    latest_message_preview: str | None
    latest_message_time: datetime | None
    latest_message_priority: MessagePriority | None
    unread_count: int
    has_urgent: bool


class CareConversationOut(ORMBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    messages: list[CareMessageOut]


class CareMessageReadRequest(BaseModel):
    message_ids: list[uuid.UUID]


class UnreadCountOut(BaseModel):
    unread_count: int
