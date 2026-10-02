import uuid
from datetime import datetime

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.messages import CareConversation, CareMessage, CareMessageRead, MessagePriority
from app.repositories.base import SyncableRepository


class CareConversationRepository(SyncableRepository[CareConversation]):
    model = CareConversation

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.session = db

    async def get_or_create_for_patient(self, patient_id: uuid.UUID) -> CareConversation:
        """Get existing conversation for patient or create a new one."""
        existing = await self.session.scalar(
            select(self.model).where(
                and_(
                    self.model.patient_id == patient_id,
                    self.model.is_deleted == False,
                )
            )
        )
        if existing:
            return existing

        conversation = self.model(patient_id=patient_id)
        self.session.add(conversation)
        await self.session.flush()
        return conversation

    async def get_by_patient_id(self, patient_id: uuid.UUID) -> CareConversation | None:
        """Get active conversation for a patient."""
        return await self.session.scalar(
            select(self.model).where(
                and_(
                    self.model.patient_id == patient_id,
                    self.model.is_deleted == False,
                )
            )
        )


class CareMessageRepository(SyncableRepository[CareMessage]):
    model = CareMessage

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.session = db

    async def create_message(
        self,
        conversation_id: uuid.UUID,
        sender_user_id: uuid.UUID,
        sender_role: str,
        sender_display_name: str,
        body: str,
        category: str,
        priority: str,
        related_type: str | None = None,
        related_id: uuid.UUID | None = None,
    ) -> CareMessage:
        """Create a new message in a conversation."""
        message = self.model(
            conversation_id=conversation_id,
            sender_user_id=sender_user_id,
            sender_role=sender_role,
            sender_display_name=sender_display_name,
            body=body,
            category=category,
            priority=priority,
            related_type=related_type,
            related_id=related_id,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def list_by_conversation(
        self,
        conversation_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[CareMessage], int]:
        """List messages in a conversation with pagination."""
        stmt = select(self.model).options(selectinload(self.model.reads)).where(
            and_(
                self.model.conversation_id == conversation_id,
                self.model.is_deleted == False,
            )
        )

        total = await self.session.scalar(
            select(func.count(self.model.id)).where(
                and_(
                    self.model.conversation_id == conversation_id,
                    self.model.is_deleted == False,
                )
            )
        )

        rows = await self.session.scalars(
            stmt.order_by(self.model.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows), total or 0

    async def get_unread_count_for_user(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID | None = None,
    ) -> int:
        """Get count of unread messages for a user."""
        stmt = select(func.count(self.model.id)).where(
            and_(
                self.model.is_deleted == False,
                ~self.model.reads.any(
                    and_(
                        CareMessageRead.user_id == user_id,
                        CareMessageRead.is_deleted == False,
                    )
                ),
                self.model.sender_user_id != user_id,
            )
        )

        if conversation_id:
            stmt = stmt.where(self.model.conversation_id == conversation_id)

        count = await self.session.scalar(stmt)
        return count or 0

    async def get_latest_message_by_conversation(
        self,
        conversation_id: uuid.UUID,
    ) -> CareMessage | None:
        """Get the latest message in a conversation."""
        return await self.session.scalar(
            select(self.model)
            .where(
                and_(
                    self.model.conversation_id == conversation_id,
                    self.model.is_deleted == False,
                )
            )
            .order_by(desc(self.model.created_at))
            .limit(1)
        )

    async def get_urgent_messages_count(
        self,
        conversation_id: uuid.UUID,
    ) -> int:
        """Check if there are any urgent messages in a conversation."""
        count = await self.session.scalar(
            select(func.count(self.model.id)).where(
                and_(
                    self.model.conversation_id == conversation_id,
                    self.model.priority == MessagePriority.URGENT,
                    self.model.is_deleted == False,
                )
            )
        )
        return count or 0


class CareMessageReadRepository(SyncableRepository[CareMessageRead]):
    model = CareMessageRead

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.session = db

    async def mark_message_read(
        self,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        read_at: datetime | None = None,
    ) -> CareMessageRead:
        """Mark a message as read by a user."""
        if read_at is None:
            read_at = datetime.utcnow()

        # Check if already marked as read
        existing = await self.session.scalar(
            select(self.model).where(
                and_(
                    self.model.message_id == message_id,
                    self.model.user_id == user_id,
                    self.model.is_deleted == False,
                )
            )
        )

        if existing:
            return existing

        read = self.model(
            message_id=message_id,
            user_id=user_id,
            conversation_id=conversation_id,
            read_at=read_at,
        )
        self.session.add(read)
        await self.session.flush()
        return read

    async def get_unread_count_for_user_in_conversation(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
    ) -> int:
        """Get count of unread messages for a user in a specific conversation."""
        subquery = (
            select(CareMessage.id)
            .where(
                and_(
                    CareMessage.conversation_id == conversation_id,
                    CareMessage.is_deleted == False,
                    CareMessage.sender_user_id != user_id,
                )
            )
            .scalar_subquery()
        )

        count = await self.session.scalar(
            select(func.count(CareMessage.id)).select_from(CareMessage).where(
                and_(
                    CareMessage.id.in_(select(subquery)),
                    ~CareMessage.reads.any(
                        and_(
                            self.model.user_id == user_id,
                            self.model.is_deleted == False,
                        )
                    ),
                )
            )
        )
        return count or 0
