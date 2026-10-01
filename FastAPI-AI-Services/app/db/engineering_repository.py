"""
Database Repository Layer for Engineering AI Agent Persistent Conversations & Messages (Phase 21).
Enforces Strict SaaS Multi-Tenant Isolation, Cryptographic Owner Scoping, and Soft-Deletion.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.engineering_chat import EngineeringConversationModel, EngineeringMessageModel
from app.utils.logger import logger


class EngineeringChatRepository:
    """Repository class encapsulating database operations for Engineering Agent conversations & messages."""

    async def create_conversation(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: str,
        title: str = "New Engineering Analysis",
        project_id: Optional[str] = None,
        repository_id: Optional[str] = None,
        developer_id: Optional[str] = None,
        custom_id: Optional[str] = None
    ) -> EngineeringConversationModel:
        """
        Create a new engineering conversation record strictly scoped to organization_id and user_id.
        """
        conv_id = custom_id or f"eng-conv-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        conversation = EngineeringConversationModel(
            id=conv_id,
            user_id=user_id,
            organization_id=organization_id,
            title=title or "New Engineering Analysis",
            project_id=project_id,
            repository_id=repository_id,
            developer_id=developer_id,
            is_pinned=False,
            is_deleted=False,
            created_at=now,
            updated_at=now
        )
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)
        logger.info(f"[EngineeringDB] Created conversation '{conv_id}' for user '{user_id}' (org '{organization_id}')")
        return conversation

    async def list_conversations(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[EngineeringConversationModel]:
        """
        Fetch all active (non-deleted) engineering conversations for the authenticated user and organization.
        Enforces tenant and user isolation. Ordered by updated_at DESC for ChatGPT-style recency.
        Returns lightweight summaries without loading message relationships.
        """
        stmt = (
            select(EngineeringConversationModel)
            .where(
                and_(
                    EngineeringConversationModel.organization_id == organization_id,
                    EngineeringConversationModel.user_id == user_id,
                    EngineeringConversationModel.is_deleted == False
                )
            )
            .order_by(EngineeringConversationModel.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_conversation(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        include_messages: bool = True
    ) -> Optional[EngineeringConversationModel]:
        """
        Fetch a specific conversation by ID, strictly verifying both organization_id and user_id ownership.
        Returns None if not found, soft-deleted, or belonging to another user/tenant.
        """
        stmt = select(EngineeringConversationModel).where(
            and_(
                EngineeringConversationModel.id == conversation_id,
                EngineeringConversationModel.organization_id == organization_id,
                EngineeringConversationModel.user_id == user_id,
                EngineeringConversationModel.is_deleted == False
            )
        )
        if include_messages:
            stmt = stmt.options(selectinload(EngineeringConversationModel.messages))

        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def rename_conversation(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        new_title: str
    ) -> Optional[EngineeringConversationModel]:
        """
        Rename an engineering conversation title owned by user_id within organization_id.
        Updates updated_at timestamp.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            update(EngineeringConversationModel)
            .where(
                and_(
                    EngineeringConversationModel.id == conversation_id,
                    EngineeringConversationModel.organization_id == organization_id,
                    EngineeringConversationModel.user_id == user_id,
                    EngineeringConversationModel.is_deleted == False
                )
            )
            .values(title=new_title, updated_at=now)
        )
        result = await session.execute(stmt)
        if result.rowcount == 0:
            return None
        await session.commit()
        return await self.get_conversation(session, conversation_id, user_id, organization_id)

    async def update_conversation(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        title: Optional[str] = None,
        is_pinned: Optional[bool] = None,
        project_id: Optional[str] = None,
        repository_id: Optional[str] = None,
        developer_id: Optional[str] = None
    ) -> Optional[EngineeringConversationModel]:
        """
        Update conversation metadata fields with strict ownership enforcement.
        """
        values: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if title is not None:
            values["title"] = title
        if is_pinned is not None:
            values["is_pinned"] = is_pinned
        if project_id is not None:
            values["project_id"] = project_id
        if repository_id is not None:
            values["repository_id"] = repository_id
        if developer_id is not None:
            values["developer_id"] = developer_id

        stmt = (
            update(EngineeringConversationModel)
            .where(
                and_(
                    EngineeringConversationModel.id == conversation_id,
                    EngineeringConversationModel.organization_id == organization_id,
                    EngineeringConversationModel.user_id == user_id,
                    EngineeringConversationModel.is_deleted == False
                )
            )
            .values(**values)
        )
        result = await session.execute(stmt)
        if result.rowcount == 0:
            return None
        await session.commit()
        return await self.get_conversation(session, conversation_id, user_id, organization_id)

    async def soft_delete_conversation(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str,
        organization_id: str
    ) -> bool:
        """
        Soft-delete an engineering conversation by setting is_deleted=True.
        Does not physically delete rows, preserving audit logs.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            update(EngineeringConversationModel)
            .where(
                and_(
                    EngineeringConversationModel.id == conversation_id,
                    EngineeringConversationModel.organization_id == organization_id,
                    EngineeringConversationModel.user_id == user_id,
                    EngineeringConversationModel.is_deleted == False
                )
            )
            .values(is_deleted=True, updated_at=now)
        )
        result = await session.execute(stmt)
        await session.commit()
        success = result.rowcount > 0
        if success:
            logger.info(f"[EngineeringDB] Soft-deleted conversation '{conversation_id}' for user '{user_id}'")
        return success

    async def create_message(
        self,
        session: AsyncSession,
        conversation_id: str,
        organization_id: str,
        user_id: str,
        sender: str,
        content: str,
        detected_intent: Optional[str] = None,
        selected_agent: Optional[str] = None,
        metrics: Optional[List[Dict[str, Any]]] = None,
        artifacts: Optional[List[Dict[str, Any]]] = None,
        actions: Optional[List[Dict[str, Any]]] = None,
        tools_executed: Optional[List[Dict[str, Any]]] = None,
        execution_time_ms: Optional[float] = None,
        custom_id: Optional[str] = None
    ) -> Optional[EngineeringMessageModel]:
        """
        Add a new multi-agent message to a conversation.
        Verifies that the conversation exists and belongs to (organization_id, user_id) first.
        Touches conversation updated_at.
        """
        conv = await self.get_conversation(session, conversation_id, user_id, organization_id, include_messages=False)
        if not conv:
            logger.warning(
                f"[EngineeringDB] Cannot add message: Conversation '{conversation_id}' "
                f"not found or unowned by user '{user_id}' (org '{organization_id}')"
            )
            return None

        msg_id = custom_id or f"eng-msg-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        message = EngineeringMessageModel(
            id=msg_id,
            conversation_id=conversation_id,
            organization_id=organization_id,
            user_id=user_id,
            sender=sender,
            content=content,
            detected_intent=detected_intent,
            selected_agent=selected_agent,
            metrics_json=metrics,
            artifacts_json=artifacts,
            actions_json=actions,
            tools_executed_json=tools_executed,
            execution_time_ms=execution_time_ms,
            created_at=now
        )
        session.add(message)

        # Touch conversation updated_at so it moves to top of recency list
        await session.execute(
            update(EngineeringConversationModel)
            .where(EngineeringConversationModel.id == conversation_id)
            .values(updated_at=now)
        )

        await session.commit()
        await session.refresh(message)
        logger.info(f"[EngineeringDB] Added message '{msg_id}' to conversation '{conversation_id}' ({sender})")
        return message

    async def get_messages(
        self,
        session: AsyncSession,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        limit: int = 100
    ) -> List[EngineeringMessageModel]:
        """
        Fetch ordered messages for a conversation, strictly validating ownership first.
        Ordered by created_at ASC.
        """
        conv = await self.get_conversation(session, conversation_id, user_id, organization_id, include_messages=False)
        if not conv:
            return []

        stmt = (
            select(EngineeringMessageModel)
            .where(
                and_(
                    EngineeringMessageModel.conversation_id == conversation_id,
                    EngineeringMessageModel.organization_id == organization_id,
                    EngineeringMessageModel.user_id == user_id
                )
            )
            .order_by(EngineeringMessageModel.created_at.asc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def clear_user_conversations(
        self,
        session: AsyncSession,
        user_id: str,
        organization_id: str
    ) -> int:
        """
        Soft-delete all engineering conversations for a user within an organization.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            update(EngineeringConversationModel)
            .where(
                and_(
                    EngineeringConversationModel.organization_id == organization_id,
                    EngineeringConversationModel.user_id == user_id,
                    EngineeringConversationModel.is_deleted == False
                )
            )
            .values(is_deleted=True, updated_at=now)
        )
        result = await session.execute(stmt)
        await session.commit()
        logger.info(f"[EngineeringDB] Cleared {result.rowcount} conversations for user '{user_id}' (org '{organization_id}')")
        return result.rowcount


engineering_chat_repository = EngineeringChatRepository()
