import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_patient_access
from app.core.errors import ForbiddenError, ValidationAppError
from app.models.enums import Role
from app.models.messages import CareConversation, CareMessage, MessageCategory, MessagePriority
from app.models.patient import Patient
from app.models.staff import HealthWorkerProfile
from app.models.user import User
from app.repositories.messages import (
    CareConversationRepository,
    CareMessageReadRepository,
    CareMessageRepository,
)
from app.repositories.patients import PatientRepository
from app.repositories.staff import HealthWorkerProfileRepository
from app.schemas.messages import CareMessageCreate, CareMessageOut, CareConversationSummaryOut


class CareMessagesService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.conversations = CareConversationRepository(db)
        self.messages = CareMessageRepository(db)
        self.reads = CareMessageReadRepository(db)
        self.patients = PatientRepository(db)
        self.health_workers = HealthWorkerProfileRepository(db)

    async def get_patient_conversation_with_auth(
        self,
        user: User,
        patient_id: uuid.UUID,
    ) -> CareConversation:
        """Get a patient's conversation with authorization checks."""
        patient = await self.patients.get_or_404(patient_id)
        assert_patient_access(user, patient)

        conversation = await self.conversations.get_by_patient_id(patient_id)
        if not conversation:
            conversation = await self.conversations.get_or_create_for_patient(patient_id)
        return conversation

    async def get_authorized_recipients(
        self,
        patient_id: uuid.UUID,
    ) -> list[User]:
        """Get all users authorized to access a patient's messages.

        This includes:
        - The patient themselves
        - Health workers from the patient's facility
        - Doctors from the patient's facility
        - System admins (ADMIN)
        """
        patient = await self.patients.get_or_404(patient_id)
        recipients = []

        # Patient has access to their own conversation
        if patient.user_id:
            patient_user = await self.db.get(User, patient.user_id)
            if patient_user:
                recipients.append(patient_user)

        # Health workers and doctors from the same facility
        if patient.facility_id:
            from app.repositories.users import UserRepository

            user_repo = UserRepository(self.db)
            facility_staff = await user_repo.list_active(facility_id=patient.facility_id)
            for staff in facility_staff:
                if staff.role in (Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_ADMIN):
                    if staff not in recipients:
                        recipients.append(staff)

        return recipients

    async def send_message(
        self,
        user: User,
        patient_id: uuid.UUID,
        message_data: CareMessageCreate,
    ) -> CareMessage:
        """Send a message in a patient's care conversation.

        Authorization: Patient can only send in their own conversation.
        Health workers and doctors can send in conversations for patients
        at their facility.
        """
        patient = await self.patients.get_or_404(patient_id)
        assert_patient_access(user, patient)

        # Validate message body
        body = message_data.body.strip()
        if not body:
            raise ValidationAppError("Message cannot be empty")
        if len(body) > 2000:
            raise ValidationAppError("Message cannot exceed 2000 characters")

        # Get or create conversation
        conversation = await self.conversations.get_or_create_for_patient(patient_id)

        # Create message
        message = await self.messages.create_message(
            conversation_id=conversation.id,
            sender_user_id=user.id,
            sender_role=user.role.value,
            sender_display_name=user.full_name,
            body=body,
            category=message_data.category.value,
            priority=message_data.priority.value,
            related_type=message_data.related_type,
            related_id=message_data.related_id,
        )

        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_messages_with_read_status(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[CareMessageOut], int]:
        """Get messages in a conversation with read status for the current user."""
        messages, total = await self.messages.list_by_conversation(
            conversation_id,
            limit=limit,
            offset=offset,
        )

        # Get read status for all messages
        output = []
        for msg in messages:
            is_read = any(
                read.user_id == user_id and not read.is_deleted
                for read in msg.reads
            )
            read_timestamp = next(
                (read.read_at for read in msg.reads if read.user_id == user_id and not read.is_deleted),
                None,
            )

            output.append(
                CareMessageOut(
                    id=msg.id,
                    conversation_id=msg.conversation_id,
                    sender_user_id=msg.sender_user_id,
                    sender_role=msg.sender_role,
                    sender_display_name=msg.sender_display_name,
                    body=msg.body,
                    category=msg.category,
                    priority=msg.priority,
                    related_type=msg.related_type,
                    related_id=msg.related_id,
                    created_at=msg.created_at,
                    is_read=is_read,
                    read_at=read_timestamp,
                )
            )

        return output, total

    async def mark_messages_as_read(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        message_ids: list[uuid.UUID] | None = None,
    ) -> int:
        """Mark messages in a conversation as read.

        If message_ids is None, marks all unread messages in the conversation.
        Returns the count of messages marked as read.
        """
        if message_ids is None:
            # Get all unread messages in the conversation
            messages, _ = await self.messages.list_by_conversation(
                conversation_id,
                limit=1000,
            )
            message_ids = [
                msg.id
                for msg in messages
                if msg.sender_user_id != user_id
                and not any(read.user_id == user_id for read in msg.reads)
            ]

        read_at = datetime.utcnow()
        count = 0

        for message_id in message_ids:
            try:
                await self.reads.mark_message_read(
                    message_id=message_id,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    read_at=read_at,
                )
                count += 1
            except Exception:
                # Continue marking other messages even if one fails
                pass

        if count > 0:
            await self.db.commit()

        return count

    async def get_unread_count(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID | None = None,
    ) -> int:
        """Get count of unread messages for a user."""
        return await self.messages.get_unread_count_for_user(user_id, conversation_id)

    async def get_conversation_summaries_for_staff(
        self,
        user: User,
    ) -> list[CareConversationSummaryOut]:
        """Get summaries of conversations a staff member can access.

        Returns only conversations for patients at the staff member's facility.
        """
        if user.role not in (Role.HEALTH_WORKER, Role.DOCTOR, Role.FACILITY_ADMIN):
            raise ForbiddenError("Only staff can access this")

        # Get all patients at this facility
        facility_patients = await self.patients.list_active(facility_id=user.facility_id)

        summaries = []
        for patient in facility_patients:
            conversation = await self.conversations.get_by_patient_id(patient.id)
            if not conversation:
                continue

            latest_message = await self.messages.get_latest_message_by_conversation(
                conversation.id
            )
            urgent_count = await self.messages.get_urgent_messages_count(conversation.id)
            unread_count = await self.messages.get_unread_count_for_user(user.id, conversation.id)

            summary = CareConversationSummaryOut(
                id=conversation.id,
                patient_id=patient.id,
                patient_name=patient.full_name,
                latest_message_preview=latest_message.body[:100] if latest_message else None,
                latest_message_time=latest_message.created_at if latest_message else None,
                latest_message_priority=latest_message.priority if latest_message else None,
                unread_count=unread_count,
                has_urgent=urgent_count > 0,
            )
            summaries.append(summary)

        # Sort by latest message time (newest first)
        summaries.sort(
            key=lambda x: x.latest_message_time or datetime.min,
            reverse=True,
        )

        return summaries
