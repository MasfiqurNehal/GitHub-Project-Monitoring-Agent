"""
Database Repository Layer for Chatbot Data Access.
Provides isolated, user-scoped data access methods for SaaS multi-tenancy.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ConversationModel, MessageModel
from app.utils.logger import logger

class ChatbotRepository:
    """Repository class encapsulating database operations for chatbot conversations & messages."""

    async def create_conversation(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: Optional[str] = None,
        title: str = "New Conversation",
        custom_id: Optional[str] = None
    ) -> ConversationModel:
        """Create a new conversation record owned by user_id."""
        conv_id = custom_id or f"conv-{uuid.uuid4().hex[:12]}"
        conversation = ConversationModel(
            id=conv_id,
            user_id=user_id,
            organization_id=organization_id,
            title=title,
            is_pinned=False,
            is_deleted=False
        )
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)
        logger.info(f"[DB] Created conversation '{conv_id}' for user '{user_id}'")
        return conversation

    async def get_user_conversations(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ConversationModel]:
        """
        Fetch all active conversations owned by user_id.
        Enforces strict user ownership scoping to prevent data leakage between SaaS users.
        """
        stmt = (
            select(ConversationModel)
            .options(selectinload(ConversationModel.messages))
            .where(
                and_(
                    ConversationModel.user_id == user_id,
                    ConversationModel.is_deleted == False,
                    *( [ConversationModel.organization_id == organization_id] if organization_id else [] )
                )
            )
            .order_by(ConversationModel.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_conversation_by_id(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str
    ) -> Optional[ConversationModel]:
        """Fetch a specific conversation by ID, strictly verifying user ownership."""
        stmt = (
            select(ConversationModel)
            .options(selectinload(ConversationModel.messages))
            .where(
                and_(
                    ConversationModel.id == conversation_id,
                    ConversationModel.user_id == user_id,
                    ConversationModel.is_deleted == False
                )
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def add_message(
        self,
        session: AsyncSession,
        conversation_id: str,
        sender: str,
        content: str,
        metrics: Optional[List[Dict[str, Any]]] = None,
        sources: Optional[List[Dict[str, Any]]] = None,
        custom_id: Optional[str] = None
    ) -> MessageModel:
        """Add a new message to a conversation session."""
        msg_id = custom_id or f"msg-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        message = MessageModel(
            id=msg_id,
            conversation_id=conversation_id,
            sender=sender,
            content=content,
            metrics_json=metrics,
            sources_json=sources,
            created_at=now
        )
        session.add(message)
        
        # Touch conversation updated_at
        await session.execute(
            update(ConversationModel)
            .where(ConversationModel.id == conversation_id)
            .values(updated_at=now)
        )

        await session.commit()
        await session.refresh(message)
        logger.info(f"[DB] Added message '{msg_id}' to conversation '{conversation_id}' ({sender})")
        return message

    async def get_conversation_messages(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str
    ) -> List[MessageModel]:
        """Fetch messages for a conversation, validating user ownership first."""
        conv = await self.get_conversation_by_id(session, conversation_id, user_id)
        if not conv:
            return []
        
        stmt = (
            select(MessageModel)
            .where(MessageModel.conversation_id == conversation_id)
            .order_by(MessageModel.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def delete_conversation(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str
    ) -> bool:
        """Soft-delete a conversation owned by user_id."""
        stmt = (
            update(ConversationModel)
            .where(
                and_(
                    ConversationModel.id == conversation_id,
                    ConversationModel.user_id == user_id
                )
            )
            .values(is_deleted=True)
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount > 0

    async def rename_conversation(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str,
        new_title: str
    ) -> Optional[ConversationModel]:
        """Rename a conversation owned by user_id."""
        now = datetime.now(timezone.utc)
        stmt = (
            update(ConversationModel)
            .where(
                and_(
                    ConversationModel.id == conversation_id,
                    ConversationModel.user_id == user_id,
                    ConversationModel.is_deleted == False
                )
            )
            .values(title=new_title, updated_at=now)
        )
        result = await session.execute(stmt)
        if result.rowcount == 0:
            return None
        await session.commit()
        return await self.get_conversation_by_id(session, conversation_id, user_id)

    async def clear_user_history(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: Optional[str] = None
    ) -> int:
        """Soft-delete all conversations for a given user."""
        stmt = (
            update(ConversationModel)
            .where(
                and_(
                    ConversationModel.user_id == user_id,
                    *( [ConversationModel.organization_id == organization_id] if organization_id else [] )
                )
            )
            .values(is_deleted=True)
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount

chatbot_repository = ChatbotRepository()
